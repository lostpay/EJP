import { Card } from '@/components/ui'
import type { PipelineFunnelData } from '@/services/pipelineAnalyticsService'

interface PipelineFunnelChartProps {
  data: PipelineFunnelData[]
  title?: string
  showDropOff?: boolean
}

export function PipelineFunnelChart({
  data,
  title = 'Hiring Funnel',
  showDropOff = true,
}: PipelineFunnelChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </Card>
    )
  }

  const maxCount = data[0]?.count || 1

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>

      <div className="space-y-4">
        {data.map((stage, index) => {
          const widthPercentage = Math.max((stage.count / maxCount) * 100, 10)

          return (
            <div key={stage.stage} className="relative">
              {/* Stage bar */}
              <div className="flex items-center gap-4">
                <div className="w-28 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-700">
                    {stage.label}
                  </span>
                </div>

                <div className="flex-1 relative">
                  <div
                    className="h-10 rounded-lg flex items-center px-4 transition-all duration-500"
                    style={{
                      width: `${widthPercentage}%`,
                      backgroundColor: stage.color,
                      minWidth: '80px',
                    }}
                  >
                    <span className="text-white font-semibold text-sm">
                      {stage.count}
                    </span>
                  </div>
                </div>

                <div className="w-16 text-right flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">
                    {stage.percentage}%
                  </span>
                </div>
              </div>

              {/* Drop-off indicator */}
              {showDropOff && index > 0 && stage.dropOffRate > 0 && (
                <div className="ml-28 pl-4 mt-1 mb-2">
                  <div className="flex items-center gap-2 text-xs text-red-500">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                    <span>{stage.dropOffRate}% drop-off</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Applied</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Reviewing</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>Interview</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Offer</span>
        </div>
      </div>
    </Card>
  )
}
