import { Link } from 'react-router-dom'
import { User, MapPin, Calendar, Download, MessageSquare, Star } from 'lucide-react'
import { Card, Button, Badge, ApplicationStatusBadge, MatchScoreBadge } from '@/components/ui'
import { CandidateSkillsAnalysis } from './CandidateSkillsAnalysis'
import type { Application, JobSeeker, JobSeekerSkill, Skill } from '@/types'
import type { CandidateMatchResult } from '@/services/employerMatchService'

type ApplicantWithDetails = Application & {
  job_seekers: JobSeeker & {
    job_seeker_skills: (JobSeekerSkill & { skills: Skill })[]
  }
}

interface CandidateMatchCardProps {
  applicant: ApplicantWithDetails
  matchResult?: CandidateMatchResult
  onViewDetails: (applicant: ApplicantWithDetails) => void
  onUpdateStatus: (applicant: ApplicantWithDetails) => void
  onQuickAdvance?: (applicant: ApplicantWithDetails) => void
  onQuickReject?: (applicant: ApplicantWithDetails) => void
  isTopMatch?: boolean
  showSkillsAnalysis?: boolean
  selected?: boolean
  onSelect?: (applicant: ApplicantWithDetails, selected: boolean) => void
}

export function CandidateMatchCard({
  applicant,
  matchResult,
  onViewDetails,
  onUpdateStatus,
  onQuickAdvance,
  onQuickReject,
  isTopMatch = false,
  showSkillsAnalysis = false,
  selected = false,
  onSelect,
}: CandidateMatchCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getResumeUrl = () => {
    return applicant.resume_url || applicant.job_seekers?.resume_url
  }

  const canAdvance = ['pending', 'reviewing', 'interview'].includes(applicant.status)
  const canReject = ['pending', 'reviewing', 'interview'].includes(applicant.status)

  return (
    <Card
      className={`hover:shadow-md transition-all ${
        isTopMatch ? 'ring-2 ring-green-500 ring-opacity-50' : ''
      } ${selected ? 'bg-primary-50 border-primary-300' : ''}`}
    >
      <div className="flex flex-col gap-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {/* Selection Checkbox */}
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect(applicant, e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
            )}

            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-primary-600" />
              </div>
              {isTopMatch && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Star className="h-3 w-3 text-white fill-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">
                  {applicant.job_seekers?.full_name || 'Anonymous'}
                </h3>
                {isTopMatch && (
                  <Badge variant="success" size="sm">Top Match</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                {applicant.job_seekers?.location && (
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {applicant.job_seekers.location}
                  </span>
                )}
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(applicant.applied_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Match Score & Status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {matchResult && (
              <MatchScoreBadge score={matchResult.score} size="md" showLabel />
            )}
            <ApplicationStatusBadge status={applicant.status} />
          </div>
        </div>

        {/* Skills Analysis (Compact) */}
        {showSkillsAnalysis && matchResult && (
          <CandidateSkillsAnalysis matchResult={matchResult} compact />
        )}

        {/* Quick Skills Preview */}
        {!showSkillsAnalysis && applicant.job_seekers?.job_seeker_skills?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {applicant.job_seekers.job_seeker_skills.slice(0, 5).map((skill) => (
              <Badge key={skill.id} variant="gray" size="sm">
                {skill.skills?.name}
              </Badge>
            ))}
            {applicant.job_seekers.job_seeker_skills.length > 5 && (
              <Badge variant="gray" size="sm">
                +{applicant.job_seekers.job_seeker_skills.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {/* Cover Letter Preview */}
        {applicant.cover_letter && (
          <p className="text-sm text-gray-600 line-clamp-2">
            <span className="font-medium">Cover: </span>
            {applicant.cover_letter}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewDetails(applicant)}>
              View Details
            </Button>

            {getResumeUrl() && (
              <a href={getResumeUrl()!} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              </a>
            )}

            <Link to={`/company/messages/${applicant.job_seekers?.user_id}`}>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-1" />
                Message
              </Button>
            </Link>
          </div>

          <div className="flex gap-2">
            {canAdvance && onQuickAdvance && (
              <Button size="sm" onClick={() => onQuickAdvance(applicant)}>
                Advance
              </Button>
            )}
            {canReject && onQuickReject && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => onQuickReject(applicant)}
              >
                Reject
              </Button>
            )}
            {applicant.status !== 'withdrawn' && !onQuickAdvance && !onQuickReject && (
              <Button size="sm" onClick={() => onUpdateStatus(applicant)}>
                Update Status
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
