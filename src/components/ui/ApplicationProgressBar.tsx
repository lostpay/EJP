import { clsx } from 'clsx'
import { Check, X } from 'lucide-react'

type ApplicationStatus = 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn'

interface ApplicationProgressBarProps {
  status: ApplicationStatus
  showLabels?: boolean
  size?: 'sm' | 'md'
}

const statusSteps = [
  { key: 'pending', label: 'Applied' },
  { key: 'reviewing', label: 'Under Review' },
  { key: 'interview', label: 'Interview' },
  { key: 'offered', label: 'Offer' },
]

const statusOrder: Record<ApplicationStatus, number> = {
  pending: 0,
  reviewing: 1,
  interview: 2,
  offered: 3,
  rejected: -1,
  withdrawn: -1,
}

export function ApplicationProgressBar({
  status,
  showLabels = true,
  size = 'md',
}: ApplicationProgressBarProps) {
  const currentStep = statusOrder[status]
  const isTerminated = status === 'rejected' || status === 'withdrawn'

  const sizeClasses = {
    sm: {
      step: 'w-6 h-6',
      icon: 'h-3 w-3',
      text: 'text-xs',
      line: 'h-0.5',
    },
    md: {
      step: 'w-8 h-8',
      icon: 'h-4 w-4',
      text: 'text-sm',
      line: 'h-1',
    },
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {statusSteps.map((step, index) => {
          const isCompleted = currentStep >= index && !isTerminated
          const isCurrent = currentStep === index && !isTerminated
          const isLast = index === statusSteps.length - 1

          return (
            <div key={step.key} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    'rounded-full flex items-center justify-center font-medium transition-colors',
                    sizeClasses[size].step,
                    {
                      'bg-green-500 text-white': isCompleted && !isCurrent,
                      'bg-primary-600 text-white ring-4 ring-primary-100': isCurrent,
                      'bg-gray-200 text-gray-500': !isCompleted && !isCurrent,
                    }
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className={sizeClasses[size].icon} />
                  ) : (
                    <span className={sizeClasses[size].text}>{index + 1}</span>
                  )}
                </div>
                {showLabels && (
                  <span
                    className={clsx(
                      'mt-1 text-center whitespace-nowrap',
                      sizeClasses[size].text,
                      {
                        'text-primary-600 font-medium': isCurrent,
                        'text-green-600': isCompleted && !isCurrent,
                        'text-gray-500': !isCompleted && !isCurrent,
                      }
                    )}
                  >
                    {step.label}
                  </span>
                )}
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={clsx(
                    'flex-1 mx-2 rounded-full transition-colors',
                    sizeClasses[size].line,
                    {
                      'bg-green-500': currentStep > index && !isTerminated,
                      'bg-gray-200': currentStep <= index || isTerminated,
                    }
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Terminated Status Indicator */}
      {isTerminated && (
        <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
          <X className={sizeClasses[size].icon} />
          <span className={clsx('font-medium', sizeClasses[size].text)}>
            {status === 'rejected' ? 'Application Rejected' : 'Application Withdrawn'}
          </span>
        </div>
      )}
    </div>
  )
}
