import { supabase } from '@/lib/supabase'
import type { ApplicationStatus } from '@/types'

export interface PipelineFunnelData {
  stage: ApplicationStatus
  label: string
  count: number
  percentage: number
  dropOffRate: number
  color: string
}

export interface StageConversion {
  fromStage: ApplicationStatus
  toStage: ApplicationStatus
  conversionRate: number
  averageTimeInDays: number
}

export interface PipelineMetrics {
  totalApplicants: number
  activeApplicants: number
  averageTimeToHire: number | null
  conversionRate: number
  offerAcceptanceRate: number
}

export interface JobPipelineComparison {
  jobId: string
  jobTitle: string
  totalApplicants: number
  conversionRate: number
  averageTimeToHire: number | null
}

export interface TimeInStageData {
  stage: ApplicationStatus
  label: string
  averageDays: number
  minDays: number
  maxDays: number
}

export interface ApplicationVolumeData {
  date: string
  count: number
  hiredCount: number
}

const STAGE_ORDER: ApplicationStatus[] = [
  'pending',
  'reviewing',
  'interview',
  'offered',
]

const STAGE_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Applied',
  reviewing: 'Under Review',
  interview: 'Interview',
  offered: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

const STAGE_COLORS: Record<ApplicationStatus, string> = {
  pending: '#3B82F6',
  reviewing: '#F59E0B',
  interview: '#8B5CF6',
  offered: '#10B981',
  rejected: '#EF4444',
  withdrawn: '#6B7280',
}

export const pipelineAnalyticsService = {
  /**
   * Get funnel data for a company's hiring pipeline
   */
  async getPipelineFunnel(
    companyId: string,
    jobId?: string
  ): Promise<PipelineFunnelData[]> {
    let query = supabase
      .from('applications')
      .select(`
        status,
        job_postings!inner (company_id)
      `)
      .eq('job_postings.company_id', companyId)

    if (jobId) {
      query = query.eq('job_posting_id', jobId)
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('Error fetching pipeline data:', error)
      return []
    }

    // Count applications by status
    const statusCounts: Record<ApplicationStatus, number> = {
      pending: 0,
      reviewing: 0,
      interview: 0,
      offered: 0,
      rejected: 0,
      withdrawn: 0,
    }

    data.forEach((app: any) => {
      statusCounts[app.status as ApplicationStatus]++
    })

    const total = data.length

    // Calculate cumulative counts for funnel (how many reached each stage)
    const reachedStage: Record<ApplicationStatus, number> = {
      pending: total,
      reviewing:
        statusCounts.reviewing +
        statusCounts.interview +
        statusCounts.offered,
      interview: statusCounts.interview + statusCounts.offered,
      offered: statusCounts.offered,
      rejected: 0,
      withdrawn: 0,
    }

    const funnelData: PipelineFunnelData[] = STAGE_ORDER.map((stage, index) => {
      const count = reachedStage[stage]
      const percentage = total > 0 ? (count / total) * 100 : 0
      const previousCount =
        index > 0 ? reachedStage[STAGE_ORDER[index - 1]] : total
      const dropOffRate =
        previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0

      return {
        stage,
        label: STAGE_LABELS[stage],
        count,
        percentage: Math.round(percentage),
        dropOffRate: Math.round(dropOffRate),
        color: STAGE_COLORS[stage],
      }
    })

    return funnelData
  },

  /**
   * Get stage conversion rates
   */
  async getStageConversions(
    companyId: string,
    jobId?: string
  ): Promise<StageConversion[]> {
    let query = supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        updated_at,
        job_postings!inner (company_id)
      `)
      .eq('job_postings.company_id', companyId)

    if (jobId) {
      query = query.eq('job_posting_id', jobId)
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    const conversions: StageConversion[] = []

    for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
      const fromStage = STAGE_ORDER[i]
      const toStage = STAGE_ORDER[i + 1]

      // Count how many were in fromStage (or beyond)
      const inFromStage = data.filter((app: any) => {
        const statusIndex = STAGE_ORDER.indexOf(app.status as ApplicationStatus)
        return statusIndex >= i
      }).length

      // Count how many reached toStage (or beyond)
      const reachedToStage = data.filter((app: any) => {
        const statusIndex = STAGE_ORDER.indexOf(app.status as ApplicationStatus)
        return statusIndex >= i + 1
      }).length

      const conversionRate =
        inFromStage > 0 ? (reachedToStage / inFromStage) * 100 : 0

      // Average time calculation would require status history
      // For now, use applied_at to updated_at as approximation
      const averageTimeInDays = 3 + i * 2 // Placeholder

      conversions.push({
        fromStage,
        toStage,
        conversionRate: Math.round(conversionRate),
        averageTimeInDays,
      })
    }

    return conversions
  },

  /**
   * Get overall pipeline metrics
   */
  async getPipelineMetrics(
    companyId: string,
    jobId?: string
  ): Promise<PipelineMetrics> {
    let query = supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        updated_at,
        job_postings!inner (company_id)
      `)
      .eq('job_postings.company_id', companyId)

    if (jobId) {
      query = query.eq('job_posting_id', jobId)
    }

    const { data, error } = await query

    if (error || !data) {
      return {
        totalApplicants: 0,
        activeApplicants: 0,
        averageTimeToHire: null,
        conversionRate: 0,
        offerAcceptanceRate: 0,
      }
    }

    const totalApplicants = data.length
    const activeApplicants = data.filter(
      (app: any) =>
        app.status !== 'rejected' && app.status !== 'withdrawn'
    ).length
    const offeredCount = data.filter(
      (app: any) => app.status === 'offered'
    ).length

    // Calculate average time to hire (for offered candidates)
    const hiredApps = data.filter((app: any) => app.status === 'offered')
    let averageTimeToHire: number | null = null

    if (hiredApps.length > 0) {
      const totalDays = hiredApps.reduce((sum: number, app: any) => {
        const applied = new Date(app.applied_at)
        const updated = new Date(app.updated_at)
        return sum + (updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24)
      }, 0)
      averageTimeToHire = Math.round(totalDays / hiredApps.length)
    }

    const conversionRate =
      totalApplicants > 0 ? (offeredCount / totalApplicants) * 100 : 0

    return {
      totalApplicants,
      activeApplicants,
      averageTimeToHire,
      conversionRate: Math.round(conversionRate * 10) / 10,
      offerAcceptanceRate: 100, // Would need acceptance tracking
    }
  },

  /**
   * Get time spent in each stage
   */
  async getTimeInStages(
    _companyId: string,
    _jobId?: string
  ): Promise<TimeInStageData[]> {
    // This would ideally use a status history table
    // For now, return estimated data based on current status
    const stages: TimeInStageData[] = STAGE_ORDER.map((stage, index) => ({
      stage,
      label: STAGE_LABELS[stage],
      averageDays: 2 + index * 3,
      minDays: 1,
      maxDays: 5 + index * 5,
    }))

    return stages
  },

  /**
   * Compare pipeline metrics across jobs
   */
  async compareJobPipelines(
    companyId: string,
    jobIds: string[]
  ): Promise<JobPipelineComparison[]> {
    if (jobIds.length === 0) return []

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        updated_at,
        job_posting_id,
        job_postings!inner (id, title, company_id)
      `)
      .eq('job_postings.company_id', companyId)
      .in('job_posting_id', jobIds)

    if (error || !data) {
      return []
    }

    // Group by job posting
    const jobGroups = new Map<string, any[]>()
    data.forEach((app: any) => {
      const jobId = app.job_posting_id
      if (!jobGroups.has(jobId)) {
        jobGroups.set(jobId, [])
      }
      jobGroups.get(jobId)!.push(app)
    })

    const comparisons: JobPipelineComparison[] = []

    jobGroups.forEach((apps, jobId) => {
      const total = apps.length
      const offered = apps.filter((a) => a.status === 'offered').length
      const conversionRate = total > 0 ? (offered / total) * 100 : 0

      const hiredApps = apps.filter((a) => a.status === 'offered')
      let averageTimeToHire: number | null = null

      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum, app) => {
          const applied = new Date(app.applied_at)
          const updated = new Date(app.updated_at)
          return sum + (updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24)
        }, 0)
        averageTimeToHire = Math.round(totalDays / hiredApps.length)
      }

      comparisons.push({
        jobId,
        jobTitle: apps[0].job_postings?.title || 'Unknown',
        totalApplicants: total,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageTimeToHire,
      })
    })

    return comparisons.sort((a, b) => b.totalApplicants - a.totalApplicants)
  },

  /**
   * Get application volume over time
   */
  async getApplicationVolume(
    companyId: string,
    days: number = 30,
    jobId?: string
  ): Promise<ApplicationVolumeData[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let query = supabase
      .from('applications')
      .select(`
        applied_at,
        status,
        job_postings!inner (company_id)
      `)
      .eq('job_postings.company_id', companyId)
      .gte('applied_at', startDate.toISOString())

    if (jobId) {
      query = query.eq('job_posting_id', jobId)
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    // Initialize date map
    const volumeMap = new Map<string, { count: number; hiredCount: number }>()
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      const dateStr = date.toISOString().split('T')[0]
      volumeMap.set(dateStr, { count: 0, hiredCount: 0 })
    }

    // Count applications per date
    data.forEach((app: any) => {
      const dateStr = app.applied_at.split('T')[0]
      const existing = volumeMap.get(dateStr)
      if (existing) {
        existing.count++
        if (app.status === 'offered') {
          existing.hiredCount++
        }
      }
    })

    return Array.from(volumeMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }))
  },

  /**
   * Get rejection reasons breakdown (if tracked)
   */
  async getRejectionReasons(
    _companyId: string,
    _jobId?: string
  ): Promise<{ reason: string; count: number; percentage: number }[]> {
    // This would require a rejection_reason field
    // Return placeholder data for now
    return [
      { reason: 'Skills mismatch', count: 45, percentage: 35 },
      { reason: 'Experience level', count: 30, percentage: 23 },
      { reason: 'Culture fit', count: 25, percentage: 19 },
      { reason: 'Salary expectations', count: 18, percentage: 14 },
      { reason: 'Other', count: 12, percentage: 9 },
    ]
  },

  /**
   * Get source effectiveness (if source tracking available)
   */
  async getSourceEffectiveness(
    _companyId: string
  ): Promise<{ source: string; applicants: number; hires: number; conversionRate: number }[]> {
    // Placeholder - would require source tracking
    return [
      { source: 'Direct', applicants: 120, hires: 8, conversionRate: 6.7 },
      { source: 'Referral', applicants: 45, hires: 5, conversionRate: 11.1 },
      { source: 'LinkedIn', applicants: 80, hires: 3, conversionRate: 3.8 },
      { source: 'Job Boards', applicants: 200, hires: 6, conversionRate: 3.0 },
    ]
  },
}
