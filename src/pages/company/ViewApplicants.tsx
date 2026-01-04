import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Phone,
  FileText,
  User,
  MessageSquare,
  Star,
  LayoutGrid,
  List,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import {
  Card,
  Button,
  Select,
  Spinner,
  EmptyState,
  ApplicationStatusBadge,
  ApplicationStatusTimeline,
  Modal,
  MatchScoreBadge,
} from '@/components/ui'
import {
  CandidateSkillsAnalysis,
  CandidateMatchCard,
  CandidateScoreBreakdown,
  BulkStatusUpdateModal,
  QuickRejectModal,
} from '@/components/employer'
import {
  employerMatchService,
  type CandidateMatchResult,
} from '@/services/employerMatchService'
import type { Application, JobPosting, JobSeeker, JobSeekerSkill, Skill, ApplicationStatus } from '@/types'
import { VALID_STATUS_TRANSITIONS, STATUS_LABELS } from '@/types'
import toast from 'react-hot-toast'

type ApplicantWithDetails = Application & {
  job_seekers: JobSeeker & {
    job_seeker_skills: (JobSeekerSkill & { skills: Skill })[]
  }
  matchScore?: CandidateMatchResult
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'interview', label: 'Interview' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

const sortOptions = [
  { value: 'match_desc', label: 'Best Match First' },
  { value: 'match_asc', label: 'Lowest Match First' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
]

const matchFilterOptions = [
  { value: '0', label: 'All Scores' },
  { value: '40', label: '40%+ Match' },
  { value: '60', label: '60%+ Match' },
  { value: '80', label: '80%+ Match' },
]

export function ViewApplicants() {
  const { id: jobId } = useParams<{ id: string }>()
  const { company } = useAuthStore()
  const [job, setJob] = useState<JobPosting | null>(null)
  const [applicants, setApplicants] = useState<ApplicantWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('match_desc')
  const [minMatchScore, setMinMatchScore] = useState('0')
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards')

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  // Status update modal
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantWithDetails | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Quick reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectCandidate, setRejectCandidate] = useState<ApplicantWithDetails | null>(null)

  // Applicant detail modal
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

    // Fetch applicants
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
    setIsLoadingMatches(true)

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
    } finally {
      setIsLoadingMatches(false)
    }
  }

  // Filtered and sorted applicants
  const filteredApplicants = useMemo(() => {
    let result = [...applicants]

    // Filter by status
    if (statusFilter) {
      result = result.filter((app) => app.status === statusFilter)
    }

    // Filter by minimum match score
    const minScore = parseInt(minMatchScore)
    if (minScore > 0) {
      result = result.filter((app) => (app.matchScore?.score || 0) >= minScore)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'match_desc':
          return (b.matchScore?.score || 0) - (a.matchScore?.score || 0)
        case 'match_asc':
          return (a.matchScore?.score || 0) - (b.matchScore?.score || 0)
        case 'newest':
          return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
        case 'oldest':
          return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime()
        default:
          return 0
      }
    })

    return result
  }, [applicants, statusFilter, sortOrder, minMatchScore])

  // Top matches (top 10 by score)
  const topMatches = useMemo(() => {
    return [...applicants]
      .filter((app) => app.matchScore)
      .sort((a, b) => (b.matchScore?.score || 0) - (a.matchScore?.score || 0))
      .slice(0, 10)
      .map((app) => app.id)
  }, [applicants])

  const openStatusModal = (applicant: ApplicantWithDetails) => {
    setSelectedApplicant(applicant)
    setNewStatus(applicant.status)
    setStatusModalOpen(true)
  }

  const handleStatusUpdate = async () => {
    if (!selectedApplicant || !newStatus) return

    setIsUpdatingStatus(true)

    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus as ApplicationStatus })
      .eq('id', selectedApplicant.id)

    if (error) {
      toast.error('Failed to update status')
      console.error(error)
    } else {
      toast.success('Application status updated')
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === selectedApplicant.id
            ? { ...app, status: newStatus as ApplicationStatus }
            : app
        )
      )
    }

    setIsUpdatingStatus(false)
    setStatusModalOpen(false)
    setSelectedApplicant(null)
  }

  const handleQuickAdvance = async (applicant: ApplicantWithDetails) => {
    const validNext = VALID_STATUS_TRANSITIONS[applicant.status] || []
    const advanceOrder: ApplicationStatus[] = ['reviewing', 'interview', 'offered']
    const nextStatus = advanceOrder.find((s) => validNext.includes(s))

    if (!nextStatus) {
      toast.error('Cannot advance this application')
      return
    }

    const { error } = await supabase
      .from('applications')
      .update({ status: nextStatus })
      .eq('id', applicant.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Advanced to ${STATUS_LABELS[nextStatus]}`)
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === applicant.id ? { ...app, status: nextStatus } : app
        )
      )
    }
  }

  const handleQuickReject = (applicant: ApplicantWithDetails) => {
    setRejectCandidate(applicant)
    setRejectModalOpen(true)
  }

  const confirmReject = async (_notes?: string) => {
    if (!rejectCandidate) return

    const { error } = await supabase
      .from('applications')
      .update({ status: 'rejected' as ApplicationStatus })
      .eq('id', rejectCandidate.id)

    if (error) {
      toast.error('Failed to reject application')
    } else {
      toast.success('Application rejected')
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === rejectCandidate.id
            ? { ...app, status: 'rejected' as ApplicationStatus }
            : app
        )
      )
    }

    setRejectModalOpen(false)
    setRejectCandidate(null)
  }

  const handleBulkUpdate = async (newStatus: ApplicationStatus, _notes?: string) => {
    if (selectedIds.size === 0) return

    setIsBulkUpdating(true)

    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .in('id', Array.from(selectedIds))

    if (error) {
      toast.error('Failed to update applications')
    } else {
      toast.success(`Updated ${selectedIds.size} application(s)`)
      setApplicants((prev) =>
        prev.map((app) =>
          selectedIds.has(app.id) ? { ...app, status: newStatus } : app
        )
      )
      setSelectedIds(new Set())
    }

    setIsBulkUpdating(false)
  }

  const toggleSelection = (applicant: ApplicantWithDetails, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(applicant.id)
      } else {
        next.delete(applicant.id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredApplicants.map((a) => a.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const openDetailModal = (applicant: ApplicantWithDetails) => {
    setDetailApplicant(applicant)
    setDetailModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getResumeUrl = (applicant: ApplicantWithDetails) => {
    return applicant.resume_url || applicant.job_seekers?.resume_url
  }

  const updateStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'reviewing', label: 'Reviewing' },
    { value: 'interview', label: 'Interview' },
    { value: 'offered', label: 'Offered' },
    { value: 'rejected', label: 'Rejected' },
  ]

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
            to="/company/jobs"
            className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Job Postings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Applicants for {job.title}</h1>
          <p className="text-gray-600">
            {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
            {isLoadingMatches && ' (calculating match scores...)'}
          </p>
        </div>

        <Link to={`/company/jobs/${jobId}/pipeline`}>
          <Button variant="outline">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Pipeline View
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Sort by"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              options={sortOptions}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Minimum Match"
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(e.target.value)}
              options={matchFilterOptions}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant={viewMode === 'cards' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('compact')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
            <Button size="sm" onClick={() => setBulkModalOpen(true)}>
              Update Selected
            </Button>
          </div>
        )}
      </Card>

      {/* Top Matches Banner */}
      {topMatches.length > 0 && parseInt(minMatchScore) === 0 && !statusFilter && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">
              Top {Math.min(topMatches.length, 10)} Matches Highlighted
            </span>
            <span className="text-sm text-green-600">
              Based on skills compatibility
            </span>
          </div>
        </Card>
      )}

      {/* Applicants List */}
      {filteredApplicants.length === 0 ? (
        <EmptyState
          icon={<User className="h-12 w-12" />}
          title={statusFilter || minMatchScore !== '0' ? 'No applicants found' : 'No applicants yet'}
          description={
            statusFilter || minMatchScore !== '0'
              ? 'Try adjusting your filters to see more applicants.'
              : 'Once candidates apply for this job, they will appear here.'
          }
          action={
            statusFilter || minMatchScore !== '0' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('')
                  setMinMatchScore('0')
                }}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredApplicants.length && filteredApplicants.length > 0}
              onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
              className="h-4 w-4 text-primary-600 rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Select all</span>
          </div>

          {filteredApplicants.map((applicant) => (
            <CandidateMatchCard
              key={applicant.id}
              applicant={applicant}
              matchResult={applicant.matchScore}
              onViewDetails={openDetailModal}
              onUpdateStatus={openStatusModal}
              onQuickAdvance={handleQuickAdvance}
              onQuickReject={handleQuickReject}
              isTopMatch={topMatches.includes(applicant.id)}
              showSkillsAnalysis={true}
              selected={selectedIds.has(applicant.id)}
              onSelect={toggleSelection}
            />
          ))}
        </div>
      ) : (
        /* Compact List View */
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredApplicants.length && filteredApplicants.length > 0}
                      onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                      className="h-4 w-4 text-primary-600 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Candidate
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Match
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Applied
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredApplicants.map((applicant) => (
                  <tr
                    key={applicant.id}
                    className={`hover:bg-gray-50 ${
                      topMatches.includes(applicant.id) ? 'bg-green-50' : ''
                    } ${selectedIds.has(applicant.id) ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(applicant.id)}
                        onChange={(e) => toggleSelection(applicant, e.target.checked)}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {topMatches.includes(applicant.id) && (
                          <Star className="h-4 w-4 text-green-500 fill-green-500" />
                        )}
                        <span className="font-medium">
                          {applicant.job_seekers?.full_name || 'Anonymous'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {applicant.matchScore ? (
                        <MatchScoreBadge score={applicant.matchScore.score} size="sm" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ApplicationStatusBadge status={applicant.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(applicant.applied_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailModal(applicant)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStatusModal(applicant)}
                        >
                          Update
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false)
          setSelectedApplicant(null)
        }}
        title="Update Application Status"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Update the status for{' '}
            <strong>{selectedApplicant?.job_seekers?.full_name}</strong>'s application.
          </p>

          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={updateStatusOptions}
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatusModalOpen(false)
                setSelectedApplicant(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              isLoading={isUpdatingStatus}
              disabled={newStatus === selectedApplicant?.status}
            >
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Reject Modal */}
      <QuickRejectModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false)
          setRejectCandidate(null)
        }}
        candidateName={rejectCandidate?.job_seekers?.full_name || 'this candidate'}
        onReject={confirmReject}
      />

      {/* Bulk Status Update Modal */}
      <BulkStatusUpdateModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedCount={selectedIds.size}
        onBulkUpdate={handleBulkUpdate}
        isLoading={isBulkUpdating}
      />

      {/* Applicant Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setDetailApplicant(null)
        }}
        title="Applicant Details"
        size="lg"
      >
        {detailApplicant && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-8 w-8 text-primary-600" />
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
                <div className="flex items-center gap-2 mt-1">
                  <ApplicationStatusBadge status={detailApplicant.status} />
                  <span className="text-sm text-gray-500">
                    Applied {formatDate(detailApplicant.applied_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills Analysis */}
            {detailApplicant.matchScore && (
              <CandidateSkillsAnalysis matchResult={detailApplicant.matchScore} />
            )}

            {/* Score Breakdown */}
            {detailApplicant.matchScore && (
              <CandidateScoreBreakdown
                matchResult={detailApplicant.matchScore}
                candidateName={detailApplicant.job_seekers?.full_name || 'Candidate'}
                jobTitle={job?.title || 'this position'}
              />
            )}

            {/* Status History Timeline */}
            <ApplicationStatusTimeline
              applicationId={detailApplicant.id}
              currentStatus={detailApplicant.status}
              appliedAt={detailApplicant.applied_at}
              compact={true}
            />

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {detailApplicant.job_seekers?.location && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                  {detailApplicant.job_seekers.location}
                </div>
              )}
              {detailApplicant.job_seekers?.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-5 w-5 mr-2 text-gray-400" />
                  {detailApplicant.job_seekers.phone}
                </div>
              )}
            </div>

            {/* Bio */}
            {detailApplicant.job_seekers?.bio && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">About</h4>
                <p className="text-gray-600">{detailApplicant.job_seekers.bio}</p>
              </div>
            )}

            {/* Salary & Remote */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {detailApplicant.job_seekers?.expected_salary && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Expected Salary</h4>
                  <p className="text-gray-600">{detailApplicant.job_seekers.expected_salary}</p>
                </div>
              )}
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Remote Work</h4>
                <p className="text-gray-600">
                  {detailApplicant.job_seekers?.remote_ok ? 'Open to remote' : 'Prefers on-site'}
                </p>
              </div>
            </div>

            {/* Cover Letter */}
            {detailApplicant.cover_letter && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Cover Letter</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {detailApplicant.cover_letter}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {getResumeUrl(detailApplicant) && (
                <a
                  href={getResumeUrl(detailApplicant)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    View Resume
                  </Button>
                </a>
              )}
              <Link to={`/company/messages/${detailApplicant.job_seekers?.user_id}`}>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </Link>
              {detailApplicant.status !== 'withdrawn' && (
                <Button
                  onClick={() => {
                    setDetailModalOpen(false)
                    setDetailApplicant(null)
                    openStatusModal(detailApplicant)
                  }}
                >
                  Update Status
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
