import { Users, UserCheck, Clock, TrendingUp, Award } from 'lucide-react'
import { Card } from '@/components/ui'
import type { PipelineMetrics } from '@/services/pipelineAnalyticsService'

interface PipelineMetricsCardProps {
  metrics: PipelineMetrics
  title?: string
}

export function PipelineMetricsCard({
  metrics,
  title = 'Pipeline Overview',
}: PipelineMetricsCardProps) {
  const metricItems = [
    {
      label: 'Total Applicants',
      value: metrics.totalApplicants,
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Active in Pipeline',
      value: metrics.activeApplicants,
      icon: UserCheck,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Avg. Time to Hire',
      value: metrics.averageTimeToHire
        ? `${metrics.averageTimeToHire} days`
        : 'N/A',
      icon: Clock,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      label: 'Conversion Rate',
      value: `${metrics.conversionRate}%`,
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-100',
    },
    {
      label: 'Offer Rate',
      value: `${metrics.offerAcceptanceRate}%`,
      icon: Award,
      color: 'text-emerald-600 bg-emerald-100',
    },
  ]

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricItems.map((item) => (
          <div
            key={item.label}
            className="text-center p-4 bg-gray-50 rounded-lg"
          >
            <div
              className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${item.color} mb-3`}
            >
              <item.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            <div className="text-xs text-gray-500 mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
