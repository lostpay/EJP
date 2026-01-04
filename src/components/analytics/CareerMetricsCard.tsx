import { TrendingUp, Clock, Users, Award } from 'lucide-react'
import { Card } from '@/components/ui'
import type { CareerMetrics } from '@/services/analyticsService'

interface CareerMetricsCardProps {
  metrics: CareerMetrics
}

export function CareerMetricsCard({ metrics }: CareerMetricsCardProps) {
  const metricItems = [
    {
      label: 'Response Rate',
      value: `${metrics.responseRate.toFixed(0)}%`,
      icon: TrendingUp,
      description: 'Applications that received a response',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Avg. Response Time',
      value: metrics.averageTimeToResponse
        ? `${metrics.averageTimeToResponse.toFixed(0)} days`
        : 'N/A',
      icon: Clock,
      description: 'Average time to get a response',
      color: 'text-purple-600 bg-purple-100',
    },
    {
      label: 'Interview Rate',
      value: `${metrics.interviewRate.toFixed(0)}%`,
      icon: Users,
      description: 'Applications that led to interviews',
      color: 'text-amber-600 bg-amber-100',
    },
    {
      label: 'Offer Rate',
      value: `${metrics.offerRate.toFixed(0)}%`,
      icon: Award,
      description: 'Applications that resulted in offers',
      color: 'text-green-600 bg-green-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metricItems.map((item) => (
        <Card key={item.label} className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm font-medium text-gray-600">{item.label}</p>
              <p className="text-xs text-gray-400 mt-1">{item.description}</p>
            </div>
            <div className={`p-2 rounded-lg ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
