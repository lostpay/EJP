import { supabase } from '@/lib/supabase'
import type { Skill, JobSeekerSkill } from '@/types'

export interface CandidateMatchResult {
  applicationId: string
  jobSeekerId: string
  jobPostingId: string
  score: number
  matchedSkills: MatchedSkillResult[]
  missingSkills: MissingSkillResult[]
  partiallyMatchedSkills: PartialSkillResult[]
  skillCoveragePercentage: number
  requiredSkillsCoverage: number
}

export interface MatchedSkillResult {
  skillId: string
  skillName: string
  isRequired: boolean
  candidateProficiency: string | null
  matchType: 'exact' | 'partial'
}

export interface MissingSkillResult {
  skillId: string
  skillName: string
  isRequired: boolean
}

export interface PartialSkillResult {
  skillId: string
  skillName: string
  isRequired: boolean
  candidateProficiency: string | null
  expectedProficiency?: string
}

export interface JobRequiredSkills {
  required: { skillId: string; skillName: string }[]
  optional: { skillId: string; skillName: string }[]
}

const PROFICIENCY_WEIGHTS: Record<string, number> = {
  expert: 1.0,
  advanced: 0.85,
  intermediate: 0.7,
  beginner: 0.5,
}

export const employerMatchService = {
  /**
   * Get required skills for a job posting
   */
  async getJobRequiredSkills(jobPostingId: string): Promise<JobRequiredSkills> {
    const { data, error } = await supabase
      .from('job_posting_skills')
      .select(`
        skill_id,
        is_required,
        skills (id, name)
      `)
      .eq('job_posting_id', jobPostingId)

    if (error || !data) {
      console.error('Error fetching job skills:', error)
      return { required: [], optional: [] }
    }

    const required: { skillId: string; skillName: string }[] = []
    const optional: { skillId: string; skillName: string }[] = []

    data.forEach((item: any) => {
      const skill = {
        skillId: item.skill_id,
        skillName: item.skills?.name || 'Unknown',
      }
      if (item.is_required) {
        required.push(skill)
      } else {
        optional.push(skill)
      }
    })

    return { required, optional }
  },

  /**
   * Calculate match score for a single candidate against a job
   */
  async calculateCandidateMatch(
    jobSeekerId: string,
    jobPostingId: string,
    applicationId: string,
    candidateSkills?: (JobSeekerSkill & { skills: Skill })[]
  ): Promise<CandidateMatchResult> {
    // Get job required skills
    const { data: jobSkillsData } = await supabase
      .from('job_posting_skills')
      .select(`
        skill_id,
        is_required,
        skills (id, name)
      `)
      .eq('job_posting_id', jobPostingId)

    const jobSkills = (jobSkillsData || []) as any[]

    // Get candidate skills if not provided
    let skills = candidateSkills
    if (!skills) {
      const { data: candidateSkillsData } = await supabase
        .from('job_seeker_skills')
        .select(`
          *,
          skills (id, name)
        `)
        .eq('job_seeker_id', jobSeekerId)

      skills = (candidateSkillsData || []) as (JobSeekerSkill & { skills: Skill })[]
    }

    // Create a map of candidate skills
    const candidateSkillMap = new Map<string, JobSeekerSkill & { skills: Skill }>()
    skills.forEach((skill) => {
      candidateSkillMap.set(skill.skill_id, skill)
    })

    const matchedSkills: MatchedSkillResult[] = []
    const missingSkills: MissingSkillResult[] = []
    const partiallyMatchedSkills: PartialSkillResult[] = []

    let totalScore = 0
    let maxScore = 0
    let requiredMatched = 0
    let totalRequired = 0

    jobSkills.forEach((jobSkill: any) => {
      const weight = jobSkill.is_required ? 2 : 1
      maxScore += weight

      if (jobSkill.is_required) {
        totalRequired++
      }

      const candidateSkill = candidateSkillMap.get(jobSkill.skill_id)

      if (candidateSkill) {
        const proficiencyWeight = PROFICIENCY_WEIGHTS[candidateSkill.proficiency || 'intermediate'] || 0.7
        const skillScore = weight * proficiencyWeight

        totalScore += skillScore

        if (jobSkill.is_required) {
          requiredMatched++
        }

        // Determine if it's a full match or partial based on proficiency
        const matchType = proficiencyWeight >= 0.7 ? 'exact' : 'partial'

        if (matchType === 'exact') {
          matchedSkills.push({
            skillId: jobSkill.skill_id,
            skillName: jobSkill.skills?.name || 'Unknown',
            isRequired: jobSkill.is_required,
            candidateProficiency: candidateSkill.proficiency,
            matchType: 'exact',
          })
        } else {
          partiallyMatchedSkills.push({
            skillId: jobSkill.skill_id,
            skillName: jobSkill.skills?.name || 'Unknown',
            isRequired: jobSkill.is_required,
            candidateProficiency: candidateSkill.proficiency,
          })
        }
      } else {
        missingSkills.push({
          skillId: jobSkill.skill_id,
          skillName: jobSkill.skills?.name || 'Unknown',
          isRequired: jobSkill.is_required,
        })
      }
    })

    const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    const skillCoveragePercentage =
      jobSkills.length > 0
        ? Math.round(((matchedSkills.length + partiallyMatchedSkills.length) / jobSkills.length) * 100)
        : 0
    const requiredSkillsCoverage =
      totalRequired > 0 ? Math.round((requiredMatched / totalRequired) * 100) : 100

    return {
      applicationId,
      jobSeekerId,
      jobPostingId,
      score,
      matchedSkills,
      missingSkills,
      partiallyMatchedSkills,
      skillCoveragePercentage,
      requiredSkillsCoverage,
    }
  },

  /**
   * Calculate match scores for multiple candidates for a job
   */
  async calculateMatchesForJob(
    jobPostingId: string,
    applications: {
      id: string
      jobSeekerId: string
      candidateSkills: (JobSeekerSkill & { skills: Skill })[]
    }[]
  ): Promise<Map<string, CandidateMatchResult>> {
    const results = new Map<string, CandidateMatchResult>()

    const promises = applications.map(async (app) => {
      const match = await this.calculateCandidateMatch(
        app.jobSeekerId,
        jobPostingId,
        app.id,
        app.candidateSkills
      )
      results.set(app.id, match)
    })

    await Promise.all(promises)
    return results
  },

  /**
   * Get score color for employer view
   */
  getScoreColor(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 70) return 'success'
    if (score >= 40) return 'warning'
    return 'danger'
  },

  /**
   * Get score label for employer view
   */
  getScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Strong Match'
    if (score >= 40) return 'Moderate Match'
    return 'Low Match'
  },

  /**
   * Rank candidates by match score
   */
  rankCandidates<T extends { matchScore?: CandidateMatchResult }>(
    candidates: T[],
    order: 'asc' | 'desc' = 'desc'
  ): T[] {
    return [...candidates].sort((a, b) => {
      const scoreA = a.matchScore?.score || 0
      const scoreB = b.matchScore?.score || 0
      return order === 'desc' ? scoreB - scoreA : scoreA - scoreB
    })
  },
}
