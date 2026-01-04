import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react'
import { Card, CardTitle, Badge } from '@/components/ui'
import type { CandidateMatchResult } from '@/services/employerMatchService'

interface CandidateSkillsAnalysisProps {
  matchResult: CandidateMatchResult
  compact?: boolean
}

export function CandidateSkillsAnalysis({ matchResult, compact = false }: CandidateSkillsAnalysisProps) {
  const {
    matchedSkills,
    partiallyMatchedSkills,
    missingSkills,
    skillCoveragePercentage,
    requiredSkillsCoverage,
  } = matchResult

  const allMissing = missingSkills.filter((s) => s.isRequired)
  const optionalMissing = missingSkills.filter((s) => !s.isRequired)

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Coverage Bars */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24">Skills Match:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                skillCoveragePercentage >= 70
                  ? 'bg-green-500'
                  : skillCoveragePercentage >= 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${skillCoveragePercentage}%` }}
            />
          </div>
          <span className="text-xs font-medium w-10 text-right">{skillCoveragePercentage}%</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24">Required:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                requiredSkillsCoverage >= 80
                  ? 'bg-green-500'
                  : requiredSkillsCoverage >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${requiredSkillsCoverage}%` }}
            />
          </div>
          <span className="text-xs font-medium w-10 text-right">{requiredSkillsCoverage}%</span>
        </div>

        {/* Quick Skill Summary */}
        <div className="flex flex-wrap gap-1 mt-2">
          {matchedSkills.slice(0, 3).map((skill) => (
            <Badge key={skill.skillId} variant="success" size="sm">
              <CheckCircle className="h-3 w-3 mr-1" />
              {skill.skillName}
            </Badge>
          ))}
          {allMissing.slice(0, 2).map((skill) => (
            <Badge key={skill.skillId} variant="danger" size="sm">
              <XCircle className="h-3 w-3 mr-1" />
              {skill.skillName}
            </Badge>
          ))}
          {matchedSkills.length + allMissing.length > 5 && (
            <Badge variant="gray" size="sm">
              +{matchedSkills.length + allMissing.length - 5} more
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardTitle className="mb-4">Skills Analysis</CardTitle>

      {/* Coverage Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Match</span>
            <span
              className={`text-lg font-bold ${
                skillCoveragePercentage >= 70
                  ? 'text-green-600'
                  : skillCoveragePercentage >= 40
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {skillCoveragePercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                skillCoveragePercentage >= 70
                  ? 'bg-green-500'
                  : skillCoveragePercentage >= 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${skillCoveragePercentage}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Required Skills</span>
            <span
              className={`text-lg font-bold ${
                requiredSkillsCoverage >= 80
                  ? 'text-green-600'
                  : requiredSkillsCoverage >= 50
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {requiredSkillsCoverage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                requiredSkillsCoverage >= 80
                  ? 'bg-green-500'
                  : requiredSkillsCoverage >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${requiredSkillsCoverage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Matched Skills */}
      {matchedSkills.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h4 className="text-sm font-medium text-gray-700">
              Matched Skills ({matchedSkills.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {matchedSkills.map((skill) => (
              <Badge key={skill.skillId} variant="success">
                {skill.skillName}
                {skill.candidateProficiency && (
                  <span className="ml-1 opacity-75">({skill.candidateProficiency})</span>
                )}
                {skill.isRequired && (
                  <span className="ml-1 text-[10px] font-semibold">REQ</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Partially Matched Skills */}
      {partiallyMatchedSkills.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <h4 className="text-sm font-medium text-gray-700">
              Partial Match ({partiallyMatchedSkills.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {partiallyMatchedSkills.map((skill) => (
              <Badge key={skill.skillId} variant="warning">
                {skill.skillName}
                {skill.candidateProficiency && (
                  <span className="ml-1 opacity-75">({skill.candidateProficiency})</span>
                )}
                {skill.isRequired && (
                  <span className="ml-1 text-[10px] font-semibold">REQ</span>
                )}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            <Info className="h-3 w-3 inline mr-1" />
            Candidate has these skills but at a lower proficiency level
          </p>
        </div>
      )}

      {/* Missing Required Skills */}
      {allMissing.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <h4 className="text-sm font-medium text-gray-700">
              Missing Required ({allMissing.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {allMissing.map((skill) => (
              <Badge key={skill.skillId} variant="danger">
                {skill.skillName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing Optional Skills */}
      {optionalMissing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-500">
              Missing Optional ({optionalMissing.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {optionalMissing.map((skill) => (
              <Badge key={skill.skillId} variant="gray">
                {skill.skillName}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
