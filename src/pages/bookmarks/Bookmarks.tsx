import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, MapPin, Building2, DollarSign, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, Button, Spinner, EmptyState, Badge, Modal } from '@/components/ui'
import type { Bookmark as BookmarkType, JobPosting, Company } from '@/types'
import toast from 'react-hot-toast'

type BookmarkWithJob = BookmarkType & {
  job_postings: JobPosting & {
    companies: Company
  }
}

export function Bookmarks() {
  const { jobSeeker } = useAuthStore()
  const [bookmarks, setBookmarks] = useState<BookmarkWithJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [bookmarkToRemove, setBookmarkToRemove] = useState<BookmarkWithJob | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (jobSeeker) {
      fetchBookmarks()
    }
  }, [jobSeeker])

  const fetchBookmarks = async () => {
    if (!jobSeeker) return

    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          *,
          job_postings (
            *,
            companies (*)
          )
        `)
        .eq('job_seeker_id', jobSeeker.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filter out bookmarks where job posting might have been deleted
      const validBookmarks = (data || []).filter(b => b.job_postings) as BookmarkWithJob[]
      setBookmarks(validBookmarks)
    } catch (error) {
      console.error('Error fetching bookmarks:', error)
      toast.error('Failed to load bookmarks')
    } finally {
      setIsLoading(false)
    }
  }

  const openRemoveModal = (bookmark: BookmarkWithJob) => {
    setBookmarkToRemove(bookmark)
    setRemoveModalOpen(true)
  }

  const handleRemove = async () => {
    if (!bookmarkToRemove) return

    setIsRemoving(true)

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkToRemove.id)

      if (error) throw error

      toast.success('Bookmark removed')
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkToRemove.id))
    } catch (error) {
      console.error('Error removing bookmark:', error)
      toast.error('Failed to remove bookmark')
    } finally {
      setIsRemoving(false)
      setRemoveModalOpen(false)
      setBookmarkToRemove(null)
    }
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
    return null
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Jobs</h1>
        <p className="text-gray-600">Jobs you've bookmarked for later</p>
      </div>

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-12 w-12" />}
          title="No saved jobs"
          description="When you bookmark jobs you're interested in, they'll appear here."
          action={
            <Link to="/jobs">
              <Button>Browse Jobs</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => {
            const job = bookmark.job_postings
            const salary = formatSalary(job.salary_min, job.salary_max)

            return (
              <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Job Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {job.companies?.logo_url ? (
                        <img
                          src={job.companies.logo_url}
                          alt={job.companies.company_name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {job.title}
                      </Link>
                      <p className="text-sm text-gray-600">{job.companies?.company_name}</p>
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
                        {salary && (
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {salary}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Saved {formatDate(bookmark.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!job.is_active && (
                      <Badge variant="gray" size="sm">No longer active</Badge>
                    )}
                    <Link to={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm">
                        View Job
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRemoveModal(bookmark)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={removeModalOpen}
        onClose={() => {
          setRemoveModalOpen(false)
          setBookmarkToRemove(null)
        }}
        title="Remove Bookmark"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to remove <strong>{bookmarkToRemove?.job_postings?.title}</strong> from your saved jobs?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRemoveModalOpen(false)
                setBookmarkToRemove(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRemove}
              isLoading={isRemoving}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
