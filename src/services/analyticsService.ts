import { supabase } from '@/lib/supabase'
import type { ApplicationStatus } from '@/types'

// Types for analytics data
export interface SkillDemand {
  skill_id: string
  skill_name: string
  category: string | null
  count: number
  trend: 'up' | 'down' | 'stable'
  change_percentage: number
}

export interface JobRoleTrend {
  title: string
  count: number
  growth_rate: number
  trend: 'up' | 'down' | 'stable'
}

export interface ApplicationStats {
  total: number
  pending: number
  reviewing: number
  interview: number
  offered: number
  rejected: number
  withdrawn: number
}

export interface CareerMetrics {
  responseRate: number
  averageTimeToResponse: number | null
  interviewRate: number
  offerRate: number
}

export interface ApplicationActivity {
  date: string
  count: number
}

export interface CompetitivenessData {
  jobId: string
  applicantCount: number
  level: 'low' | 'medium' | 'high' | 'very_high'
  label: string
}

export interface WeeklyGoal {
  target: number
  current: number
  percentage: number
}

export const analyticsService = {
  /**
   * Get application statistics by status for a job seeker
   */
  async getApplicationStats(jobSeekerId: string): Promise<ApplicationStats> {
    const { data, error } = await supabase
      .from('applications')
      .select('status')
      .eq('job_seeker_id', jobSeekerId)

    if (error || !data) {
      console.error('Error fetching application stats:', error)
      return {
        total: 0,
        pending: 0,
        reviewing: 0,
        interview: 0,
        offered: 0,
        rejected: 0,
        withdrawn: 0,
      }
    }

    const stats: ApplicationStats = {
      total: data.length,
      pending: 0,
      reviewing: 0,
      interview: 0,
      offered: 0,
      rejected: 0,
      withdrawn: 0,
    }

    data.forEach((app) => {
      const status = app.status as ApplicationStatus
      if (status in stats) {
        stats[status]++
      }
    })

    return stats
  },

  /**
   * Get career metrics (response rate, interview rate, etc.)
   */
  async getCareerMetrics(jobSeekerId: string): Promise<CareerMetrics> {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('status, applied_at, updated_at')
      .eq('job_seeker_id', jobSeekerId)

    if (error || !applications || applications.length === 0) {
      return {
        responseRate: 0,
        averageTimeToResponse: null,
        interviewRate: 0,
        offerRate: 0,
      }
    }

    const total = applications.length
    const responded = applications.filter(
      (a) => a.status !== 'pending' && a.status !== 'withdrawn'
    ).length
    const interviews = applications.filter(
      (a) => a.status === 'interview' || a.status === 'offered'
    ).length
    const offers = applications.filter((a) => a.status === 'offered').length

    // Calculate average time to response (in days)
    const responseTimes = applications
      .filter((a) => a.status !== 'pending' && a.status !== 'withdrawn')
      .map((a) => {
        const applied = new Date(a.applied_at)
        const updated = new Date(a.updated_at)
        return (updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24)
      })

    const averageTimeToResponse =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null

    return {
      responseRate: total > 0 ? (responded / total) * 100 : 0,
      averageTimeToResponse,
      interviewRate: total > 0 ? (interviews / total) * 100 : 0,
      offerRate: total > 0 ? (offers / total) * 100 : 0,
    }
  },

  /**
   * Get application activity over time (last 30 days)
   */
  async getApplicationActivity(
    jobSeekerId: string,
    days: number = 30
  ): Promise<ApplicationActivity[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('applications')
      .select('applied_at')
      .eq('job_seeker_id', jobSeekerId)
      .gte('applied_at', startDate.toISOString())
      .order('applied_at', { ascending: true })

    if (error || !data) {
      console.error('Error fetching application activity:', error)
      return []
    }

    // Group by date
    const activityMap = new Map<string, number>()

    // Initialize all dates in the range
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      const dateStr = date.toISOString().split('T')[0]
      activityMap.set(dateStr, 0)
    }

    // Count applications per date
    data.forEach((app) => {
      const dateStr = app.applied_at.split('T')[0]
      activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1)
    })

    return Array.from(activityMap.entries()).map(([date, count]) => ({
      date,
      count,
    }))
  },

  /**
   * Get weekly goal progress (applications this week)
   */
  async getWeeklyGoalProgress(
    jobSeekerId: string,
    target: number = 10
  ): Promise<WeeklyGoal> {
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('job_seeker_id', jobSeekerId)
      .gte('applied_at', startOfWeek.toISOString())

    const current = error || !data ? 0 : data.length

    return {
      target,
      current,
      percentage: Math.min((current / target) * 100, 100),
    }
  },

  /**
   * Get most demanded skills from job postings
   */
  async getMostDemandedSkills(
    options: {
      limit?: number
      jobType?: string
      location?: string
      days?: number
    } = {}
  ): Promise<SkillDemand[]> {
    const { limit = 20, jobType, location, days = 30 } = options
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get current period skill counts
    let query = supabase
      .from('job_posting_skills')
      .select(
        `
        skill_id,
        skills (id, name, category),
        job_postings!inner (id, is_active, job_type, location, created_at)
      `
      )
      .eq('job_postings.is_active', true)
      .gte('job_postings.created_at', startDate.toISOString())

    if (jobType) {
      query = query.eq('job_postings.job_type', jobType as 'full-time' | 'part-time' | 'contract' | 'internship')
    }
    if (location) {
      query = query.ilike('job_postings.location', `%${location}%`)
    }

    const { data: currentData, error: currentError } = await query

    if (currentError || !currentData) {
      console.error('Error fetching skill demand:', currentError)
      return []
    }

    // Count skills
    const skillCounts = new Map<
      string,
      { id: string; name: string; category: string | null; count: number }
    >()

    currentData.forEach((item: any) => {
      const skillId = item.skill_id
      const existing = skillCounts.get(skillId)
      if (existing) {
        existing.count++
      } else {
        skillCounts.set(skillId, {
          id: skillId,
          name: item.skills?.name || 'Unknown',
          category: item.skills?.category || null,
          count: 1,
        })
      }
    })

    // Get previous period for comparison
    const previousStart = new Date(startDate)
    previousStart.setDate(previousStart.getDate() - days)

    const { data: previousData } = await supabase
      .from('job_posting_skills')
      .select(
        `
        skill_id,
        job_postings!inner (id, is_active, created_at)
      `
      )
      .eq('job_postings.is_active', true)
      .gte('job_postings.created_at', previousStart.toISOString())
      .lt('job_postings.created_at', startDate.toISOString())

    const previousCounts = new Map<string, number>()
    previousData?.forEach((item: any) => {
      previousCounts.set(
        item.skill_id,
        (previousCounts.get(item.skill_id) || 0) + 1
      )
    })

    // Build result with trend data
    const result: SkillDemand[] = Array.from(skillCounts.values())
      .map((skill) => {
        const previousCount = previousCounts.get(skill.id) || 0
        const changePercentage =
          previousCount > 0
            ? ((skill.count - previousCount) / previousCount) * 100
            : skill.count > 0
            ? 100
            : 0

        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (changePercentage > 5) trend = 'up'
        else if (changePercentage < -5) trend = 'down'

        return {
          skill_id: skill.id,
          skill_name: skill.name,
          category: skill.category,
          count: skill.count,
          trend,
          change_percentage: Math.round(changePercentage),
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return result
  },

  /**
   * Get trending job roles
   */
  async getTrendingJobRoles(
    options: {
      limit?: number
      days?: number
    } = {}
  ): Promise<JobRoleTrend[]> {
    const { limit = 15, days = 30 } = options
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get current period job counts by title
    const { data: currentData, error: currentError } = await supabase
      .from('job_postings')
      .select('title, created_at')
      .eq('is_active', true)
      .gte('created_at', startDate.toISOString())

    if (currentError || !currentData) {
      console.error('Error fetching job roles:', currentError)
      return []
    }

    // Normalize and count titles
    const titleCounts = new Map<string, number>()
    currentData.forEach((job) => {
      // Normalize title (lowercase, trim)
      const normalizedTitle = job.title.trim()
      titleCounts.set(normalizedTitle, (titleCounts.get(normalizedTitle) || 0) + 1)
    })

    // Get previous period for comparison
    const previousStart = new Date(startDate)
    previousStart.setDate(previousStart.getDate() - days)

    const { data: previousData } = await supabase
      .from('job_postings')
      .select('title')
      .eq('is_active', true)
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', startDate.toISOString())

    const previousCounts = new Map<string, number>()
    previousData?.forEach((job) => {
      const normalizedTitle = job.title.trim()
      previousCounts.set(normalizedTitle, (previousCounts.get(normalizedTitle) || 0) + 1)
    })

    // Build result with trend data
    const result: JobRoleTrend[] = Array.from(titleCounts.entries())
      .map(([title, count]) => {
        const previousCount = previousCounts.get(title) || 0
        const growthRate =
          previousCount > 0
            ? ((count - previousCount) / previousCount) * 100
            : count > 0
            ? 100
            : 0

        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (growthRate > 10) trend = 'up'
        else if (growthRate < -10) trend = 'down'

        return {
          title,
          count,
          growth_rate: Math.round(growthRate),
          trend,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return result
  },

  /**
   * Get competitiveness data for a job posting
   */
  async getJobCompetitiveness(jobId: string): Promise<CompetitivenessData> {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('job_posting_id', jobId)

    const applicantCount = error || !data ? 0 : data.length

    // Determine competitiveness level
    let level: 'low' | 'medium' | 'high' | 'very_high'
    let label: string

    if (applicantCount <= 5) {
      level = 'low'
      label = 'Low Competition'
    } else if (applicantCount <= 15) {
      level = 'medium'
      label = 'Medium Competition'
    } else if (applicantCount <= 30) {
      level = 'high'
      label = 'High Competition'
    } else {
      level = 'very_high'
      label = 'Very High Competition'
    }

    return {
      jobId,
      applicantCount,
      level,
      label,
    }
  },

  /**
   * Get competitiveness data for multiple jobs
   */
  async getJobsCompetitiveness(
    jobIds: string[]
  ): Promise<Map<string, CompetitivenessData>> {
    const results = new Map<string, CompetitivenessData>()

    if (jobIds.length === 0) return results

    const { data, error } = await supabase
      .from('applications')
      .select('job_posting_id')
      .in('job_posting_id', jobIds)

    if (error || !data) {
      console.error('Error fetching competitiveness:', error)
      return results
    }

    // Count applications per job
    const counts = new Map<string, number>()
    data.forEach((app) => {
      counts.set(app.job_posting_id, (counts.get(app.job_posting_id) || 0) + 1)
    })

    // Build results for all job IDs
    jobIds.forEach((jobId) => {
      const applicantCount = counts.get(jobId) || 0

      let level: 'low' | 'medium' | 'high' | 'very_high'
      let label: string

      if (applicantCount <= 5) {
        level = 'low'
        label = 'Low Competition'
      } else if (applicantCount <= 15) {
        level = 'medium'
        label = 'Medium Competition'
      } else if (applicantCount <= 30) {
        level = 'high'
        label = 'High Competition'
      } else {
        level = 'very_high'
        label = 'Very High Competition'
      }

      results.set(jobId, {
        jobId,
        applicantCount,
        level,
        label,
      })
    })

    return results
  },

  /**
   * Get color class for competitiveness level
   */
  getCompetitivenessColor(level: 'low' | 'medium' | 'high' | 'very_high'): string {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'high':
        return 'text-orange-600 bg-orange-100'
      case 'very_high':
        return 'text-red-600 bg-red-100'
    }
  },

  /**
   * Get salary distribution from job postings
   */
  async getSalaryDistribution(
    options: {
      days?: number
      jobType?: string
    } = {}
  ): Promise<{ range: string; count: number; minSalary: number; maxSalary: number }[]> {
    const { days = 30, jobType } = options
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let query = supabase
      .from('job_postings')
      .select('salary_min, salary_max')
      .eq('is_active', true)
      .gte('created_at', startDate.toISOString())
      .not('salary_min', 'is', null)
      .not('salary_max', 'is', null)

    if (jobType) {
      query = query.eq('job_type', jobType as 'full-time' | 'part-time' | 'contract' | 'internship')
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    // Define salary ranges
    const ranges = [
      { range: '$0-50K', min: 0, max: 50000 },
      { range: '$50-75K', min: 50000, max: 75000 },
      { range: '$75-100K', min: 75000, max: 100000 },
      { range: '$100-125K', min: 100000, max: 125000 },
      { range: '$125-150K', min: 125000, max: 150000 },
      { range: '$150K+', min: 150000, max: Infinity },
    ]

    const distribution = ranges.map((r) => ({
      range: r.range,
      count: 0,
      minSalary: r.min,
      maxSalary: r.max,
    }))

    data.forEach((job: any) => {
      const avgSalary = (job.salary_min + job.salary_max) / 2
      const rangeIndex = ranges.findIndex(
        (r) => avgSalary >= r.min && avgSalary < r.max
      )
      if (rangeIndex >= 0) {
        distribution[rangeIndex].count++
      }
    })

    return distribution.filter((d) => d.count > 0)
  },

  /**
   * Get salary insights by role/title
   */
  async getSalaryByRole(
    options: {
      days?: number
      roles?: string[] // Specific role titles to filter
      location?: string
      minSampleSize?: number
    } = {}
  ): Promise<RoleSalaryInsight[]> {
    const { days = 90, roles, location, minSampleSize = 3 } = options
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let query = supabase
      .from('job_postings')
      .select('title, salary_min, salary_max, location')
      .eq('is_active', true)
      .gte('created_at', startDate.toISOString())
      .not('salary_min', 'is', null)
      .not('salary_max', 'is', null)

    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('Error fetching salary by role:', error)
      return []
    }

    // Group jobs by normalized title
    const roleGroups = new Map<string, { salaries: number[]; min: number; max: number }[]>()

    data.forEach((job: any) => {
      const title = normalizeRoleTitle(job.title)

      // Skip if we have specific roles filter and this doesn't match
      if (roles && roles.length > 0) {
        const matchesFilter = roles.some(
          (r) => title.toLowerCase().includes(r.toLowerCase())
        )
        if (!matchesFilter) return
      }

      if (!roleGroups.has(title)) {
        roleGroups.set(title, [])
      }

      roleGroups.get(title)!.push({
        salaries: [(job.salary_min + job.salary_max) / 2],
        min: job.salary_min,
        max: job.salary_max,
      })
    })

    // Calculate statistics for each role
    const results: RoleSalaryInsight[] = []

    roleGroups.forEach((jobs, role) => {
      if (jobs.length < minSampleSize) return

      const allSalaries = jobs.flatMap((j) => j.salaries).sort((a, b) => a - b)
      const allMins = jobs.map((j) => j.min).sort((a, b) => a - b)
      const allMaxs = jobs.map((j) => j.max).sort((a, b) => a - b)

      const median = calculatePercentile(allSalaries, 50)
      const p25 = calculatePercentile(allSalaries, 25)
      const p75 = calculatePercentile(allSalaries, 75)
      const minSalary = allMins[0]
      const maxSalary = allMaxs[allMaxs.length - 1]

      results.push({
        role,
        sampleSize: jobs.length,
        median,
        p25,
        p75,
        min: minSalary,
        max: maxSalary,
        range: maxSalary - minSalary,
      })
    })

    // Sort by sample size (most data first) then by median salary
    return results
      .sort((a, b) => {
        if (b.sampleSize !== a.sampleSize) return b.sampleSize - a.sampleSize
        return b.median - a.median
      })
      .slice(0, 20) // Limit to top 20 roles
  },

  /**
   * Get location distribution from job postings
   */
  async getLocationDistribution(
    options: {
      limit?: number
      days?: number
    } = {}
  ): Promise<{ location: string; count: number; percentage: number; isRemote: boolean }[]> {
    const { limit = 10, days = 30 } = options
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('job_postings')
      .select('location, remote_ok')
      .eq('is_active', true)
      .gte('created_at', startDate.toISOString())

    if (error || !data) {
      return []
    }

    const locationCounts = new Map<string, number>()
    let remoteCount = 0

    data.forEach((job: any) => {
      const location = job.location?.trim() || 'Not Specified'
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1)
      if (job.remote_ok) remoteCount++
    })

    const total = data.length
    const result = Array.from(locationCounts.entries())
      .map(([location, count]) => ({
        location,
        count,
        percentage: Math.round((count / total) * 100),
        isRemote: false,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return result
  },

  /**
   * Get skill categories breakdown
   */
  async getSkillCategories(
    options: {
      days?: number
    } = {}
  ): Promise<{ category: string; count: number; percentage: number }[]> {
    const { days = 30 } = options
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('job_posting_skills')
      .select(`
        skills (category),
        job_postings!inner (is_active, created_at)
      `)
      .eq('job_postings.is_active', true)
      .gte('job_postings.created_at', startDate.toISOString())

    if (error || !data) {
      return []
    }

    const categoryCounts = new Map<string, number>()

    data.forEach((item: any) => {
      const category = item.skills?.category || 'Other'
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    })

    const total = data.length
    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  },

  /**
   * Get remote job count
   */
  async getRemoteJobCount(days: number = 30): Promise<number> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { count, error } = await supabase
      .from('job_postings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('remote_ok', true)
      .gte('created_at', startDate.toISOString())

    return error ? 0 : (count || 0)
  },

  /**
   * Get personalized career insights for a job seeker
   */
  async getPersonalizedInsights(
    jobSeekerId: string
  ): Promise<PersonalizedInsightsResult> {
    // Get user's skills
    const { data: userSkillsData } = await supabase
      .from('job_seeker_skills')
      .select(`
        skill_id,
        proficiency,
        skills (id, name, category)
      `)
      .eq('job_seeker_id', jobSeekerId)

    const userSkills = (userSkillsData || []) as any[]
    const userSkillIds = new Set(userSkills.map((s) => s.skill_id))
    const userSkillNames = userSkills.map((s) => s.skills?.name?.toLowerCase() || '')

    // Get most demanded skills in the market
    const demandedSkills = await this.getMostDemandedSkills({ limit: 30, days: 30 })

    // Get trending job roles
    const trendingRoles = await this.getTrendingJobRoles({ limit: 15, days: 30 })

    // Find skills the user has that are in-demand
    const inDemandUserSkills = demandedSkills.filter((skill) =>
      userSkillIds.has(skill.skill_id)
    )

    // Find skills the user should learn (high demand, user doesn't have)
    const skillsToLearn = demandedSkills
      .filter((skill) => !userSkillIds.has(skill.skill_id))
      .slice(0, 10)

    // Find trending roles that might match user's skills
    // Simple matching: check if user has any skill that might be relevant to the role title
    const matchingRoles = trendingRoles.filter((role) => {
      const roleTitle = role.title.toLowerCase()
      // Check for common patterns
      return userSkillNames.some((skillName) => {
        if (!skillName) return false
        // Match skills that might be relevant to the role
        if (roleTitle.includes(skillName)) return true
        if (skillName.includes('react') && roleTitle.includes('frontend')) return true
        if (skillName.includes('node') && roleTitle.includes('backend')) return true
        if (skillName.includes('python') && (roleTitle.includes('data') || roleTitle.includes('backend'))) return true
        if (skillName.includes('java') && roleTitle.includes('backend')) return true
        if (skillName.includes('typescript') && (roleTitle.includes('frontend') || roleTitle.includes('fullstack'))) return true
        return false
      })
    }).slice(0, 5)

    // Generate insights
    const insights: PersonalizedInsight[] = []

    // High-demand skills the user already has
    inDemandUserSkills.slice(0, 3).forEach((skill) => {
      insights.push({
        type: 'in_demand_skill',
        title: `Your ${skill.skill_name} skills are in high demand`,
        description: `${skill.count} companies are looking for ${skill.skill_name} professionals. ${skill.trend === 'up' ? `Demand has increased ${skill.change_percentage}% recently!` : 'Highlight this skill in your applications.'}`,
        priority: skill.trend === 'up' ? 'high' : 'medium',
        data: {
          skillName: skill.skill_name,
          skillId: skill.skill_id,
          demandCount: skill.count,
          growthPercentage: skill.change_percentage,
        },
      })
    })

    // Skills to learn recommendations
    skillsToLearn.slice(0, 3).forEach((skill, index) => {
      insights.push({
        type: 'skill_to_learn',
        title: `Consider learning ${skill.skill_name}`,
        description: `${skill.skill_name} is one of the most requested skills (${skill.count} job postings).${skill.trend === 'up' ? ` Growing ${skill.change_percentage}% in demand!` : ''}`,
        priority: index === 0 ? 'high' : 'medium',
        actionText: 'Add to profile when ready',
        actionLink: '/profile',
        data: {
          skillName: skill.skill_name,
          skillId: skill.skill_id,
          demandCount: skill.count,
          growthPercentage: skill.change_percentage,
        },
      })
    })

    // Trending roles that match user's skills
    matchingRoles.slice(0, 2).forEach((role) => {
      insights.push({
        type: 'trending_role',
        title: `${role.title} roles are trending`,
        description: `${role.count} positions available${role.trend === 'up' ? `, growing ${role.growth_rate}%` : ''}. Your skills may be a good match!`,
        priority: role.trend === 'up' ? 'high' : 'medium',
        actionText: 'Search jobs',
        actionLink: `/jobs?search=${encodeURIComponent(role.title)}`,
        data: {
          roleName: role.title,
          demandCount: role.count,
          growthPercentage: role.growth_rate,
        },
      })
    })

    // Career tips based on profile analysis
    if (userSkills.length === 0) {
      insights.push({
        type: 'career_tip',
        title: 'Add your skills to get personalized insights',
        description: 'Update your profile with your skills to receive tailored job recommendations and market insights.',
        priority: 'high',
        actionText: 'Update profile',
        actionLink: '/profile',
      })
    } else if (userSkills.length < 5) {
      insights.push({
        type: 'career_tip',
        title: 'Add more skills to improve your matches',
        description: `You have ${userSkills.length} skills listed. Adding more skills can help you match with additional opportunities.`,
        priority: 'medium',
        actionText: 'Add skills',
        actionLink: '/profile',
      })
    }

    // Sort insights by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return {
      insights: insights.slice(0, 8), // Limit to 8 insights
      skillsToLearn,
      inDemandUserSkills,
      matchingRoles,
    }
  },

  /**
   * Get application status history with user details
   */
  async getApplicationStatusHistory(
    applicationId: string
  ): Promise<StatusHistoryEntry[]> {
    const { data, error } = await supabase
      .from('application_status_history')
      .select(`
        *,
        profiles:changed_by (
          email,
          role
        )
      `)
      .eq('application_id', applicationId)
      .order('changed_at', { ascending: true })

    if (error || !data) {
      console.error('Error fetching status history:', error)
      return []
    }

    return data.map((entry: any) => ({
      id: entry.id,
      applicationId: entry.application_id,
      oldStatus: entry.old_status,
      newStatus: entry.new_status,
      changedBy: entry.changed_by,
      changedByEmail: entry.profiles?.email || null,
      changedByRole: entry.profiles?.role || null,
      changedAt: entry.changed_at,
      notes: entry.notes,
    }))
  },
}

// Types for personalized insights
export interface PersonalizedInsight {
  type: 'skill_to_learn' | 'trending_role' | 'in_demand_skill' | 'career_tip'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionText?: string
  actionLink?: string
  data?: {
    skillName?: string
    skillId?: string
    roleName?: string
    demandCount?: number
    growthPercentage?: number
  }
}

export interface PersonalizedInsightsResult {
  insights: PersonalizedInsight[]
  skillsToLearn: SkillDemand[]
  inDemandUserSkills: SkillDemand[]
  matchingRoles: JobRoleTrend[]
}

// Types for status history
export interface StatusHistoryEntry {
  id: string
  applicationId: string
  oldStatus: ApplicationStatus | null
  newStatus: ApplicationStatus
  changedBy: string | null
  changedByEmail: string | null
  changedByRole: string | null
  changedAt: string
  notes: string | null
}

// Types for salary insights
export interface RoleSalaryInsight {
  role: string
  sampleSize: number
  median: number
  p25: number
  p75: number
  min: number
  max: number
  range: number
}

// Helper functions for salary calculations
function normalizeRoleTitle(title: string): string {
  // Normalize common variations of job titles
  const normalized = title.trim()

  // Common normalizations
  const normalizations: Record<string, string> = {
    'sr.': 'Senior',
    'sr ': 'Senior ',
    'jr.': 'Junior',
    'jr ': 'Junior ',
    'dev': 'Developer',
    'eng': 'Engineer',
    'mgr': 'Manager',
  }

  let result = normalized
  Object.entries(normalizations).forEach(([from, to]) => {
    result = result.replace(new RegExp(from, 'gi'), to)
  })

  return result
}

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  if (sortedArray.length === 1) return sortedArray[0]

  const index = (percentile / 100) * (sortedArray.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  if (lower === upper) {
    return sortedArray[lower]
  }

  const weight = index - lower
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
}
