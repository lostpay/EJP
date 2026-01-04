import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, Button, Badge, Spinner, EmptyState, Modal } from '@/components/ui'
import { Plus, Edit, Trash2, Users, Eye, EyeOff, Copy, MapPin } from 'lucide-react'
import type { JobPosting } from '@/types'
import toast from 'react-hot-toast'

type JobPostingWithStats = JobPosting & {
  application_count: number
}

export function ManageJobPostings() {
  const { company } = useAuthStore()
  const [jobs, setJobs] = useState<JobPostingWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobPostingWithStats | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (company) {
      fetchJobs()
    }
  }, [company])

  const fetchJobs = async () => {
    if (!company) return

    setIsLoading(true)

    // Get jobs with application count
    const { data: jobsData, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jobs:', error)
      toast.error('Failed to load job postings')
      setIsLoading(false)
      return
    }

    // Get application counts for each job
    const jobsWithCounts = await Promise.all(
      (jobsData || []).map(async (job) => {
        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('job_posting_id', job.id)

        return {
          ...job,
          application_count: count || 0,
        }
      })
    )

    setJobs(jobsWithCounts)
    setIsLoading(false)
  }

  const toggleJobStatus = async (job: JobPostingWithStats) => {
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
  }

  const duplicateJob = async (job: JobPostingWithStats) => {
    if (!company) return

    const { data, error } = await supabase
      .from('job_postings')
      .insert({
        company_id: company.id,
        title: `${job.title} (Copy)`,
        description: job.description,
        job_type: job.job_type,
        location: job.location,
        remote_ok: job.remote_ok,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        is_active: false,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to duplicate job')
      console.error(error)
    } else if (data) {
      toast.success('Job duplicated as draft')
      setJobs([{ ...data, application_count: 0 }, ...jobs])
    }
  }

  const openDeleteModal = (job: JobPostingWithStats) => {
    setSelectedJob(job)
    setDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedJob) return

    setIsDeleting(true)

    // First delete related job_posting_skills
    await supabase
      .from('job_posting_skills')
      .delete()
      .eq('job_posting_id', selectedJob.id)

    // Then delete the job posting
    const { error } = await supabase
      .from('job_postings')
      .delete()
      .eq('id', selectedJob.id)

    if (error) {
      toast.error('Failed to delete job posting')
      console.error(error)
    } else {
      toast.success('Job posting deleted')
      setJobs(jobs.filter((j) => j.id !== selectedJob.id))
    }

    setIsDeleting(false)
    setDeleteModalOpen(false)
    setSelectedJob(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
          <p className="text-gray-600">Manage your company's job listings</p>
        </div>
        <Link to="/company/jobs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No job postings yet"
          description="Create your first job posting to start attracting candidates."
          action={
            <Link to="/company/jobs/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Job Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                        <Badge variant={job.is_active ? 'success' : 'gray'}>
                          {job.is_active ? 'Active' : 'Draft'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
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
                        <span>Posted {formatDate(job.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                  <Link
                    to={`/company/jobs/${job.id}/applicants`}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary-600"
                  >
                    <Users className="h-5 w-5" />
                    <div className="text-center">
                      <p className="text-lg font-semibold">{job.application_count}</p>
                      <p className="text-xs">Applicants</p>
                    </div>
                  </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleJobStatus(job)}
                    title={job.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {job.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Link to={`/company/jobs/${job.id}/edit`}>
                    <Button variant="ghost" size="sm" title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateJob(job)}
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteModal(job)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedJob(null)
        }}
        title="Delete Job Posting"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedJob?.title}</strong>?
          </p>
          {selectedJob && selectedJob.application_count > 0 && (
            <p className="text-sm text-red-600">
              This job has {selectedJob.application_count} application(s).
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
                setSelectedJob(null)
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
