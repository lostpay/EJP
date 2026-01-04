import { useState } from 'react'
import { ChevronRight, X, Check, AlertTriangle } from 'lucide-react'
import { Button, Modal, Select, Textarea } from '@/components/ui'
import { VALID_STATUS_TRANSITIONS, STATUS_LABELS, type ApplicationStatus } from '@/types'

interface StatusUpdateControlsProps {
  currentStatus: ApplicationStatus
  onStatusUpdate: (newStatus: ApplicationStatus, notes?: string) => Promise<void>
  isLoading?: boolean
  size?: 'sm' | 'md'
}

export function StatusUpdateControls({
  currentStatus,
  onStatusUpdate,
  isLoading = false,
  size = 'md',
}: StatusUpdateControlsProps) {
  const validNextStatuses = VALID_STATUS_TRANSITIONS[currentStatus] || []

  const getNextAdvanceStatus = (): ApplicationStatus | null => {
    const advanceOrder: ApplicationStatus[] = ['reviewing', 'interview', 'offered']
    for (const status of advanceOrder) {
      if (validNextStatuses.includes(status)) {
        return status
      }
    }
    return null
  }

  const nextStatus = getNextAdvanceStatus()

  if (validNextStatuses.length === 0) {
    return (
      <span className="text-sm text-gray-500 italic">
        No actions available
      </span>
    )
  }

  const buttonSize = size === 'sm' ? 'sm' : 'md'

  return (
    <div className="flex gap-2">
      {nextStatus && (
        <Button
          size={buttonSize as 'sm' | 'md'}
          onClick={() => onStatusUpdate(nextStatus)}
          disabled={isLoading}
          isLoading={isLoading}
        >
          <ChevronRight className="h-4 w-4 mr-1" />
          {STATUS_LABELS[nextStatus]}
        </Button>
      )}

      {validNextStatuses.includes('rejected') && (
        <Button
          variant="outline"
          size={buttonSize as 'sm' | 'md'}
          className="text-red-600 border-red-300 hover:bg-red-50"
          onClick={() => onStatusUpdate('rejected')}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1" />
          Reject
        </Button>
      )}
    </div>
  )
}

interface BulkStatusUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  onBulkUpdate: (newStatus: ApplicationStatus, notes?: string) => Promise<void>
  isLoading?: boolean
}

export function BulkStatusUpdateModal({
  isOpen,
  onClose,
  selectedCount,
  onBulkUpdate,
  isLoading = false,
}: BulkStatusUpdateModalProps) {
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('reviewing')
  const [notes, setNotes] = useState('')

  const statusOptions = [
    { value: 'reviewing', label: STATUS_LABELS.reviewing },
    { value: 'interview', label: STATUS_LABELS.interview },
    { value: 'offered', label: STATUS_LABELS.offered },
    { value: 'rejected', label: STATUS_LABELS.rejected },
  ]

  const handleSubmit = async () => {
    await onBulkUpdate(newStatus, notes || undefined)
    setNotes('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Status Update">
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            You are about to update <strong>{selectedCount}</strong> application
            {selectedCount !== 1 ? 's' : ''}.
          </p>
        </div>

        <Select
          label="New Status"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
          options={statusOptions}
        />

        {newStatus === 'rejected' && (
          <Textarea
            label="Rejection Reason (Optional)"
            placeholder="Enter a reason for rejection..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            <Check className="h-4 w-4 mr-1" />
            Update {selectedCount} Application{selectedCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface QuickRejectModalProps {
  isOpen: boolean
  onClose: () => void
  candidateName: string
  onReject: (notes?: string) => Promise<void>
  isLoading?: boolean
}

export function QuickRejectModal({
  isOpen,
  onClose,
  candidateName,
  onReject,
  isLoading = false,
}: QuickRejectModalProps) {
  const [notes, setNotes] = useState('')

  const handleReject = async () => {
    await onReject(notes || undefined)
    setNotes('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reject Application">
      <div className="space-y-4">
        <p className="text-gray-600">
          Are you sure you want to reject <strong>{candidateName}</strong>'s application?
        </p>

        <Textarea
          label="Reason (Optional)"
          placeholder="Enter a reason for rejection (not visible to candidate)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            isLoading={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      </div>
    </Modal>
  )
}
