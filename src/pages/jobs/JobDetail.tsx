import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapPin, Building2, Clock, Globe, DollarSign, ArrowLeft, Bookmark } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Button, Card, Badge, Spinner, Modal, Textarea, MatchScoreBadge } from '@/components/ui'
import { SkillMatchDisplay, MatchExplanation } from '@/components/jobs'
import { CompetitivenessIndicator } from '@/components/analytics'
import { matchScoreService } from '@/services/matchScoreService'
import { analyticsService, type CompetitivenessData } from '@/services/analyticsService'
import type { JobPosting, Company, Skill, MatchScoreResult } from '@/types'
import toast from 'react-hot-toast'

type JobWithDetails = JobPosting & {
  companies: Company
  job_posting_skills: { skills: Skill; is_required: boolean }[]
}

export function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, jobSeeker } = useAuthStore()
  const [job, setJob] = useState<JobWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false)
  const [matchScore, setMatchScore] = useState<MatchScoreResult | null>(null)
  const [competitiveness, setCompetitiveness] = useState<CompetitivenessData | null>(null)

  useEffect(() => {
    if (id) {
      fetchJob()
      fetchCompetitiveness()
      if (jobSeeker) {
        checkIfApplied()
        checkIfBookmarked()
        calculateMatchScore()
      }
    }
  }, [id, jobSeeker])

  const fetchCompetitiveness = async () => {
    if (!id) return
    const data = await analyticsService.getJobCompetitiveness(id)
    setCompetitiveness(data)
  }

  const calculateMatchScore = async () => {
    if (!jobSeeker || !id) return

    const score = await matchScoreService.calculateScore(jobSeeker.id, id)
    setMatchScore(score)
  }

  const fetchJob = async () => {
    setIsLoading(true)

    const { data, error } = await supabase
      .from('job_postings')
      .select(`
        *,
        companies (*),
        job_posting_skills (
          is_required,
          skills (*)
        )
      `)
      .eq('id', id!)
      .single()

    if (error) {
      console.error('Error fetching job:', error)
      toast.error('Job not found')
      navigate('/jobs')
    } else {
      setJob(data as JobWithDetails)
    }

    setIsLoading(false)
  }

  const checkIfApplied = async () => {
    if (!jobSeeker) return

    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('job_posting_id', id!)
      .eq('job_seeker_id', jobSeeker.id)
      .single()

    setHasApplied(!!data)
  }

  const checkIfBookmarked = async () => {
    if (!jobSeeker) return

    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('job_posting_id', id!)
      .eq('job_seeker_id', jobSeeker.id)
      .single()

    setIsBookmarked(!!data)
  }

  const toggleBookmark = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/jobs/${id}` } })
      return
    }

    if (!jobSeeker) {
      toast.error('Only job seekers can bookmark jobs')
      return
    }

    setIsTogglingBookmark(true)

    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('job_posting_id', id!)
          .eq('job_seeker_id', jobSeeker.id)

        if (error) throw error
        toast.success('Bookmark removed')
        setIsBookmarked(false)
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            job_posting_id: id!,
            job_seeker_id: jobSeeker.id,
          })

        if (error) throw error
        toast.success('Job bookmarked')
        setIsBookmarked(true)
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
      toast.error('Failed to update bookmark')
    } finally {
      setIsTogglingBookmark(false)
    }
  }

  const handleApply = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/jobs/${id}` } })
      return
    }

    if (!jobSeeker) {
      toast.error('Only job seekers can apply to jobs')
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase
      .from('applications')
      .insert({
        job_posting_id: id!,
        job_seeker_id: jobSeeker.id,
        cover_letter: coverLetter || null,
        resume_url: jobSeeker.resume_url,
      })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Application submitted successfully!')
      setHasApplied(true)
      setIsApplyModalOpen(false)
    }

    setIsSubmitting(false)
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    return `Up to $${max?.toLocaleString()}`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!job) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/jobs" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Jobs
      </Link>

      <Card padding="lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-lg text-gray-600">{job.companies?.company_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleBookmark}
              disabled={isTogglingBookmark}
              className={isBookmarked ? 'text-primary-600 border-primary-600' : ''}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
            {hasApplied ? (
              <Button disabled>Applied</Button>
            ) : (
              <Button onClick={() => user ? setIsApplyModalOpen(true) : navigate('/login')}>
                Apply Now
              </Button>
            )}
          </div>
        </div>

        {/* Job Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          {job.location && (
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2 text-gray-400" />
              <span>{job.location}</span>
            </div>
          )}
          {job.job_type && (
            <div className="flex items-center text-gray-600">
              <Clock className="h-5 w-5 mr-2 text-gray-400" />
              <span className="capitalize">{job.job_type}</span>
            </div>
          )}
          {job.remote_ok && (
            <div className="flex items-center text-gray-600">
              <Globe className="h-5 w-5 mr-2 text-gray-400" />
              <span>Remote OK</span>
            </div>
          )}
          {formatSalary(job.salary_min, job.salary_max) && (
            <div className="flex items-center text-gray-600">
              <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
              <span>{formatSalary(job.salary_min, job.salary_max)}</span>
            </div>
          )}
        </div>

        {/* Competitiveness Indicator */}
        {competitiveness && (
          <div className="mb-6">
            <CompetitivenessIndicator data={competitiveness} size="md" showTooltip />
          </div>
        )}

        {/* Match Score Section - Only shown to job seekers */}
        {matchScore && jobSeeker && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Match Score</h2>
              <MatchScoreBadge score={matchScore.score} size="lg" showLabel />
            </div>
            <SkillMatchDisplay
              matchedSkills={matchScore.matched_skills}
              missingSkills={matchScore.missing_skills}
              skillMatchPercentage={matchScore.skill_match_percentage}
            />
            <div className="mt-4">
              <MatchExplanation
                matchScore={matchScore}
                jobLocation={job.location}
                jobRemoteOk={job.remote_ok}
                seekerLocation={jobSeeker.location}
                seekerRemoteOk={jobSeeker.remote_ok}
              />
            </div>
          </div>
        )}

        {/* Skills */}
        {job.job_posting_skills && job.job_posting_skills.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.job_posting_skills.map((jps) => (
                <Badge
                  key={jps.skills.id}
                  variant={jps.is_required ? 'primary' : 'gray'}
                >
                  {jps.skills.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Job Description</h2>
          <div className="prose prose-gray max-w-none">
            <p className="whitespace-pre-wrap text-gray-600">{job.description}</p>
          </div>
        </div>

        {/* Company Info */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-3">About {job.companies?.company_name}</h2>
          <p className="text-gray-600">{job.companies?.description || 'No company description available.'}</p>
          {job.companies?.website && (
            <a
              href={job.companies.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline mt-2 inline-block"
            >
              Visit website
            </a>
          )}
        </div>
      </Card>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={`Apply to ${job.title}`}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            You're applying to <strong>{job.title}</strong> at <strong>{job.companies?.company_name}</strong>.
          </p>

          {jobSeeker?.resume_url ? (
            <p className="text-sm text-green-600">
              Your resume will be included with this application.
            </p>
          ) : (
            <p className="text-sm text-yellow-600">
              You haven't uploaded a resume yet. Consider adding one to your profile.
            </p>
          )}

          <Textarea
            label="Cover Letter (Optional)"
            placeholder="Tell the employer why you're a great fit for this role..."
            rows={6}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} isLoading={isSubmitting}>
              Submit Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
