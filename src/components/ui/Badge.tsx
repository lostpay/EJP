import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface BadgeProps {
  children: ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'gray', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'badge',
        {
          'badge-primary': variant === 'primary',
          'badge-success': variant === 'success',
          'badge-warning': variant === 'warning',
          'badge-danger': variant === 'danger',
          'badge-gray': variant === 'gray',
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-1 text-sm': size === 'md',
        },
        className
      )}
    >
      {children}
    </span>
  )
}

// Application status badge helper
export function ApplicationStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'gray'> = {
    pending: 'gray',
    reviewing: 'primary',
    interview: 'warning',
    offered: 'success',
    rejected: 'danger',
    withdrawn: 'gray',
  }

  const labels: Record<string, string> = {
    pending: 'Pending',
    reviewing: 'Reviewing',
    interview: 'Interview',
    offered: 'Offered',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  }

  return (
    <Badge variant={variants[status] || 'gray'}>
      {labels[status] || status}
    </Badge>
  )
}
