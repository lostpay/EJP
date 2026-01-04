import { Check, X, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { MatchedSkill, MissingSkill } from '@/types'

interface SkillMatchDisplayProps {
  matchedSkills: MatchedSkill[]
  missingSkills: MissingSkill[]
  skillMatchPercentage: number
  compact?: boolean
}

export function SkillMatchDisplay({
  matchedSkills,
  missingSkills,
  skillMatchPercentage,
  compact = false,
}: SkillMatchDisplayProps) {
  const requiredMissing = missingSkills.filter((s) => s.is_required)
  const niceToHaveMissing = missingSkills.filter((s) => !s.is_required)

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-600 flex items-center gap-1">
          <Check className="h-4 w-4" />
          {matchedSkills.length}
        </span>
        {missingSkills.length > 0 && (
          <span className="text-red-600 flex items-center gap-1">
            <X className="h-4 w-4" />
            {missingSkills.length}
          </span>
        )}
        <span className="text-gray-500">({skillMatchPercentage}% of required)</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Matched Skills */}
      {matchedSkills.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            Your Matched Skills ({matchedSkills.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {matchedSkills.map((skill) => (
              <span
                key={skill.skill_id}
                className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 text-sm"
              >
                <Check className="h-3 w-3" />
                {skill.skill_name}
                {skill.proficiency && (
                  <span className="opacity-75 text-xs">({skill.proficiency})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Required Skills */}
      {requiredMissing.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            Missing Required Skills ({requiredMissing.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {requiredMissing.map((skill) => (
              <Badge key={skill.skill_id} variant="danger">
                {skill.skill_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing Nice-to-Have Skills */}
      {niceToHaveMissing.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <X className="h-4 w-4 text-gray-400" />
            Nice-to-Have Skills You're Missing ({niceToHaveMissing.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {niceToHaveMissing.map((skill) => (
              <Badge key={skill.skill_id} variant="gray">
                {skill.skill_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-gray-600 pt-2 border-t">
        You match <strong>{skillMatchPercentage}%</strong> of the required skills for this
        position.
      </div>
    </div>
  )
}
