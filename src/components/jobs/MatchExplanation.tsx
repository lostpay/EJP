import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, MapPin, Wifi, Briefcase, Star, TrendingUp, AlertTriangle } from 'lucide-react'
import type { MatchScoreResult } from '@/types'

interface MatchExplanationProps {
  matchScore: MatchScoreResult
  jobLocation?: string | null
  jobRemoteOk?: boolean
  seekerLocation?: string | null
  seekerRemoteOk?: boolean
}

interface ScoreFactor {
  name: string
  icon: React.ReactNode
  score: number
  maxScore: number
  weight: number
  explanation: string
  status: 'excellent' | 'good' | 'partial' | 'missing'
}

export function MatchExplanation({
  matchScore,
  jobLocation,
  jobRemoteOk,
  seekerLocation,
  seekerRemoteOk,
}: MatchExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate score factors
  const factors: ScoreFactor[] = []

  // Skills Factor (60% weight)
  const skillsWeight = 60
  const matchedRequired = matchScore.matched_skills.filter((s) => s.is_required).length
  const matchedOptional = matchScore.matched_skills.filter((s) => !s.is_required).length
  const missingRequired = matchScore.missing_skills.filter((s) => s.is_required).length
  const missingOptional = matchScore.missing_skills.filter((s) => !s.is_required).length
  const totalRequired = matchedRequired + missingRequired
  const totalOptional = matchedOptional + missingOptional

  // Calculate skills score based on proficiency
  let skillsScore = 0
  let maxSkillsScore = 0

  // Required skills (weighted 2x)
  matchScore.matched_skills.forEach((skill) => {
    const proficiencyWeight = getProficiencyWeight(skill.proficiency)
    const baseWeight = skill.is_required ? 2 : 1
    skillsScore += baseWeight * proficiencyWeight
    maxSkillsScore += baseWeight
  })

  matchScore.missing_skills.forEach((skill) => {
    const baseWeight = skill.is_required ? 2 : 1
    maxSkillsScore += baseWeight
  })

  const skillsPercentage = maxSkillsScore > 0 ? Math.round((skillsScore / maxSkillsScore) * 100) : 0

  let skillsStatus: ScoreFactor['status'] = 'missing'
  if (skillsPercentage >= 70) skillsStatus = 'excellent'
  else if (skillsPercentage >= 50) skillsStatus = 'good'
  else if (skillsPercentage >= 25) skillsStatus = 'partial'

  let skillsExplanation = ''
  if (totalRequired > 0) {
    skillsExplanation = `You match ${matchedRequired} of ${totalRequired} required skills`
    if (totalOptional > 0) {
      skillsExplanation += ` and ${matchedOptional} of ${totalOptional} optional skills.`
    } else {
      skillsExplanation += '.'
    }
  } else if (totalOptional > 0) {
    skillsExplanation = `You match ${matchedOptional} of ${totalOptional} skills for this position.`
  } else {
    skillsExplanation = 'No specific skills required for this position.'
  }

  // Add proficiency note if applicable
  const highProficiencySkills = matchScore.matched_skills.filter(
    (s) => s.proficiency === 'expert' || s.proficiency === 'advanced'
  )
  if (highProficiencySkills.length > 0) {
    skillsExplanation += ` Your advanced proficiency in ${highProficiencySkills.length} skill${highProficiencySkills.length > 1 ? 's' : ''} boosts your score.`
  }

  factors.push({
    name: 'Skills Match',
    icon: <Briefcase className="h-4 w-4" />,
    score: Math.round(skillsScore * (skillsWeight / maxSkillsScore) || 0),
    maxScore: skillsWeight,
    weight: skillsWeight,
    explanation: skillsExplanation,
    status: skillsStatus,
  })

  // Location Factor (20% weight)
  const locationWeight = 20
  let locationScore = 0
  let locationStatus: ScoreFactor['status'] = 'missing'
  let locationExplanation = ''

  if (matchScore.location_match) {
    locationScore = locationWeight
    locationStatus = 'excellent'
    locationExplanation = jobLocation && seekerLocation
      ? `Your location (${seekerLocation}) matches the job location (${jobLocation}).`
      : 'Your location preferences align with this job.'
  } else if (!jobLocation) {
    locationScore = locationWeight
    locationStatus = 'excellent'
    locationExplanation = 'This job has no specific location requirement.'
  } else if (seekerLocation && jobLocation) {
    locationScore = 0
    locationStatus = 'missing'
    locationExplanation = `This job is located in ${jobLocation}, which doesn't match your location (${seekerLocation}).`
  } else {
    locationScore = locationWeight * 0.5
    locationStatus = 'partial'
    locationExplanation = 'Location information is incomplete for accurate matching.'
  }

  factors.push({
    name: 'Location',
    icon: <MapPin className="h-4 w-4" />,
    score: locationScore,
    maxScore: locationWeight,
    weight: locationWeight,
    explanation: locationExplanation,
    status: locationStatus,
  })

  // Remote Work Factor (20% weight)
  const remoteWeight = 20
  let remoteScore = 0
  let remoteStatus: ScoreFactor['status'] = 'missing'
  let remoteExplanation = ''

  if (matchScore.remote_match) {
    remoteScore = remoteWeight
    remoteStatus = 'excellent'
    if (jobRemoteOk && seekerRemoteOk) {
      remoteExplanation = 'This job offers remote work, which matches your preference.'
    } else if (!jobRemoteOk && !seekerRemoteOk) {
      remoteExplanation = 'This is an on-site position, matching your preference for office work.'
    } else {
      remoteExplanation = 'Remote work preferences are compatible.'
    }
  } else if (jobRemoteOk && !seekerRemoteOk) {
    remoteScore = remoteWeight * 0.75
    remoteStatus = 'good'
    remoteExplanation = 'This job offers remote work. You prefer on-site, but remote option is available.'
  } else if (!jobRemoteOk && seekerRemoteOk) {
    remoteScore = 0
    remoteStatus = 'missing'
    remoteExplanation = 'This is an on-site position, but you prefer remote work.'
  } else {
    remoteScore = remoteWeight * 0.5
    remoteStatus = 'partial'
    remoteExplanation = 'Remote work preferences could not be fully determined.'
  }

  factors.push({
    name: 'Remote Work',
    icon: <Wifi className="h-4 w-4" />,
    score: remoteScore,
    maxScore: remoteWeight,
    weight: remoteWeight,
    explanation: remoteExplanation,
    status: remoteStatus,
  })

  // Generate overall explanation
  const getOverallExplanation = () => {
    if (matchScore.score >= 80) {
      return "You're an excellent match for this position! Your skills and preferences align very well with what the employer is looking for."
    } else if (matchScore.score >= 60) {
      return "You're a strong match for this role. Consider highlighting your relevant experience when applying."
    } else if (matchScore.score >= 40) {
      return "You have some relevant qualifications for this role. Focus on transferable skills in your application."
    } else {
      return "This role may require skills or preferences that differ from your profile. Consider upskilling if this area interests you."
    }
  }

  // Generate recommendations
  const getRecommendations = () => {
    const recommendations: string[] = []

    // Skills recommendations
    const missingRequiredSkills = matchScore.missing_skills.filter((s) => s.is_required)
    if (missingRequiredSkills.length > 0) {
      const skillNames = missingRequiredSkills.slice(0, 3).map((s) => s.skill_name).join(', ')
      recommendations.push(
        `Consider learning ${skillNames}${missingRequiredSkills.length > 3 ? ` and ${missingRequiredSkills.length - 3} more required skills` : ''} to improve your match.`
      )
    }

    // Proficiency recommendations
    const lowProficiencySkills = matchScore.matched_skills.filter(
      (s) => s.is_required && (s.proficiency === 'beginner' || s.proficiency === 'intermediate')
    )
    if (lowProficiencySkills.length > 0) {
      recommendations.push(
        `Improving your proficiency in ${lowProficiencySkills[0].skill_name} could increase your match score.`
      )
    }

    // Location/Remote recommendations
    if (!matchScore.location_match && !matchScore.remote_match) {
      recommendations.push(
        'Update your location preferences in your profile if you are open to relocation.'
      )
    }

    return recommendations
  }

  const recommendations = getRecommendations()

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary-600" />
          <span className="font-medium text-gray-900">Why this match?</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Overall Explanation */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{getOverallExplanation()}</p>
          </div>

          {/* Score Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Score Breakdown</h4>
            <div className="space-y-3">
              {factors.map((factor) => (
                <div key={factor.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={getStatusColor(factor.status)}>{factor.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{factor.name}</span>
                      <span className="text-xs text-gray-400">({factor.weight}% weight)</span>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(factor.status)}`}>
                      {Math.round((factor.score / factor.maxScore) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getStatusBarColor(factor.status)}`}
                      style={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">{factor.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How Scoring Works */}
          <div className="pt-3 border-t">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              How Scoring Works
            </h4>
            <ul className="text-xs text-gray-600 space-y-1 ml-5 list-disc">
              <li><strong>Skills (60%):</strong> Required skills count 2x. Higher proficiency increases score.</li>
              <li><strong>Location (20%):</strong> Matching location gives full points.</li>
              <li><strong>Remote Work (20%):</strong> Matching remote preferences gives full points.</li>
            </ul>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="pt-3 border-t">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                How to Improve Your Match
              </h4>
              <ul className="text-xs text-gray-600 space-y-1.5">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getProficiencyWeight(proficiency: string | null): number {
  switch (proficiency) {
    case 'expert':
      return 1.0
    case 'advanced':
      return 0.85
    case 'intermediate':
      return 0.7
    case 'beginner':
      return 0.5
    default:
      return 0.7
  }
}

function getStatusColor(status: ScoreFactor['status']): string {
  switch (status) {
    case 'excellent':
      return 'text-green-600'
    case 'good':
      return 'text-blue-600'
    case 'partial':
      return 'text-yellow-600'
    case 'missing':
      return 'text-red-600'
  }
}

function getStatusBarColor(status: ScoreFactor['status']): string {
  switch (status) {
    case 'excellent':
      return 'bg-green-500'
    case 'good':
      return 'bg-blue-500'
    case 'partial':
      return 'bg-yellow-500'
    case 'missing':
      return 'bg-red-500'
  }
}
