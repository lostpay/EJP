import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  FileText,
  Clock,
  CheckCircle,
  Sparkles,
  Building2,
  MapPin,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, CardTitle, Button, Spinner, ApplicationStatusBadge, MatchScoreBadge } from '@/components/ui'
import { matchScoreService, type JobRecommendation } from '@/services/matchScoreService'
import {
  analyticsService,
  type ApplicationStats,
  type CareerMetrics,
  type ApplicationActivity,
  type WeeklyGoal,
} from '@/services/analyticsService'
import {
  ApplicationStatusChart,
  ApplicationActivityChart,
  CareerMetricsCard,
  WeeklyGoalCard,
  PersonalizedInsightsCard,
} from '@/components/analytics'
import type { Application, JobPosting, Company } from '@/types'

type ApplicationWithJob = Application & {
  job_postings: JobPosting & { companies: Company }
}

export function JobSeekerDashboard() {
  const { jobSeeker } = useAuthStore()
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true)
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    pending: 0,
    reviewing: 0,
    interview: 0,
    offered: 0,
    rejected: 0,
    withdrawn: 0,
  })
  const [careerMetrics, setCareerMetrics] = useState<CareerMetrics | null>(null)
  const [activityData, setActivityData] = useState<ApplicationActivity[]>([])
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal>({ target: 10, current: 0, percentage: 0 })
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview')

  useEffect(() => {
    if (jobSeeker) {
      fetchApplications()
      fetchRecommendations()
      fetchAnalytics()
    }
  }, [jobSeeker])

  const fetchAnalytics = async () => {
    if (!jobSeeker) return

    try {
      const [metrics, activity, goal] = await Promise.all([
        analyticsService.getCareerMetrics(jobSeeker.id),
        analyticsService.getApplicationActivity(jobSeeker.id, 30),
        analyticsService.getWeeklyGoalProgress(jobSeeker.id),
      ])

      setCareerMetrics(metrics)
      setActivityData(activity)
      setWeeklyGoal(goal)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const fetchRecommendations = async () => {
    if (!jobSeeker) return

    setIsLoadingRecommendations(true)
    try {
      const recs = await matchScoreService.getRecommendations(jobSeeker.id, 5)
      setRecommendations(recs)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const fetchApplications = async () => {
    if (!jobSeeker) return

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_postings (
          *,
          companies (*)
        )
      `)
      .eq('job_seeker_id', jobSeeker.id)
      .order('applied_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching applications:', error)
    } else {
      setApplications(data as ApplicationWithJob[] || [])
    }

    // Fetch detailed stats
    const applicationStats = await analyticsService.getApplicationStats(jobSeeker.id)
    setStats(applicationStats)

    setIsLoading(false)
  }

  const profileCompletion = () => {
    if (!jobSeeker) return 0
    let score = 0
    if (jobSeeker.full_name) score += 20
    if (jobSeeker.phone) score += 15
    if (jobSeeker.location) score += 15
    if (jobSeeker.bio) score += 20
    if (jobSeeker.resume_url) score += 30
    return score
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{jobSeeker?.full_name ? `, ${jobSeeker.full_name}` : ''}!
          </h1>
          <p className="text-gray-600">Here's an overview of your job search activity.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
        </div>
      </div>

      {/* Profile Completion */}
      {profileCompletion() < 100 && (
        <Card className="bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-primary-900">Complete your profile</h3>
              <p className="text-sm text-primary-700">
                Your profile is {profileCompletion()}% complete. A complete profile gets more visibility.
              </p>
            </div>
            <Link to="/profile">
              <Button size="sm">Complete Profile</Button>
            </Link>
          </div>
          <div className="mt-3 w-full bg-primary-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${profileCompletion()}%` }}
            />
          </div>
        </Card>
      )}

      {activeTab === 'overview' ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total Applications</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold">{stats.pending + stats.reviewing}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold">{stats.interview}</p>
                  <p className="text-sm text-gray-600">Interviews</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold">{stats.offered}</p>
                  <p className="text-sm text-gray-600">Offers</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Job Recommendations */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <CardTitle>Recommended for You</CardTitle>
              </div>
              <Link to="/jobs">
                <Button variant="ghost" size="sm">Browse All Jobs</Button>
              </Link>
            </div>

            {isLoadingRecommendations ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Complete your profile and add skills to get personalized recommendations.</p>
                <Link to="/profile" className="mt-4 inline-block">
                  <Button variant="outline" size="sm">Update Profile</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <Link
                    key={rec.job.id}
                    to={`/jobs/${rec.job.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{rec.job.title}</h4>
                          <p className="text-sm text-gray-600 truncate">{rec.job.companies?.company_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {rec.job.location && (
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {rec.job.location}
                              </span>
                            )}
                            <span>{rec.matchScore.skill_match_percentage}% skill match</span>
                          </div>
                        </div>
                      </div>
                      <MatchScoreBadge score={rec.matchScore.score} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Personalized Insights */}
          {jobSeeker && (
            <PersonalizedInsightsCard jobSeekerId={jobSeeker.id} maxInsights={4} />
          )}

          {/* Recent Applications */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Recent Applications</CardTitle>
              <Link to="/applications">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">You haven't applied to any jobs yet.</p>
                <Link to="/jobs" className="mt-4 inline-block">
                  <Button>Browse Jobs</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <Link
                        to={`/jobs/${app.job_posting_id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        {app.job_postings?.title}
                      </Link>
                      <p className="text-sm text-gray-600">
                        {app.job_postings?.companies?.company_name}
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
              <Link to="/jobs">
                <Button variant="outline">Browse Jobs</Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline">Edit Profile</Button>
              </Link>
              <Link to="/bookmarks">
                <Button variant="outline">Saved Jobs</Button>
              </Link>
              <Link to="/market-insights">
                <Button variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Market Insights
                </Button>
              </Link>
            </div>
          </Card>
        </>
      ) : (
        /* Analytics Tab */
        <div className="space-y-6">
          {/* Career Metrics */}
          {careerMetrics && <CareerMetricsCard metrics={careerMetrics} />}

          {/* Weekly Goal and Status Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyGoalCard goal={weeklyGoal} />

            <Card>
              <CardTitle className="mb-4">Application Status Breakdown</CardTitle>
              <ApplicationStatusChart stats={stats} />
            </Card>
          </div>

          {/* Application Activity */}
          <Card>
            <CardTitle className="mb-4">Application Activity (Last 30 Days)</CardTitle>
            <ApplicationActivityChart data={activityData} />
          </Card>

          {/* Link to Market Insights */}
          <Card className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Market Insights</h3>
                  <p className="text-sm text-gray-600">
                    Discover trending skills and job roles to guide your career
                  </p>
                </div>
              </div>
              <Link to="/market-insights">
                <Button>Explore Insights</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
