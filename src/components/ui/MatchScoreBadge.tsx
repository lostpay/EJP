import { clsx } from 'clsx'

interface MatchScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function MatchScoreBadge({
  score,
  size = 'md',
  showLabel = false,
  className,
}: MatchScoreBadgeProps) {
  const getColorClasses = () => {
    if (score >= 70) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getLabel = () => {
    if (score >= 70) return 'Excellent Match'
    if (score >= 40) return 'Good Match'
    return 'Partial Match'
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        getColorClasses(),
        sizeClasses[size],
        className
      )}
      title={`${score}% match - ${getLabel()}`}
    >
      <span className="font-semibold">{score}%</span>
      {showLabel && <span className="text-xs opacity-80">match</span>}
    </div>
  )
}
