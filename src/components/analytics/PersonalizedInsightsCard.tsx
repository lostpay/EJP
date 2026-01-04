import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Lightbulb,
  TrendingUp,
  BookOpen,
  Star,
  ArrowRight,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { Card, CardTitle, Button, Spinner } from '@/components/ui'
import {
  analyticsService,
  type PersonalizedInsight,
  type PersonalizedInsightsResult,
} from '@/services/analyticsService'

interface PersonalizedInsightsCardProps {
  jobSeekerId: string
  maxInsights?: number
  showTitle?: boolean
}

const INSIGHT_ICONS: Record<PersonalizedInsight['type'], React.ReactNode> = {
  skill_to_learn: <BookOpen className="h-4 w-4" />,
  trending_role: <Briefcase className="h-4 w-4" />,
  in_demand_skill: <Star className="h-4 w-4" />,
  career_tip: <Lightbulb className="h-4 w-4" />,
}

const INSIGHT_COLORS: Record<PersonalizedInsight['type'], string> = {
  skill_to_learn: 'bg-blue-100 text-blue-600',
  trending_role: 'bg-purple-100 text-purple-600',
  in_demand_skill: 'bg-green-100 text-green-600',
  career_tip: 'bg-yellow-100 text-yellow-600',
}

const PRIORITY_INDICATOR: Record<PersonalizedInsight['priority'], string> = {
  high: 'border-l-4 border-l-green-500',
  medium: 'border-l-4 border-l-blue-500',
  low: 'border-l-4 border-l-gray-300',
}

export function PersonalizedInsightsCard({
  jobSeekerId,
  maxInsights = 6,
  showTitle = true,
}: PersonalizedInsightsCardProps) {
  const [insightsData, setInsightsData] = useState<PersonalizedInsightsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [jobSeekerId])

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const data = await analyticsService.getPersonalizedInsights(jobSeekerId)
      setInsightsData(data)
    } catch (error) {
      console.error('Error fetching personalized insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <CardTitle>Insights for You</CardTitle>
          </div>
        )}
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </Card>
    )
  }

  if (!insightsData || insightsData.insights.length === 0) {
    return (
      <Card>
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <CardTitle>Insights for You</CardTitle>
          </div>
        )}
        <div className="text-center py-8">
          <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Add skills to your profile to get personalized career insights.
          </p>
          <Link to="/profile">
            <Button variant="outline" size="sm">
              Update Profile
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  const displayedInsights = isExpanded
    ? insightsData.insights
    : insightsData.insights.slice(0, maxInsights)

  const hasMoreInsights = insightsData.insights.length > maxInsights

  return (
    <Card>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <CardTitle>Insights for You</CardTitle>
          </div>
          <Link to="/market-insights">
            <Button variant="ghost" size="sm">
              View Market Insights
            </Button>
          </Link>
        </div>
      )}

      {/* Summary Stats */}
      {(insightsData.inDemandUserSkills.length > 0 || insightsData.matchingRoles.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Star className="h-4 w-4" />
              <span className="text-2xl font-bold">{insightsData.inDemandUserSkills.length}</span>
            </div>
            <p className="text-xs text-gray-600">In-demand skills you have</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-2xl font-bold">{insightsData.matchingRoles.length}</span>
            </div>
            <p className="text-xs text-gray-600">Trending roles for you</p>
          </div>
        </div>
      )}

      {/* Insights List */}
      <div className="space-y-3">
        {displayedInsights.map((insight, index) => (
          <div
            key={`${insight.type}-${index}`}
            className={`p-4 bg-white border rounded-lg ${PRIORITY_INDICATOR[insight.priority]} hover:shadow-sm transition-shadow`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg flex-shrink-0 ${INSIGHT_COLORS[insight.type]}`}>
                {INSIGHT_ICONS[insight.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 text-sm">{insight.title}</h4>
                  {insight.priority === 'high' && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      Hot
                    </span>
                  )}
                  {insight.data?.growthPercentage && insight.data.growthPercentage > 0 && (
                    <span className="text-xs text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                      {insight.data.growthPercentage}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                {insight.actionText && insight.actionLink && (
                  <Link
                    to={insight.actionLink}
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
                  >
                    {insight.actionText}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less */}
      {hasMoreInsights && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Show {insightsData.insights.length - maxInsights} more insights{' '}
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}

      {/* Skills to Learn Section */}
      {insightsData.skillsToLearn.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            Top Skills to Consider Learning
          </h4>
          <div className="flex flex-wrap gap-2">
            {insightsData.skillsToLearn.slice(0, 6).map((skill) => (
              <span
                key={skill.skill_id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
              >
                {skill.skill_name}
                {skill.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                <span className="text-xs opacity-75">({skill.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
