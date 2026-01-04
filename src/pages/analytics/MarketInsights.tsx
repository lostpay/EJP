import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, RefreshCw, ArrowLeft, Zap } from 'lucide-react'
import { Card, CardTitle, Button, Spinner, Select } from '@/components/ui'
import {
  analyticsService,
  type SkillDemand,
  type JobRoleTrend,
} from '@/services/analyticsService'
import {
  SkillDemandChart,
  JobRoleTrendsCard,
  SalaryDistributionChart,
  SalaryByRoleChart,
  LocationDistributionChart,
  SkillCategoryChart,
} from '@/components/analytics'

type TimePeriod = '7' | '30' | '90'

interface SalaryRange {
  range: string
  count: number
  minSalary: number
  maxSalary: number
}

interface LocationData {
  location: string
  count: number
  percentage: number
}

interface SkillCategory {
  category: string
  count: number
  percentage: number
}

export function MarketInsights() {
  const [skills, setSkills] = useState<SkillDemand[]>([])
  const [roles, setRoles] = useState<JobRoleTrend[]>([])
  const [salaryData, setSalaryData] = useState<SalaryRange[]>([])
  const [locationData, setLocationData] = useState<LocationData[]>([])
  const [categoryData, setCategoryData] = useState<SkillCategory[]>([])
  const [remoteCount, setRemoteCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30')
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('')
  const [locationFilter, setLocationFilter] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [timePeriod, jobTypeFilter, locationFilter])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [skillsData, rolesData, salary, locations, categories, remote] = await Promise.all([
        analyticsService.getMostDemandedSkills({
          limit: 20,
          days: parseInt(timePeriod),
          jobType: jobTypeFilter || undefined,
          location: locationFilter || undefined,
        }),
        analyticsService.getTrendingJobRoles({
          limit: 15,
          days: parseInt(timePeriod),
        }),
        analyticsService.getSalaryDistribution({
          days: parseInt(timePeriod),
          jobType: jobTypeFilter || undefined,
        }),
        analyticsService.getLocationDistribution({
          days: parseInt(timePeriod),
          limit: 10,
        }),
        analyticsService.getSkillCategories({
          days: parseInt(timePeriod),
        }),
        analyticsService.getRemoteJobCount(parseInt(timePeriod)),
      ])

      setSkills(skillsData)
      setRoles(rolesData)
      setSalaryData(salary)
      setLocationData(locations)
      setCategoryData(categories)
      setRemoteCount(remote)
    } catch (error) {
      console.error('Error fetching market insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary-600" />
              Market Insights
            </h1>
            <p className="text-gray-600">
              Discover trending skills and job roles to guide your career
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <Select
              label="Time Period"
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
              ]}
            />
          </div>

          <div className="flex-1">
            <Select
              label="Job Type"
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'full-time', label: 'Full-time' },
                { value: 'part-time', label: 'Part-time' },
                { value: 'contract', label: 'Contract' },
                { value: 'internship', label: 'Internship' },
              ]}
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              placeholder="Enter location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600">{skills.length}</p>
                <p className="text-sm text-gray-600">Skills Tracked</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {skills.filter((s) => s.trend === 'up').length}
                </p>
                <p className="text-sm text-gray-600">Trending Up</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{roles.length}</p>
                <p className="text-sm text-gray-600">Job Roles</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {roles.reduce((acc, r) => acc + r.count, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Openings</p>
              </div>
            </Card>
          </div>

          {/* Main Content - Skills and Roles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skill Demand Chart */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-amber-500" />
                <CardTitle>Most Demanded Skills</CardTitle>
              </div>
              <SkillDemandChart skills={skills} showTrend={true} />
            </Card>

            {/* Job Role Trends */}
            <JobRoleTrendsCard roles={roles} limit={10} />
          </div>

          {/* Additional Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Salary Distribution */}
            <SalaryDistributionChart data={salaryData} />

            {/* Location Distribution */}
            <LocationDistributionChart
              data={locationData}
              showRemote={true}
              remoteCount={remoteCount}
            />

            {/* Skill Categories */}
            <SkillCategoryChart data={categoryData} />
          </div>

          {/* Salary By Role - Full Width */}
          <SalaryByRoleChart showFilters={true} maxRoles={10} />

          {/* Insights Summary */}
          <Card className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Key Insights</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {skills.length > 0 && (
                    <li>
                      <strong>{skills[0].skill_name}</strong> is the most in-demand skill with{' '}
                      {skills[0].count} job postings requiring it.
                    </li>
                  )}
                  {skills.filter((s) => s.trend === 'up').length > 0 && (
                    <li>
                      {skills.filter((s) => s.trend === 'up').length} skills are trending upward,
                      indicating growing demand.
                    </li>
                  )}
                  {roles.length > 0 && (
                    <li>
                      <strong>{roles[0].title}</strong> is the most posted role with {roles[0].count}{' '}
                      active openings.
                    </li>
                  )}
                  {roles.some((r) => r.growth_rate > 50) && (
                    <li>
                      Some roles are growing rapidly - consider expanding your skills in these areas.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </Card>

          {/* Call to Action */}
          <Card>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Ready to apply?</h3>
                <p className="text-sm text-gray-600">
                  Browse jobs matching your skills and the latest market trends.
                </p>
              </div>
              <div className="flex gap-2">
                <Link to="/jobs">
                  <Button>Browse Jobs</Button>
                </Link>
                <Link to="/profile">
                  <Button variant="outline">Update Skills</Button>
                </Link>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
