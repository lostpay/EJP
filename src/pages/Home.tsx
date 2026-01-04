import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Briefcase, Users, TrendingUp, MapPin, Clock, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, Input, Card, Badge, Spinner } from '@/components/ui'
import type { JobPosting, Company } from '@/types'

type JobWithCompany = JobPosting & { companies: Company }

export function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [recentJobs, setRecentJobs] = useState<JobWithCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRecentJobs()
  }, [])

  const fetchRecentJobs = async () => {
    const { data, error } = await supabase
      .from('job_postings')
      .select(`
        *,
        companies (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6)

    if (!error && data) {
      setRecentJobs(data as JobWithCompany[])
    }
    setIsLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/jobs?keyword=${encodeURIComponent(searchQuery)}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Find Your Dream Engineering Job
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Connect with top tech companies looking for talented engineers like you.
              Search by skills, location, and more.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Job title, skills, or company"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12"
                  />
                </div>
                <Button type="submit" size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
                  <Search className="h-5 w-5 mr-2" />
                  Search Jobs
                </Button>
              </div>
            </form>

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-primary-200">Popular:</span>
              <Link to="/jobs?keyword=frontend" className="text-white hover:underline">Frontend</Link>
              <Link to="/jobs?keyword=backend" className="text-white hover:underline">Backend</Link>
              <Link to="/jobs?keyword=fullstack" className="text-white hover:underline">Full Stack</Link>
              <Link to="/jobs?keyword=devops" className="text-white hover:underline">DevOps</Link>
              <Link to="/jobs?keyword=react" className="text-white hover:underline">React</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Jobs Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recent Job Postings</h2>
              <p className="text-gray-600">Discover the latest opportunities</p>
            </div>
            <Link to="/jobs">
              <Button variant="outline">
                View All Jobs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No job postings yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentJobs.map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 hover:text-primary-600 mb-1">
                          {job.title}
                        </h3>
                        <p className="text-gray-600 mb-3">{job.companies?.company_name}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {job.location && (
                            <span className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-1" />
                              {job.location}
                            </span>
                          )}
                          {job.remote_ok && (
                            <Badge variant="success" size="sm">Remote</Badge>
                          )}
                          {job.job_type && (
                            <Badge size="sm">{job.job_type}</Badge>
                          )}
                        </div>
                        {(job.salary_min || job.salary_max) && (
                          <p className="text-sm font-medium text-gray-900">
                            {job.salary_min && job.salary_max
                              ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
                              : job.salary_min
                              ? `From $${job.salary_min.toLocaleString()}`
                              : `Up to $${job.salary_max?.toLocaleString()}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-4 pt-4 border-t">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(job.created_at)}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Engineer Job Portal?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We specialize in connecting engineers with the best opportunities in tech.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Skill-Based Search</h3>
              <p className="text-gray-600">
                Find jobs that match your technical skills and experience level.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Companies</h3>
              <p className="text-gray-600">
                Connect with verified companies looking for engineering talent.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Applications</h3>
              <p className="text-gray-600">
                Easily manage and track all your job applications in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Job Seekers */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-8 border border-primary-200">
              <Users className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-2xl font-bold mb-4">For Job Seekers</h3>
              <ul className="text-gray-700 mb-6 space-y-2">
                <li>Create your professional profile</li>
                <li>Showcase your technical skills</li>
                <li>Apply to jobs with one click</li>
                <li>Track your application status</li>
              </ul>
              <Link to="/register">
                <Button size="lg">Create Account</Button>
              </Link>
            </div>

            {/* For Companies */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border border-gray-200">
              <Briefcase className="h-12 w-12 text-gray-700 mb-4" />
              <h3 className="text-2xl font-bold mb-4">For Companies</h3>
              <ul className="text-gray-700 mb-6 space-y-2">
                <li>Post unlimited job openings</li>
                <li>Find candidates by skills</li>
                <li>Review applications easily</li>
                <li>Communicate with applicants</li>
              </ul>
              <Link to="/register">
                <Button size="lg" variant="outline">Post a Job</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
