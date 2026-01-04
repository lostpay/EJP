import { ArrowRight, TrendingUp, Clock } from 'lucide-react'
import { Card } from '@/components/ui'
import type { StageConversion } from '@/services/pipelineAnalyticsService'

interface ConversionRatesCardProps {
  conversions: StageConversion[]
  title?: string
}

const STAGE_LABELS: Record<string, string> = {
  pending: 'Applied',
  reviewing: 'Under Review',
  interview: 'Interview',
  offered: 'Offer',
}

export function ConversionRatesCard({
  conversions,
  title = 'Stage Conversion Rates',
}: ConversionRatesCardProps) {
  if (conversions.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No conversion data available</p>
      </Card>
    )
  }

  const getConversionColor = (rate: number) => {
    if (rate >= 50) return 'text-green-600 bg-green-100'
    if (rate >= 30) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>

      <div className="space-y-4">
        {conversions.map((conversion) => (
          <div
            key={`${conversion.fromStage}-${conversion.toStage}`}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            {/* Stage transition */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {STAGE_LABELS[conversion.fromStage] || conversion.fromStage}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {STAGE_LABELS[conversion.toStage] || conversion.toStage}
              </span>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-6">
              {/* Conversion Rate */}
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span
                  className={`px-2 py-1 rounded-full text-sm font-medium ${getConversionColor(
                    conversion.conversionRate
                  )}`}
                >
                  {conversion.conversionRate}%
                </span>
              </div>

              {/* Average Time */}
              <div className="flex items-center gap-2 text-gray-500">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  ~{conversion.averageTimeInDays} days
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Overall Conversion (Applied → Offer)</span>
          <span className="font-semibold text-gray-900">
            {conversions.length > 0
              ? Math.round(
                  conversions.reduce((acc, c) => acc * (c.conversionRate / 100), 1) *
                    100
                )
              : 0}
            %
          </span>
        </div>
      </div>
    </Card>
  )
}
