import { useState } from 'react'
import { Target, Edit2, Check, X } from 'lucide-react'
import { Card, Input } from '@/components/ui'
import type { WeeklyGoal } from '@/services/analyticsService'

interface WeeklyGoalCardProps {
  goal: WeeklyGoal
  onUpdateTarget?: (newTarget: number) => void
}

export function WeeklyGoalCard({ goal, onUpdateTarget }: WeeklyGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [targetValue, setTargetValue] = useState(goal.target.toString())

  const handleSave = () => {
    const newTarget = parseInt(targetValue, 10)
    if (newTarget > 0 && onUpdateTarget) {
      onUpdateTarget(newTarget)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTargetValue(goal.target.toString())
    setIsEditing(false)
  }

  const isCompleted = goal.current >= goal.target

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100' : 'bg-blue-100'}`}>
            <Target className={`h-5 w-5 ${isCompleted ? 'text-green-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Weekly Goal</h3>
            <p className="text-xs text-gray-500">Applications this week</p>
          </div>
        </div>
        {onUpdateTarget && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Edit goal"
          >
            <Edit2 className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-gray-900">{goal.current}</span>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">/</span>
              <Input
                type="number"
                min="1"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-16 h-8 text-sm text-center"
              />
              <button
                onClick={handleSave}
                className="p-1 hover:bg-green-100 rounded text-green-600"
                aria-label="Save"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-red-100 rounded text-red-600"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span className="text-sm text-gray-500">/ {goal.target} target</span>
          )}
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              isCompleted ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(goal.percentage, 100)}%` }}
          />
        </div>

        <p className="text-sm text-center">
          {isCompleted ? (
            <span className="text-green-600 font-medium">
              Goal achieved! Great work!
            </span>
          ) : (
            <span className="text-gray-600">
              {goal.target - goal.current} more to reach your goal
            </span>
          )}
        </p>
      </div>
    </Card>
  )
}
