import { useState, useEffect } from 'react'
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  MessageSquare,
  User,
  Building2,
  LogOut,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react'
import { Spinner } from './Spinner'
import { analyticsService, type StatusHistoryEntry } from '@/services/analyticsService'
import type { ApplicationStatus } from '@/types'
import { STATUS_LABELS } from '@/types'

interface ApplicationStatusTimelineProps {
  applicationId: string
  currentStatus: ApplicationStatus
  appliedAt: string
  compact?: boolean
}

const STATUS_ICONS: Record<ApplicationStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  reviewing: <Eye className="h-4 w-4" />,
  interview: <Calendar className="h-4 w-4" />,
  offered: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  withdrawn: <LogOut className="h-4 w-4" />,
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: 'bg-blue-500',
  reviewing: 'bg-yellow-500',
  interview: 'bg-purple-500',
  offered: 'bg-green-500',
  rejected: 'bg-red-500',
  withdrawn: 'bg-gray-500',
}

const STATUS_BG_COLORS: Record<ApplicationStatus, string> = {
  pending: 'bg-blue-100 text-blue-700 border-blue-200',
  reviewing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  interview: 'bg-purple-100 text-purple-700 border-purple-200',
  offered: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function ApplicationStatusTimeline({
  applicationId,
  currentStatus: _currentStatus,
  appliedAt,
  compact = false,
}: ApplicationStatusTimelineProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(!compact)

  useEffect(() => {
    fetchHistory()
  }, [applicationId])

  const fetchHistory = async () => {
    setIsLoading(true)
    const data = await analyticsService.getApplicationStatusHistory(applicationId)
    setHistory(data)
    setIsLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return formatDate(dateString)
  }

  const getChangedByLabel = (entry: StatusHistoryEntry) => {
    if (!entry.changedBy) return 'System'
    if (entry.changedByRole === 'company') return 'Employer'
    if (entry.changedByRole === 'jobseeker') return 'You'
    if (entry.changedByRole === 'admin') return 'Admin'
    return 'Unknown'
  }

  const getChangedByIcon = (entry: StatusHistoryEntry) => {
    if (!entry.changedBy) return <FileText className="h-3 w-3" />
    if (entry.changedByRole === 'company') return <Building2 className="h-3 w-3" />
    return <User className="h-3 w-3" />
  }

  // Create timeline entries including the initial application
  const timelineEntries = [
    {
      id: 'initial',
      status: 'pending' as ApplicationStatus,
      date: appliedAt,
      isInitial: true,
      changedBy: null,
      notes: null,
    },
    ...history.map((h) => ({
      id: h.id,
      status: h.newStatus,
      oldStatus: h.oldStatus,
      date: h.changedAt,
      isInitial: false,
      changedBy: h,
      notes: h.notes,
    })),
  ]

  if (compact) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-600" />
            <span className="font-medium text-gray-900">Status History</span>
            <span className="text-sm text-gray-500">
              ({timelineEntries.length} update{timelineEntries.length !== 1 ? 's' : ''})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : (
              <TimelineContent entries={timelineEntries} formatDate={formatDate} formatTime={formatTime} formatRelativeTime={formatRelativeTime} getChangedByLabel={getChangedByLabel} getChangedByIcon={getChangedByIcon} />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        Status History
      </h4>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <TimelineContent entries={timelineEntries} formatDate={formatDate} formatTime={formatTime} formatRelativeTime={formatRelativeTime} getChangedByLabel={getChangedByLabel} getChangedByIcon={getChangedByIcon} />
      )}
    </div>
  )
}

interface TimelineEntry {
  id: string
  status: ApplicationStatus
  oldStatus?: ApplicationStatus | null
  date: string
  isInitial: boolean
  changedBy: StatusHistoryEntry | null
  notes: string | null
}

interface TimelineContentProps {
  entries: TimelineEntry[]
  formatDate: (date: string) => string
  formatTime: (date: string) => string
  formatRelativeTime: (date: string) => string
  getChangedByLabel: (entry: StatusHistoryEntry) => string
  getChangedByIcon: (entry: StatusHistoryEntry) => React.ReactNode
}

function TimelineContent({
  entries,
  formatDate,
  formatTime,
  formatRelativeTime,
  getChangedByLabel,
  getChangedByIcon,
}: TimelineContentProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No status history available
      </p>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="relative flex gap-4">
            {/* Timeline dot */}
            <div
              className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-white ${STATUS_COLORS[entry.status]}`}
            >
              {STATUS_ICONS[entry.status]}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BG_COLORS[entry.status]}`}
                    >
                      {STATUS_LABELS[entry.status]}
                    </span>
                    {entry.isInitial && (
                      <span className="text-xs text-gray-400">Initial</span>
                    )}
                  </div>

                  {entry.oldStatus && !entry.isInitial && (
                    <p className="text-xs text-gray-500 mt-1">
                      Changed from {STATUS_LABELS[entry.oldStatus]}
                    </p>
                  )}

                  {entry.changedBy && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      {getChangedByIcon(entry.changedBy)}
                      {getChangedByLabel(entry.changedBy)}
                    </p>
                  )}

                  {entry.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      {entry.notes}
                    </div>
                  )}
                </div>

                <div className="text-right text-xs text-gray-500 flex-shrink-0">
                  <div>{formatRelativeTime(entry.date)}</div>
                  <div className="text-gray-400">
                    {formatDate(entry.date)} {formatTime(entry.date)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
