import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Users, FileText, TrendingUp, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, CardTitle, Button, Spinner, ApplicationStatusBadge } from '@/components/ui'
import type { Application, JobPosting, JobSeeker } from '@/types'

type ApplicationWithDetails = Application & {
  job_seekers: JobSeeker
  job_postings: JobPosting
}

export function CompanyDashboard() {
  const { company } = useAuthStore()
  const [recentApplications, setRecentApplications] = useState<ApplicationWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    newApplications: 0,
    interviews: 0,
  })

  useEffect(() => {
    if (company) {
      fetchDashboardData()
    }
  }, [company])

  const fetchDashboardData = async () => {
    if (!company) return

    // Get job postings
    const { data: jobs } = await supabase
      .from('job_postings')
      .select('id, is_active')
      .eq('company_id', company.id)

    const jobIds = jobs?.map(j => j.id) || []

    if (jobIds.length > 0) {
      // Get applications
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          *,
          job_seekers (*),
          job_postings (*)
        `)
        .in('job_posting_id', jobIds)
        .order('applied_at', { ascending: false })

      if (applications) {
        setRecentApplications(applications.slice(0, 5) as ApplicationWithDetails[])

        // Calculate stats
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        setStats({
          activeJobs: jobs?.filter(j => j.is_active).length || 0,
          totalApplications: applications.length,
          newApplications: applications.filter(a => new Date(a.applied_at) > weekAgo).length,
          interviews: applications.filter(a => a.status === 'interview').length,
        })
      }
    }

    setIsLoading(false)
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
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{company?.company_name ? `, ${company.company_name}` : ''}!
        </h1>
        <p className="text-gray-600">Here's an overview of your hiring activity.</p>
      </div>

      {/* Profile Completion Reminder */}
      {!company?.description && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-yellow-900">Complete your company profile</h3>
              <p className="text-sm text-yellow-700">
                Add a description to attract more candidates.
              </p>
            </div>
            <Link to="/company/profile">
              <Button size="sm">Complete Profile</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.activeJobs}</p>
              <p className="text-sm text-gray-600">Active Jobs</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.totalApplications}</p>
              <p className="text-sm text-gray-600">Total Applicants</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.newApplications}</p>
              <p className="text-sm text-gray-600">New (7 days)</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.interviews}</p>
              <p className="text-sm text-gray-600">Interviews</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Recent Applications</CardTitle>
          <Link to="/company/jobs">
            <Button variant="ghost" size="sm">View All Jobs</Button>
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No applications yet.</p>
            <Link to="/company/jobs/new" className="mt-4 inline-block">
              <Button>Post a Job</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {app.job_seekers?.full_name || 'Anonymous'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Applied for {app.job_postings?.title}
                  </p>
                </div>
                <div className="text-right">
                  <ApplicationStatusBadge status={app.status} />
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardTitle className="mb-4">Quick Actions</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Link to="/company/jobs/new">
            <Button>Post New Job</Button>
          </Link>
          <Link to="/company/jobs">
            <Button variant="outline">Manage Jobs</Button>
          </Link>
          <Link to="/company/analytics">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Pipeline Analytics
            </Button>
          </Link>
          <Link to="/company/profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
