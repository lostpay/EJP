import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, Briefcase, ArrowRight } from 'lucide-react'
import { Card, CardTitle, Badge } from '@/components/ui'
import type { JobRoleTrend } from '@/services/analyticsService'

interface JobRoleTrendsCardProps {
  roles: JobRoleTrend[]
  limit?: number
}

export function JobRoleTrendsCard({ roles, limit = 10 }: JobRoleTrendsCardProps) {
  const displayRoles = roles.slice(0, limit)

  if (displayRoles.length === 0) {
    return (
      <Card>
        <CardTitle className="mb-4">Trending Job Roles</CardTitle>
        <div className="flex items-center justify-center h-32 text-gray-500">
          No job role data available
        </div>
      </Card>
    )
  }

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getTrendBadgeVariant = (trend: 'up' | 'down' | 'stable'): 'success' | 'danger' | 'gray' => {
    switch (trend) {
      case 'up':
        return 'success'
      case 'down':
        return 'danger'
      default:
        return 'gray'
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary-600" />
          <CardTitle>Trending Job Roles</CardTitle>
        </div>
      </div>

      <div className="space-y-2">
        {displayRoles.map((role, index) => (
          <Link
            key={role.title}
            to={`/jobs?keyword=${encodeURIComponent(role.title)}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < 3
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate group-hover:text-primary-600">
                  {role.title}
                </p>
                <p className="text-xs text-gray-500">{role.count} openings</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={getTrendBadgeVariant(role.trend)}>
                <span className="flex items-center gap-1">
                  <TrendIcon trend={role.trend} />
                  {role.growth_rate > 0 ? '+' : ''}
                  {role.growth_rate}%
                </span>
              </Badge>
              <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
