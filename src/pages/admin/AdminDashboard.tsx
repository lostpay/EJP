import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, FileText, TrendingUp, Building2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Button, Spinner } from '@/components/ui'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalUsers: number
  adminCount: number
  companyCount: number
  jobSeekerCount: number
  totalJobPostings: number
  activeJobPostings: number
  totalApplications: number
  newUsersThisWeek: number
}

type RecentUser = Profile

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    adminCount: 0,
    companyCount: 0,
    jobSeekerCount: 0,
    totalJobPostings: 0,
    activeJobPostings: 0,
    totalApplications: 0,
    newUsersThisWeek: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Calculate user stats
      const adminCount = profiles?.filter(p => p.role === 'admin').length || 0
      const companyCount = profiles?.filter(p => p.role === 'company').length || 0
      const jobSeekerCount = profiles?.filter(p => p.role === 'jobseeker').length || 0

      // Calculate new users this week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const newUsersThisWeek = profiles?.filter(p => new Date(p.created_at) > weekAgo).length || 0

      // Get recent users
      setRecentUsers(profiles?.slice(0, 5) || [])

      // Fetch job postings count
      const { count: totalJobPostings } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })

      // Fetch active job postings count
      const { count: activeJobPostings } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Fetch applications count
      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalUsers: profiles?.length || 0,
        adminCount,
        companyCount,
        jobSeekerCount,
        totalJobPostings: totalJobPostings || 0,
        activeJobPostings: activeJobPostings || 0,
        totalApplications: totalApplications || 0,
        newUsersThisWeek,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Users className="h-4 w-4 text-purple-600" />
      case 'company':
        return <Building2 className="h-4 w-4 text-blue-600" />
      case 'jobseeker':
        return <User className="h-4 w-4 text-green-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'company':
        return 'bg-blue-100 text-blue-800'
      case 'jobseeker':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of platform statistics and activity.</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.activeJobPostings}</p>
              <p className="text-sm text-gray-600">Active Jobs</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.totalApplications}</p>
              <p className="text-sm text-gray-600">Applications</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.newUsersThisWeek}</p>
              <p className="text-sm text-gray-600">New (7 days)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* User Breakdown */}
      <Card>
        <CardTitle className="mb-4">User Breakdown</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center p-4 bg-purple-50 rounded-lg">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-xl font-bold text-purple-900">{stats.adminCount}</p>
              <p className="text-sm text-purple-700">Admins</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xl font-bold text-blue-900">{stats.companyCount}</p>
              <p className="text-sm text-blue-700">Companies</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-xl font-bold text-green-900">{stats.jobSeekerCount}</p>
              <p className="text-sm text-green-700">Job Seekers</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Job Postings Stats */}
      <Card>
        <CardTitle className="mb-4">Job Postings Overview</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Total Job Postings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalJobPostings}</p>
            </div>
            <Briefcase className="h-8 w-8 text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Active Job Postings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeJobPostings}</p>
            </div>
            <Briefcase className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </Card>

      {/* Recent Users */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Recent Users</CardTitle>
          <Link to="/admin/users">
            <Button variant="ghost" size="sm">View All Users</Button>
          </Link>
        </div>

        {recentUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No users registered yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.email}</p>
                    <p className="text-sm text-gray-500">
                      Registered {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                  {!user.is_active && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
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
          <Link to="/admin/users">
            <Button>
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </Link>
          <Link to="/admin/jobs">
            <Button variant="outline">
              <Briefcase className="h-4 w-4 mr-2" />
              Manage Jobs
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
