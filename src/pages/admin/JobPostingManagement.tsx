import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Briefcase, Building2, MapPin, Eye, EyeOff, Trash2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, Button, Input, Select, Spinner, EmptyState, Modal, Badge } from '@/components/ui'
import type { JobPosting, Company } from '@/types'
import toast from 'react-hot-toast'

type JobPostingWithCompany = JobPosting & {
  companies: Company
  application_count: number
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const JOBS_PER_PAGE = 10

export function JobPostingManagement() {
  const [jobs, setJobs] = useState<JobPostingWithCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobPostingWithCompany | null>(null)

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<JobPostingWithCompany | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle status loading
  const [togglingJobId, setTogglingJobId] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [searchQuery, statusFilter, currentPage])

  const fetchJobs = async () => {
    setIsLoading(true)

    try {
      // Build the query
      let query = supabase
        .from('job_postings')
        .select(`
          *,
          companies (*)
        `, { count: 'exact' })

      // Apply search filter (search in title or company name)
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%`)
      }

      // Apply status filter
      if (statusFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false)
      }

      // Apply pagination
      const from = (currentPage - 1) * JOBS_PER_PAGE
      const to = from + JOBS_PER_PAGE - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Get application counts for each job
      const jobsWithCounts = await Promise.all(
        (data || []).map(async (job) => {
          const { count: appCount } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('job_posting_id', job.id)

          return {
            ...job,
            application_count: appCount || 0,
          } as JobPostingWithCompany
        })
      )

      setJobs(jobsWithCounts)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      toast.error('Failed to load job postings')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleJobStatus = async (job: JobPostingWithCompany) => {
    setTogglingJobId(job.id)

    const { error } = await supabase
      .from('job_postings')
      .update({ is_active: !job.is_active })
      .eq('id', job.id)

    if (error) {
      toast.error('Failed to update job status')
      console.error(error)
    } else {
      toast.success(job.is_active ? 'Job deactivated' : 'Job activated')
      setJobs(
        jobs.map((j) =>
          j.id === job.id ? { ...j, is_active: !j.is_active } : j
        )
      )
    }

    setTogglingJobId(null)
  }

  const openDeleteModal = (job: JobPostingWithCompany) => {
    setJobToDelete(job)
    setDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!jobToDelete) return

    setIsDeleting(true)

    try {
      // Delete related job_posting_skills
      await supabase
        .from('job_posting_skills')
        .delete()
        .eq('job_posting_id', jobToDelete.id)

      // Delete related applications
      await supabase
        .from('applications')
        .delete()
        .eq('job_posting_id', jobToDelete.id)

      // Delete the job posting
      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', jobToDelete.id)

      if (error) throw error

      toast.success('Job posting deleted successfully')
      setJobs(jobs.filter((j) => j.id !== jobToDelete.id))
      setTotalCount(prev => prev - 1)
    } catch (error) {
      console.error('Error deleting job:', error)
      toast.error('Failed to delete job posting')
    } finally {
      setIsDeleting(false)
      setDeleteModalOpen(false)
      setJobToDelete(null)
    }
  }

  const openDetailModal = (job: JobPostingWithCompany) => {
    setSelectedJob(job)
    setDetailModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Not specified'
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
    return 'Not specified'
  }

  const totalPages = Math.ceil(totalCount / JOBS_PER_PAGE)

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Posting Management</h1>
        <p className="text-gray-600">Manage all job postings on the platform</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search by Title
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search job postings..."
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              options={statusOptions}
            />
          </div>
        </div>
      </Card>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {jobs.length} of {totalCount} job postings
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-12 w-12" />}
          title="No job postings found"
          description={
            searchQuery || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'No job postings have been created yet.'
          }
          action={
            (searchQuery || statusFilter) ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('')
                  setCurrentPage(1)
                }}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Job Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Briefcase className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <Badge variant={job.is_active ? 'success' : 'gray'} size="sm">
                            {job.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Building2 className="h-4 w-4" />
                          <span>{job.companies?.company_name || 'Unknown Company'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                          {job.location && (
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {job.location}
                            </span>
                          )}
                          {job.remote_ok && (
                            <Badge variant="primary" size="sm">Remote</Badge>
                          )}
                          {job.job_type && (
                            <span className="capitalize">{job.job_type}</span>
                          )}
                          <span>{job.application_count} applicant{job.application_count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetailModal(job)}
                      title="View Details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Link to={`/jobs/${job.id}`} target="_blank">
                      <Button variant="ghost" size="sm" title="View Public Page">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleJobStatus(job)}
                      disabled={togglingJobId === job.id}
                      title={job.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {togglingJobId === job.id ? (
                        <Spinner size="sm" />
                      ) : job.is_active ? (
                        <EyeOff className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(job)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Job"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Job Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedJob(null)
        }}
        title="Job Details"
        size="lg"
      >
        {selectedJob && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold text-gray-900">{selectedJob.title}</h3>
                <Badge variant={selectedJob.is_active ? 'success' : 'gray'}>
                  {selectedJob.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="h-5 w-5" />
                <span>{selectedJob.companies?.company_name}</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{selectedJob.location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Job Type</p>
                <p className="font-medium capitalize">{selectedJob.job_type || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Remote Work</p>
                <p className="font-medium">{selectedJob.remote_ok ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Salary Range</p>
                <p className="font-medium">{formatSalary(selectedJob.salary_min, selectedJob.salary_max)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Posted</p>
                <p className="font-medium">{formatDate(selectedJob.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Applications</p>
                <p className="font-medium">{selectedJob.application_count}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <p className="text-gray-600 whitespace-pre-wrap">{selectedJob.description}</p>
              </div>
            </div>

            {/* Company Info */}
            {selectedJob.companies && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Company Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Company Name</p>
                    <p className="font-medium">{selectedJob.companies.company_name}</p>
                  </div>
                  {selectedJob.companies.location && (
                    <div>
                      <p className="text-gray-500">Company Location</p>
                      <p className="font-medium">{selectedJob.companies.location}</p>
                    </div>
                  )}
                  {selectedJob.companies.website && (
                    <div>
                      <p className="text-gray-500">Website</p>
                      <a
                        href={selectedJob.companies.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {selectedJob.companies.website}
                      </a>
                    </div>
                  )}
                  {selectedJob.companies.contact_email && (
                    <div>
                      <p className="text-gray-500">Contact Email</p>
                      <p className="font-medium">{selectedJob.companies.contact_email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Link to={`/jobs/${selectedJob.id}`} target="_blank">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Page
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  toggleJobStatus(selectedJob)
                  setSelectedJob({ ...selectedJob, is_active: !selectedJob.is_active })
                }}
                disabled={togglingJobId === selectedJob.id}
              >
                {selectedJob.is_active ? 'Deactivate' : 'Activate'} Job
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDetailModalOpen(false)
                  openDeleteModal(selectedJob)
                }}
              >
                Delete Job
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setJobToDelete(null)
        }}
        title="Delete Job Posting"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{jobToDelete?.title}</strong>?
          </p>
          {jobToDelete && jobToDelete.application_count > 0 && (
            <p className="text-sm text-red-600">
              This job has {jobToDelete.application_count} application(s).
              Deleting it will also remove all associated applications.
            </p>
          )}
          <p className="text-sm text-gray-500">
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setJobToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete Job
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
