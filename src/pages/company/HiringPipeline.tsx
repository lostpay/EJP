import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Calendar,
  List,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import {
  Card,
  Button,
  Spinner,
  EmptyState,
  Badge,
  MatchScoreBadge,
  Modal,
} from '@/components/ui'
import { CandidateSkillsAnalysis } from '@/components/employer'
import {
  employerMatchService,
  type CandidateMatchResult,
} from '@/services/employerMatchService'
import type {
  Application,
  JobPosting,
  JobSeeker,
  JobSeekerSkill,
  Skill,
  ApplicationStatus,
} from '@/types'
import { STATUS_LABELS } from '@/types'
import toast from 'react-hot-toast'

type ApplicantWithDetails = Application & {
  job_seekers: JobSeeker & {
    job_seeker_skills: (JobSeekerSkill & { skills: Skill })[]
  }
  matchScore?: CandidateMatchResult
}

interface PipelineColumn {
  status: ApplicationStatus
  label: string
  color: string
  bgColor: string
  isCollapsed: boolean
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    status: 'pending',
    label: STATUS_LABELS.pending,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    isCollapsed: false,
  },
  {
    status: 'reviewing',
    label: STATUS_LABELS.reviewing,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    isCollapsed: false,
  },
  {
    status: 'interview',
    label: STATUS_LABELS.interview,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    isCollapsed: false,
  },
  {
    status: 'offered',
    label: STATUS_LABELS.offered,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    isCollapsed: false,
  },
  {
    status: 'rejected',
    label: STATUS_LABELS.rejected,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    isCollapsed: false,
  },
]

export function HiringPipeline() {
  const { id: jobId } = useParams<{ id: string }>()
  const { company } = useAuthStore()
  const [job, setJob] = useState<JobPosting | null>(null)
  const [applicants, setApplicants] = useState<ApplicantWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [columns, setColumns] = useState<PipelineColumn[]>(PIPELINE_COLUMNS)

  // Drag state
  const [draggedApplicant, setDraggedApplicant] = useState<ApplicantWithDetails | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null)

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailApplicant, setDetailApplicant] = useState<ApplicantWithDetails | null>(null)

  useEffect(() => {
    if (jobId && company) {
      fetchJobAndApplicants()
    }
  }, [jobId, company])

  const fetchJobAndApplicants = async () => {
    if (!jobId || !company) return

    setIsLoading(true)

    // Fetch job posting
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', jobId)
      .eq('company_id', company.id)
      .single()

    if (jobError || !jobData) {
      toast.error('Job posting not found')
      setIsLoading(false)
      return
    }

    setJob(jobData)

    // Fetch applicants (excluding withdrawn)
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_seekers (
          *,
          job_seeker_skills (
            *,
            skills (*)
          )
        )
      `)
      .eq('job_posting_id', jobId)
      .neq('status', 'withdrawn')
      .order('applied_at', { ascending: false })

    if (error) {
      console.error('Error fetching applicants:', error)
      toast.error('Failed to load applicants')
      setIsLoading(false)
      return
    }

    const applicantsData = (data || []) as ApplicantWithDetails[]
    setApplicants(applicantsData)
    setIsLoading(false)

    // Calculate match scores
    if (applicantsData.length > 0) {
      calculateMatchScores(applicantsData, jobId)
    }
  }

  const calculateMatchScores = async (apps: ApplicantWithDetails[], jobPostingId: string) => {
    try {
      const matchData = apps.map((app) => ({
        id: app.id,
        jobSeekerId: app.job_seeker_id,
        candidateSkills: app.job_seekers?.job_seeker_skills || [],
      }))

      const matches = await employerMatchService.calculateMatchesForJob(jobPostingId, matchData)

      setApplicants((prev) =>
        prev.map((app) => ({
          ...app,
          matchScore: matches.get(app.id),
        }))
      )
    } catch (error) {
      console.error('Error calculating match scores:', error)
    }
  }

  // Group applicants by status
  const applicantsByStatus = useMemo(() => {
    const grouped: Record<ApplicationStatus, ApplicantWithDetails[]> = {
      pending: [],
      reviewing: [],
      interview: [],
      offered: [],
      rejected: [],
      withdrawn: [],
    }

    applicants.forEach((app) => {
      if (grouped[app.status]) {
        grouped[app.status].push(app)
      }
    })

    // Sort each group by match score (descending)
    Object.keys(grouped).forEach((status) => {
      grouped[status as ApplicationStatus].sort(
        (a, b) => (b.matchScore?.score || 0) - (a.matchScore?.score || 0)
      )
    })

    return grouped
  }, [applicants])

  const toggleColumn = (status: ApplicationStatus) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.status === status ? { ...col, isCollapsed: !col.isCollapsed } : col
      )
    )
  }

  // Drag and Drop handlers
  const handleDragStart = (applicant: ApplicantWithDetails) => {
    setDraggedApplicant(applicant)
  }

  const handleDragEnd = () => {
    setDraggedApplicant(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault()
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: ApplicationStatus) => {
    e.preventDefault()

    if (!draggedApplicant || draggedApplicant.status === newStatus) {
      handleDragEnd()
      return
    }

    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', draggedApplicant.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`)
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === draggedApplicant.id ? { ...app, status: newStatus } : app
        )
      )
    }

    handleDragEnd()
  }

  const openDetailModal = (applicant: ApplicantWithDetails) => {
    setDetailApplicant(applicant)
    setDetailModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!job) {
    return (
      <EmptyState
        title="Job posting not found"
        description="This job posting doesn't exist or you don't have access to it."
        action={
          <Link to="/company/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to={`/company/jobs/${jobId}/applicants`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Applicants List
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Hiring Pipeline: {job.title}</h1>
          <p className="text-gray-600">
            Drag and drop candidates between stages
          </p>
        </div>

        <Link to={`/company/jobs/${jobId}/applicants`}>
          <Button variant="outline">
            <List className="h-4 w-4 mr-2" />
            List View
          </Button>
        </Link>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns
          .filter((col) => col.status !== 'withdrawn')
          .map((column) => {
            const columnApplicants = applicantsByStatus[column.status] || []
            const isDropTarget = dragOverColumn === column.status

            return (
              <div
                key={column.status}
                className={`flex-shrink-0 w-72 ${column.isCollapsed ? 'w-12' : ''}`}
              >
                {/* Column Header */}
                <div
                  className={`rounded-t-lg border-2 ${column.bgColor} p-3 cursor-pointer`}
                  onClick={() => toggleColumn(column.status)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {column.isCollapsed ? (
                        <ChevronDown className={`h-4 w-4 ${column.color}`} />
                      ) : (
                        <ChevronUp className={`h-4 w-4 ${column.color}`} />
                      )}
                      {!column.isCollapsed && (
                        <>
                          <h3 className={`font-semibold ${column.color}`}>
                            {column.label}
                          </h3>
                          <Badge variant="gray" size="sm">
                            {columnApplicants.length}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column Content */}
                {!column.isCollapsed && (
                  <div
                    className={`bg-gray-50 border-2 border-t-0 rounded-b-lg min-h-96 p-2 transition-colors ${
                      isDropTarget
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                    onDragOver={(e) => handleDragOver(e, column.status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, column.status)}
                  >
                    {columnApplicants.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                        No candidates
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {columnApplicants.map((applicant, index) => (
                          <div
                            key={applicant.id}
                            draggable
                            onDragStart={() => handleDragStart(applicant)}
                            onDragEnd={handleDragEnd}
                            className={`bg-white rounded-lg shadow-sm border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                              draggedApplicant?.id === applicant.id
                                ? 'opacity-50'
                                : ''
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    {index < 3 && column.status !== 'rejected' && (
                                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                    )}
                                    <p className="font-medium text-gray-900 truncate text-sm">
                                      {applicant.job_seekers?.full_name || 'Anonymous'}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {formatDate(applicant.applied_at)}
                                  </p>
                                </div>
                              </div>

                              {applicant.matchScore && (
                                <MatchScoreBadge
                                  score={applicant.matchScore.score}
                                  size="sm"
                                />
                              )}
                            </div>

                            {/* Skills preview */}
                            {applicant.matchScore && (
                              <div className="mb-2">
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-gray-500">Skills:</span>
                                  <span className="font-medium">
                                    {applicant.matchScore.requiredSkillsCoverage}%
                                  </span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 ml-1">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        applicant.matchScore.requiredSkillsCoverage >= 70
                                          ? 'bg-green-500'
                                          : applicant.matchScore.requiredSkillsCoverage >= 40
                                          ? 'bg-yellow-500'
                                          : 'bg-red-500'
                                      }`}
                                      style={{
                                        width: `${applicant.matchScore.requiredSkillsCoverage}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDetailModal(applicant)
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsed State */}
                {column.isCollapsed && (
                  <div
                    className={`bg-gray-50 border-2 border-t-0 rounded-b-lg min-h-96 flex items-center justify-center ${column.bgColor}`}
                    style={{ writingMode: 'vertical-lr' }}
                  >
                    <span className={`font-semibold ${column.color}`}>
                      {column.label} ({columnApplicants.length})
                    </span>
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {/* Legend */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-700">Drag candidates between columns to update their status</span>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-gray-600">Top match in column</span>
          </div>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setDetailApplicant(null)
        }}
        title="Candidate Details"
        size="lg"
      >
        {detailApplicant && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {detailApplicant.job_seekers?.full_name || 'Anonymous'}
                  </h3>
                  {detailApplicant.matchScore && (
                    <MatchScoreBadge score={detailApplicant.matchScore.score} showLabel />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Applied {formatDate(detailApplicant.applied_at)}
                </p>
              </div>
            </div>

            {/* Skills Analysis */}
            {detailApplicant.matchScore && (
              <CandidateSkillsAnalysis matchResult={detailApplicant.matchScore} />
            )}

            {/* Bio */}
            {detailApplicant.job_seekers?.bio && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">About</h4>
                <p className="text-gray-600 text-sm">{detailApplicant.job_seekers.bio}</p>
              </div>
            )}

            {/* Cover Letter */}
            {detailApplicant.cover_letter && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Cover Letter</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">
                    {detailApplicant.cover_letter}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Link
                to={`/company/jobs/${jobId}/applicants`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full">
                  View Full Details
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
