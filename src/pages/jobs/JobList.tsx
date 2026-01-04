import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Search, MapPin, Building2, Clock, Bookmark } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Button, Input, Select, Card, Badge, Spinner, EmptyState, MatchScoreBadge } from '@/components/ui'
import { matchScoreService } from '@/services/matchScoreService'
import type { JobPosting, Company, MatchScoreResult } from '@/types'
import toast from 'react-hot-toast'

type JobWithCompany = JobPosting & { companies: Company }

export function JobList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, jobSeeker } = useAuthStore()
  const [jobs, setJobs] = useState<JobWithCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [bookmarkedJobs, setBookmarkedJobs] = useState<Set<string>>(new Set())
  const [togglingBookmark, setTogglingBookmark] = useState<string | null>(null)
  const [matchScores, setMatchScores] = useState<Map<string, MatchScoreResult>>(new Map())
  const [isCalculatingScores, setIsCalculatingScores] = useState(false)
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    job_type: searchParams.get('job_type') || '',
    location: searchParams.get('location') || '',
    remote_ok: searchParams.get('remote_ok') === 'true',
  })

  useEffect(() => {
    fetchJobs()
  }, [searchParams])

  useEffect(() => {
    if (jobSeeker) {
      fetchBookmarks()
    }
  }, [jobSeeker])

  // Calculate match scores when jobs are loaded and user is a job seeker
  useEffect(() => {
    if (jobs.length > 0 && jobSeeker && !isCalculatingScores) {
      calculateMatchScores()
    }
  }, [jobs, jobSeeker])

  const calculateMatchScores = async () => {
    if (!jobSeeker) return

    setIsCalculatingScores(true)
    try {
      const jobIds = jobs.map((j) => j.id)
      const scores = await matchScoreService.calculateScoresForJobs(jobSeeker.id, jobIds)
      setMatchScores(scores)
    } catch (error) {
      console.error('Error calculating match scores:', error)
    } finally {
      setIsCalculatingScores(false)
    }
  }

  const fetchJobs = async () => {
    setIsLoading(true)

    let query = supabase
      .from('job_postings')
      .select(`
        *,
        companies (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const keyword = searchParams.get('keyword')
    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
    }

    const job_type = searchParams.get('job_type') as 'full-time' | 'part-time' | 'contract' | 'internship' | null
    if (job_type) {
      query = query.eq('job_type', job_type)
    }

    const location = searchParams.get('location')
    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    const remote_ok = searchParams.get('remote_ok')
    if (remote_ok === 'true') {
      query = query.eq('remote_ok', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching jobs:', error)
    } else {
      setJobs(data as JobWithCompany[] || [])
    }

    setIsLoading(false)
  }

  const fetchBookmarks = async () => {
    if (!jobSeeker) return

    const { data } = await supabase
      .from('bookmarks')
      .select('job_posting_id')
      .eq('job_seeker_id', jobSeeker.id)

    if (data) {
      setBookmarkedJobs(new Set(data.map(b => b.job_posting_id)))
    }
  }

  const toggleBookmark = async (e: React.MouseEvent, jobId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      navigate('/login')
      return
    }

    if (!jobSeeker) {
      toast.error('Only job seekers can bookmark jobs')
      return
    }

    setTogglingBookmark(jobId)

    try {
      if (bookmarkedJobs.has(jobId)) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('job_posting_id', jobId)
          .eq('job_seeker_id', jobSeeker.id)

        if (error) throw error

        const newBookmarks = new Set(bookmarkedJobs)
        newBookmarks.delete(jobId)
        setBookmarkedJobs(newBookmarks)
        toast.success('Bookmark removed')
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            job_posting_id: jobId,
            job_seeker_id: jobSeeker.id,
          })

        if (error) throw error

        const newBookmarks = new Set(bookmarkedJobs)
        newBookmarks.add(jobId)
        setBookmarkedJobs(newBookmarks)
        toast.success('Job bookmarked')
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
      toast.error('Failed to update bookmark')
    } finally {
      setTogglingBookmark(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (filters.keyword) params.set('keyword', filters.keyword)
    if (filters.job_type) params.set('job_type', filters.job_type)
    if (filters.location) params.set('location', filters.location)
    if (filters.remote_ok) params.set('remote_ok', 'true')
    setSearchParams(params)
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    return `Up to $${max?.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Jobs</h1>

      {/* Search Filters */}
      <Card className="mb-8">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Job title or keyword"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            />
            <Select
              value={filters.job_type}
              onChange={(e) => setFilters({ ...filters, job_type: e.target.value })}
              options={[
                { value: 'full-time', label: 'Full-time' },
                { value: 'part-time', label: 'Part-time' },
                { value: 'contract', label: 'Contract' },
                { value: 'internship', label: 'Internship' },
              ]}
              placeholder="Job Type"
            />
            <Input
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.remote_ok}
                  onChange={(e) => setFilters({ ...filters, remote_ok: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600"
                />
                <span className="ml-2 text-sm">Remote OK</span>
              </label>
              <Button type="submit">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Job Listings */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No jobs found"
          description="Try adjusting your search filters or check back later for new opportunities."
          action={
            <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 hover:text-primary-600">
                          {job.title}
                        </h2>
                        <p className="text-gray-600">{job.companies?.company_name}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                          {job.location && (
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {job.location}
                            </span>
                          )}
                          {job.remote_ok && (
                            <Badge variant="success">Remote OK</Badge>
                          )}
                          {job.job_type && (
                            <Badge>{job.job_type}</Badge>
                          )}
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDate(job.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {matchScores.get(job.id) && (
                      <MatchScoreBadge score={matchScores.get(job.id)!.score} size="sm" />
                    )}
                    <div className="text-right">
                      {formatSalary(job.salary_min, job.salary_max) && (
                        <p className="font-semibold text-gray-900">
                          {formatSalary(job.salary_min, job.salary_max)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => toggleBookmark(e, job.id)}
                      disabled={togglingBookmark === job.id}
                      className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                        bookmarkedJobs.has(job.id) ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    >
                      <Bookmark className={`h-5 w-5 ${bookmarkedJobs.has(job.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
