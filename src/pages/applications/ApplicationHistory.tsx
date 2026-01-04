import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Building2, Calendar, ExternalLink, XCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, Button, Select, Spinner, EmptyState, ApplicationStatusBadge, ApplicationProgressBar, ApplicationStatusTimeline, Modal } from '@/components/ui'
import type { Application, JobPosting, Company } from '@/types'
import toast from 'react-hot-toast'

type ApplicationWithJob = Application & {
  job_postings: JobPosting & { companies: Company }
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
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
]

export function ApplicationHistory() {
  const { jobSeeker } = useAuthStore()
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  useEffect(() => {
    if (jobSeeker) {
      fetchApplications()
    }
  }, [jobSeeker, statusFilter, sortOrder])

  const fetchApplications = async () => {
    if (!jobSeeker) return

    setIsLoading(true)

    let query = supabase
      .from('applications')
      .select(`
        *,
        job_postings (
          *,
          companies (*)
        )
      `)
      .eq('job_seeker_id', jobSeeker.id)

    if (statusFilter) {
      query = query.eq('status', statusFilter as 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn')
    }

    query = query.order('applied_at', { ascending: sortOrder === 'oldest' })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to load applications')
    } else {
      setApplications(data as ApplicationWithJob[] || [])
    }

    setIsLoading(false)
  }

  const handleWithdraw = async () => {
    if (!selectedApplication) return

    setIsWithdrawing(true)

    const { error } = await supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', selectedApplication.id)

    if (error) {
      toast.error('Failed to withdraw application')
      console.error(error)
    } else {
      toast.success('Application withdrawn')
      setApplications(
        applications.map((app) =>
          app.id === selectedApplication.id
            ? { ...app, status: 'withdrawn' as const }
            : app
        )
      )
    }

    setIsWithdrawing(false)
    setWithdrawModalOpen(false)
    setSelectedApplication(null)
  }

  const openWithdrawModal = (application: ApplicationWithJob) => {
    setSelectedApplication(application)
    setWithdrawModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return '1 week ago'
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 60) return '1 month ago'
    return `${Math.floor(diffDays / 30)} months ago`
  }

  const isStale = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return diffDays >= 14
  }

  const canWithdraw = (status: string) => {
    return ['pending', 'reviewing'].includes(status)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600">Track and manage your job applications</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              options={sortOptions}
            />
          </div>
        </div>
      </Card>

      {/* Applications List */}
      {applications.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-12 w-12" />}
          title={statusFilter ? 'No applications found' : "You haven't applied to any jobs yet"}
          description={
            statusFilter
              ? 'Try changing the filter to see more applications.'
              : 'Start exploring job opportunities and apply to positions that match your skills.'
          }
          action={
            statusFilter ? (
              <Button variant="outline" onClick={() => setStatusFilter('')}>
                Clear Filter
              </Button>
            ) : (
              <Link to="/jobs">
                <Button>Browse Jobs</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Job Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/jobs/${application.job_posting_id}`}
                      className="font-semibold text-gray-900 hover:text-primary-600 flex items-center gap-1"
                    >
                      {application.job_postings?.title}
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <p className="text-gray-600">
                      {application.job_postings?.companies?.company_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Applied {formatDate(application.applied_at)}
                      </span>
                      {application.job_postings?.location && (
                        <span>{application.job_postings.location}</span>
                      )}
                    </div>
                    {/* Last Updated */}
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className={`h-4 w-4 ${isStale(application.updated_at) ? 'text-yellow-500' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isStale(application.updated_at) ? 'text-yellow-600' : 'text-gray-500'}`}>
                        Last updated {formatRelativeTime(application.updated_at)}
                        {isStale(application.updated_at) && ' (No recent activity)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col items-end gap-2">
                  <ApplicationStatusBadge status={application.status} />
                  {canWithdraw(application.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openWithdrawModal(application)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 pt-4 border-t">
                <ApplicationProgressBar
                  status={application.status}
                  size="sm"
                  showLabels={true}
                />
              </div>

              {/* Status History Timeline */}
              <div className="mt-4 pt-4 border-t">
                <ApplicationStatusTimeline
                  applicationId={application.id}
                  currentStatus={application.status}
                  appliedAt={application.applied_at}
                  compact={true}
                />
              </div>

              {/* Cover Letter Preview */}
              {application.cover_letter && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Cover Letter: </span>
                    {application.cover_letter.length > 150
                      ? `${application.cover_letter.substring(0, 150)}...`
                      : application.cover_letter}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      <Modal
        isOpen={withdrawModalOpen}
        onClose={() => {
          setWithdrawModalOpen(false)
          setSelectedApplication(null)
        }}
        title="Withdraw Application"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to withdraw your application for{' '}
            <strong>{selectedApplication?.job_postings?.title}</strong> at{' '}
            <strong>{selectedApplication?.job_postings?.companies?.company_name}</strong>?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone. You will need to apply again if you change your mind.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawModalOpen(false)
                setSelectedApplication(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleWithdraw}
              isLoading={isWithdrawing}
            >
              Withdraw Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
