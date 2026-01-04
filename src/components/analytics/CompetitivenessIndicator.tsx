import { useState } from 'react'
import { Users, Info } from 'lucide-react'
import type { CompetitivenessData } from '@/services/analyticsService'
import { analyticsService } from '@/services/analyticsService'

interface CompetitivenessIndicatorProps {
  data: CompetitivenessData
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function CompetitivenessIndicator({
  data,
  showTooltip = true,
  size = 'md',
}: CompetitivenessIndicatorProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)

  const colorClass = analyticsService.getCompetitivenessColor(data.level)

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${colorClass}`}
      >
        <Users className={iconSizes[size]} />
        {data.label}
      </span>

      {showTooltip && (
        <button
          className="text-gray-400 hover:text-gray-600 transition-colors"
          onMouseEnter={() => setIsTooltipVisible(true)}
          onMouseLeave={() => setIsTooltipVisible(false)}
          onClick={() => setIsTooltipVisible(!isTooltipVisible)}
          aria-label="Competition info"
        >
          <Info className={iconSizes[size]} />
        </button>
      )}

      {isTooltipVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-lg">
            <p className="font-medium mb-1">Competition Level</p>
            <p className="text-gray-300">
              {data.applicantCount} {data.applicantCount === 1 ? 'person has' : 'people have'} applied
              to this position.
            </p>
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-gray-400 text-[10px]">
                Low: 0-5 | Medium: 6-15 | High: 16-30 | Very High: 30+
              </p>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 top-full">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact badge version for job cards
interface CompetitivenessCompactProps {
  data: CompetitivenessData
}

export function CompetitivenessCompact({ data }: CompetitivenessCompactProps) {
  const colorClass = analyticsService.getCompetitivenessColor(data.level)

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${colorClass}`}
      title={`${data.applicantCount} applicants - ${data.label}`}
    >
      <Users className="h-3 w-3" />
      {data.applicantCount}
    </span>
  )
}
