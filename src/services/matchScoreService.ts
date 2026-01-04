import { supabase } from '@/lib/supabase'
import type { MatchScoreResult, MatchedSkill, MissingSkill, JobPosting, Company } from '@/types'

export interface JobRecommendation {
  job: JobPosting & { companies: Company }
  matchScore: MatchScoreResult
}

export const matchScoreService = {
  /**
   * Calculate match score for a single job posting
   */
  async calculateScore(
    jobSeekerId: string,
    jobPostingId: string
  ): Promise<MatchScoreResult | null> {
    const { data, error } = await supabase
      .rpc('calculate_match_score', {
        p_job_seeker_id: jobSeekerId,
        p_job_posting_id: jobPostingId,
      })
      .single()

    if (error) {
      console.error('Error calculating match score:', error)
      return null
    }

    return {
      score: data.score,
      matched_skills: (data.matched_skills || []) as unknown as MatchedSkill[],
      missing_skills: (data.missing_skills || []) as unknown as MissingSkill[],
      skill_match_percentage: data.skill_match_percentage,
      location_match: data.location_match,
      remote_match: data.remote_match,
    }
  },

  /**
   * Calculate match scores for multiple job postings
   * Useful for job listing page
   */
  async calculateScoresForJobs(
    jobSeekerId: string,
    jobPostingIds: string[]
  ): Promise<Map<string, MatchScoreResult>> {
    const results = new Map<string, MatchScoreResult>()

    if (jobPostingIds.length === 0) {
      return results
    }

    // Calculate scores in parallel batches
    const batchSize = 10
    for (let i = 0; i < jobPostingIds.length; i += batchSize) {
      const batch = jobPostingIds.slice(i, i + batchSize)
      const promises = batch.map(async (jobId) => {
        const score = await this.calculateScore(jobSeekerId, jobId)
        if (score) {
          results.set(jobId, score)
        }
      })
      await Promise.all(promises)
    }

    return results
  },

  /**
   * Get score color class based on value
   */
  getScoreColor(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 70) return 'success'
    if (score >= 40) return 'warning'
    return 'danger'
  },

  /**
   * Get human-readable score label
   */
  getScoreLabel(score: number): string {
    if (score >= 70) return 'Excellent Match'
    if (score >= 40) return 'Good Match'
    return 'Partial Match'
  },

  /**
   * Get job recommendations for a job seeker
   * Returns jobs sorted by match score, excluding already applied jobs
   */
  async getRecommendations(
    jobSeekerId: string,
    limit: number = 10
  ): Promise<JobRecommendation[]> {
    // Get all active job postings
    const { data: jobs, error: jobsError } = await supabase
      .from('job_postings')
      .select(`
        *,
        companies (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50) // Fetch more to filter after scoring

    if (jobsError || !jobs) {
      console.error('Error fetching jobs for recommendations:', jobsError)
      return []
    }

    // Get jobs the user has already applied to
    const { data: applications } = await supabase
      .from('applications')
      .select('job_posting_id')
      .eq('job_seeker_id', jobSeekerId)

    const appliedJobIds = new Set(applications?.map((a) => a.job_posting_id) || [])

    // Filter out already applied jobs
    const availableJobs = jobs.filter((job) => !appliedJobIds.has(job.id))

    // Calculate match scores for each job
    const recommendations: JobRecommendation[] = []

    for (const job of availableJobs) {
      const matchScore = await this.calculateScore(jobSeekerId, job.id)
      if (matchScore) {
        recommendations.push({
          job: job as JobPosting & { companies: Company },
          matchScore,
        })
      }
    }

    // Sort by score descending and limit
    recommendations.sort((a, b) => b.matchScore.score - a.matchScore.score)

    return recommendations.slice(0, limit)
  },
}
