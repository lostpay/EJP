import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  BarChart3,
  Briefcase,
  Star,
  ThumbsUp,
  ThumbsDown,
  FileDown,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui'
import type { CandidateMatchResult } from '@/services/employerMatchService'

interface CandidateScoreBreakdownProps {
  matchResult: CandidateMatchResult
  candidateName?: string
  jobTitle?: string
}

interface ScoreFactor {
  name: string
  score: number
  maxScore: number
  percentage: number
  status: 'strong' | 'moderate' | 'weak'
  details: string[]
}

export function CandidateScoreBreakdown({
  matchResult,
  candidateName = 'Candidate',
  jobTitle = 'this position',
}: CandidateScoreBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const {
    score,
    matchedSkills,
    partiallyMatchedSkills,
    missingSkills,
    requiredSkillsCoverage,
  } = matchResult

  // Calculate score factors
  const factors: ScoreFactor[] = []

  // Required Skills Factor
  const requiredMatched = matchedSkills.filter((s) => s.isRequired)
  const requiredPartial = partiallyMatchedSkills.filter((s) => s.isRequired)
  const requiredMissing = missingSkills.filter((s) => s.isRequired)
  const totalRequired = requiredMatched.length + requiredPartial.length + requiredMissing.length

  let requiredStatus: ScoreFactor['status'] = 'weak'
  if (requiredSkillsCoverage >= 80) requiredStatus = 'strong'
  else if (requiredSkillsCoverage >= 50) requiredStatus = 'moderate'

  const requiredDetails: string[] = []
  if (requiredMatched.length > 0) {
    requiredDetails.push(
      `Fully qualified in: ${requiredMatched.slice(0, 3).map((s) => s.skillName).join(', ')}${requiredMatched.length > 3 ? ` (+${requiredMatched.length - 3} more)` : ''}`
    )
  }
  if (requiredPartial.length > 0) {
    requiredDetails.push(
      `Developing skills in: ${requiredPartial.map((s) => s.skillName).join(', ')}`
    )
  }
  if (requiredMissing.length > 0) {
    requiredDetails.push(
      `Missing: ${requiredMissing.slice(0, 3).map((s) => s.skillName).join(', ')}${requiredMissing.length > 3 ? ` (+${requiredMissing.length - 3} more)` : ''}`
    )
  }

  factors.push({
    name: 'Required Skills',
    score: requiredMatched.length * 2 + requiredPartial.length,
    maxScore: totalRequired * 2,
    percentage: requiredSkillsCoverage,
    status: requiredStatus,
    details: requiredDetails.length > 0 ? requiredDetails : ['No required skills specified'],
  })

  // Optional Skills Factor
  const optionalMatched = matchedSkills.filter((s) => !s.isRequired)
  const optionalPartial = partiallyMatchedSkills.filter((s) => !s.isRequired)
  const optionalMissing = missingSkills.filter((s) => !s.isRequired)
  const totalOptional = optionalMatched.length + optionalPartial.length + optionalMissing.length

  const optionalCoverage = totalOptional > 0
    ? Math.round(((optionalMatched.length + optionalPartial.length * 0.5) / totalOptional) * 100)
    : 100

  let optionalStatus: ScoreFactor['status'] = 'weak'
  if (optionalCoverage >= 70) optionalStatus = 'strong'
  else if (optionalCoverage >= 40) optionalStatus = 'moderate'

  const optionalDetails: string[] = []
  if (optionalMatched.length > 0) {
    optionalDetails.push(
      `Has: ${optionalMatched.slice(0, 3).map((s) => s.skillName).join(', ')}${optionalMatched.length > 3 ? ` (+${optionalMatched.length - 3} more)` : ''}`
    )
  }
  if (totalOptional === 0) {
    optionalDetails.push('No optional skills specified for this role')
  }

  if (totalOptional > 0) {
    factors.push({
      name: 'Nice-to-Have Skills',
      score: optionalMatched.length + optionalPartial.length * 0.5,
      maxScore: totalOptional,
      percentage: optionalCoverage,
      status: optionalStatus,
      details: optionalDetails.length > 0 ? optionalDetails : ['No optional skills matched'],
    })
  }

  // Proficiency Factor
  const highProficiency = matchedSkills.filter(
    (s) => s.candidateProficiency === 'expert' || s.candidateProficiency === 'advanced'
  )
  const avgProficiency = matchedSkills.filter((s) => s.candidateProficiency === 'intermediate')
  const lowProficiency = matchedSkills.filter((s) => s.candidateProficiency === 'beginner')

  const proficiencyScore = highProficiency.length * 3 + avgProficiency.length * 2 + lowProficiency.length
  const maxProficiency = matchedSkills.length * 3

  const proficiencyPercentage = maxProficiency > 0
    ? Math.round((proficiencyScore / maxProficiency) * 100)
    : 100

  let proficiencyStatus: ScoreFactor['status'] = 'weak'
  if (proficiencyPercentage >= 75) proficiencyStatus = 'strong'
  else if (proficiencyPercentage >= 50) proficiencyStatus = 'moderate'

  const proficiencyDetails: string[] = []
  if (highProficiency.length > 0) {
    proficiencyDetails.push(`${highProficiency.length} skill(s) at expert/advanced level`)
  }
  if (avgProficiency.length > 0) {
    proficiencyDetails.push(`${avgProficiency.length} skill(s) at intermediate level`)
  }
  if (lowProficiency.length > 0) {
    proficiencyDetails.push(`${lowProficiency.length} skill(s) at beginner level`)
  }

  if (matchedSkills.length > 0) {
    factors.push({
      name: 'Skill Proficiency',
      score: proficiencyScore,
      maxScore: maxProficiency,
      percentage: proficiencyPercentage,
      status: proficiencyStatus,
      details: proficiencyDetails.length > 0 ? proficiencyDetails : ['No proficiency data available'],
    })
  }

  // Generate strengths and gaps
  const strengths: string[] = []
  const gaps: string[] = []

  if (requiredSkillsCoverage >= 80) {
    strengths.push('Strong coverage of required skills')
  } else if (requiredSkillsCoverage < 50) {
    gaps.push('Significant gaps in required skills')
  }

  if (highProficiency.length >= 3) {
    strengths.push(`Advanced expertise in ${highProficiency.length} key areas`)
  }

  if (requiredMissing.length > 0) {
    gaps.push(`Missing ${requiredMissing.length} required skill(s)`)
  }

  if (partiallyMatchedSkills.length > 0) {
    gaps.push(`${partiallyMatchedSkills.length} skill(s) below expected proficiency`)
  }

  if (optionalMatched.length > 2) {
    strengths.push('Has multiple nice-to-have skills')
  }

  // Generate exportable summary
  const generateSummary = () => {
    let summary = `CANDIDATE ASSESSMENT SUMMARY\n`
    summary += `${'='.repeat(40)}\n\n`
    summary += `Candidate: ${candidateName}\n`
    summary += `Position: ${jobTitle}\n`
    summary += `Overall Match Score: ${score}%\n\n`

    summary += `SCORE BREAKDOWN\n`
    summary += `${'-'.repeat(20)}\n`
    factors.forEach((f) => {
      summary += `${f.name}: ${f.percentage}% (${f.status.toUpperCase()})\n`
      f.details.forEach((d) => {
        summary += `  - ${d}\n`
      })
    })

    summary += `\nSTRENGTHS\n`
    summary += `${'-'.repeat(20)}\n`
    strengths.forEach((s) => {
      summary += `+ ${s}\n`
    })

    summary += `\nAREAS OF CONCERN\n`
    summary += `${'-'.repeat(20)}\n`
    gaps.forEach((g) => {
      summary += `- ${g}\n`
    })

    summary += `\n${'='.repeat(40)}\n`
    summary += `Generated on ${new Date().toLocaleDateString()}\n`

    return summary
  }

  const copyToClipboard = async () => {
    const summary = generateSummary()
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadSummary = () => {
    const summary = generateSummary()
    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candidate-assessment-${candidateName.replace(/\s+/g, '-').toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary-600" />
          <span className="font-medium text-gray-900">Score Breakdown</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Overall Score Summary */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              {score >= 80 && `${candidateName} is an excellent match for ${jobTitle}. Highly recommend proceeding with interview.`}
              {score >= 60 && score < 80 && `${candidateName} is a strong candidate for ${jobTitle}. Consider for interview shortlist.`}
              {score >= 40 && score < 60 && `${candidateName} shows potential but has some skill gaps for ${jobTitle}. May need training.`}
              {score < 40 && `${candidateName} may not be the best fit for ${jobTitle}. Significant skill gaps present.`}
            </p>
          </div>

          {/* Factor Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Contribution to Score</h4>
            <div className="space-y-4">
              {factors.map((factor) => (
                <div key={factor.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className={`h-4 w-4 ${getStatusColor(factor.status)}`} />
                      <span className="text-sm font-medium text-gray-700">{factor.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBgColor(factor.status)}`}>
                        {factor.status === 'strong' ? 'Strong' : factor.status === 'moderate' ? 'Moderate' : 'Weak'}
                      </span>
                      <span className={`text-sm font-medium ${getStatusColor(factor.status)}`}>
                        {factor.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getStatusBarColor(factor.status)}`}
                      style={{ width: `${factor.percentage}%` }}
                    />
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1 ml-6 list-disc">
                    {factor.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Gaps */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                Strengths
              </h4>
              {strengths.length > 0 ? (
                <ul className="text-xs text-gray-600 space-y-1">
                  {strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <Star className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">No notable strengths identified</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                <ThumbsDown className="h-4 w-4 text-red-600" />
                Areas of Concern
              </h4>
              {gaps.length > 0 ? (
                <ul className="text-xs text-gray-600 space-y-1">
                  {gaps.map((g, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <Star className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">No significant concerns identified</p>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="pt-3 border-t flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? (
                <Check className="h-4 w-4 mr-1 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? 'Copied!' : 'Copy Summary'}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadSummary}>
              <FileDown className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function getStatusColor(status: ScoreFactor['status']): string {
  switch (status) {
    case 'strong':
      return 'text-green-600'
    case 'moderate':
      return 'text-yellow-600'
    case 'weak':
      return 'text-red-600'
  }
}

function getStatusBgColor(status: ScoreFactor['status']): string {
  switch (status) {
    case 'strong':
      return 'bg-green-100 text-green-700'
    case 'moderate':
      return 'bg-yellow-100 text-yellow-700'
    case 'weak':
      return 'bg-red-100 text-red-700'
  }
}

function getStatusBarColor(status: ScoreFactor['status']): string {
  switch (status) {
    case 'strong':
      return 'bg-green-500'
    case 'moderate':
      return 'bg-yellow-500'
    case 'weak':
      return 'bg-red-500'
  }
}
