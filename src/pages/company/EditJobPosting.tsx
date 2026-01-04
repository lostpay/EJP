import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, CardTitle, Button, Input, Textarea, Select, Spinner } from '@/components/ui'
import { ArrowLeft, Save, X } from 'lucide-react'
import type { Skill, JobPosting, JobPostingSkill } from '@/types'
import toast from 'react-hot-toast'

const jobTypeOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

type JobPostingWithSkills = JobPosting & {
  job_posting_skills: (JobPostingSkill & { skills: Skill })[]
}

export function EditJobPosting() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { company } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<{ skill: Skill; is_required: boolean }[]>([])
  const [skillSearch, setSkillSearch] = useState('')
  const [showSkillDropdown, setShowSkillDropdown] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    job_type: 'full-time' as 'full-time' | 'part-time' | 'contract' | 'internship',
    location: '',
    remote_ok: false,
    salary_min: '',
    salary_max: '',
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (id) {
      fetchJobPosting()
    }
    fetchSkills()
  }, [id])

  const fetchJobPosting = async () => {
    const { data, error } = await supabase
      .from('job_postings')
      .select(`
        *,
        job_posting_skills (
          *,
          skills (*)
        )
      `)
      .eq('id', id!)
      .single()

    if (error || !data) {
      toast.error('Job posting not found')
      navigate('/company/jobs')
      return
    }

    const job = data as JobPostingWithSkills

    // Verify ownership
    if (job.company_id !== company?.id) {
      toast.error('You do not have permission to edit this job')
      navigate('/company/jobs')
      return
    }

    setFormData({
      title: job.title,
      description: job.description,
      job_type: job.job_type || 'full-time',
      location: job.location || '',
      remote_ok: job.remote_ok,
      salary_min: job.salary_min?.toString() || '',
      salary_max: job.salary_max?.toString() || '',
      is_active: job.is_active,
    })

    setSelectedSkills(
      job.job_posting_skills.map((jps) => ({
        skill: jps.skills,
        is_required: jps.is_required,
      }))
    )

    setIsLoading(false)
  }

  const fetchSkills = async () => {
    const { data } = await supabase
      .from('skills')
      .select('*')
      .order('name')

    if (data) {
      setAllSkills(data)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required'
    } else if (formData.description.length < 50) {
      newErrors.description = 'Description should be at least 50 characters'
    }

    if (formData.salary_min && formData.salary_max) {
      const min = parseInt(formData.salary_min)
      const max = parseInt(formData.salary_max)
      if (min > max) {
        newErrors.salary_max = 'Maximum salary must be greater than minimum'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !id) return

    setIsSubmitting(true)

    // Update job posting
    const { error: jobError } = await supabase
      .from('job_postings')
      .update({
        title: formData.title,
        description: formData.description,
        job_type: formData.job_type,
        location: formData.location || null,
        remote_ok: formData.remote_ok,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        is_active: formData.is_active,
      })
      .eq('id', id)

    if (jobError) {
      toast.error('Failed to update job posting')
      console.error(jobError)
      setIsSubmitting(false)
      return
    }

    // Update skills - delete existing and add new
    await supabase
      .from('job_posting_skills')
      .delete()
      .eq('job_posting_id', id)

    if (selectedSkills.length > 0) {
      const skillInserts = selectedSkills.map((s) => ({
        job_posting_id: id,
        skill_id: s.skill.id,
        is_required: s.is_required,
      }))

      const { error: skillsError } = await supabase
        .from('job_posting_skills')
        .insert(skillInserts)

      if (skillsError) {
        console.error('Error updating skills:', skillsError)
      }
    }

    toast.success('Job posting updated!')
    navigate('/company/jobs')

    setIsSubmitting(false)
  }

  const filteredSkills = allSkills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !selectedSkills.some((s) => s.skill.id === skill.id)
  )

  const addSkill = (skill: Skill) => {
    setSelectedSkills([...selectedSkills, { skill, is_required: true }])
    setSkillSearch('')
    setShowSkillDropdown(false)
  }

  const removeSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s.skill.id !== skillId))
  }

  const toggleRequired = (skillId: string) => {
    setSelectedSkills(
      selectedSkills.map((s) =>
        s.skill.id === skillId ? { ...s, is_required: !s.is_required } : s
      )
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/company/jobs')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Job Posting</h1>
          <p className="text-gray-600">Update your job posting details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <Card className="mb-6">
          <CardTitle className="mb-6">Basic Information</CardTitle>

          <div className="space-y-4">
            <Input
              id="title"
              label="Job Title"
              placeholder="e.g. Senior Frontend Developer"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              error={errors.title}
              required
            />

            <Textarea
              id="description"
              label="Job Description"
              placeholder="Describe the role, responsibilities, requirements..."
              rows={8}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              error={errors.description}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Job Type"
                value={formData.job_type}
                onChange={(e) => setFormData({ ...formData, job_type: e.target.value as typeof formData.job_type })}
                options={jobTypeOptions}
              />
              <Input
                id="location"
                label="Location"
                placeholder="e.g. San Francisco, CA"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.remote_ok}
                  onChange={(e) => setFormData({ ...formData, remote_ok: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Remote work allowed</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Active (visible to job seekers)</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Salary */}
        <Card className="mb-6">
          <CardTitle className="mb-6">Salary Range (Optional)</CardTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="salary_min"
              label="Minimum Salary"
              type="number"
              placeholder="50000"
              value={formData.salary_min}
              onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
              hint="Annual salary in USD"
            />
            <Input
              id="salary_max"
              label="Maximum Salary"
              type="number"
              placeholder="80000"
              value={formData.salary_max}
              onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
              error={errors.salary_max}
              hint="Annual salary in USD"
            />
          </div>
        </Card>

        {/* Skills */}
        <Card className="mb-6">
          <CardTitle className="mb-6">Required Skills</CardTitle>

          {/* Skill Search */}
          <div className="relative mb-4">
            <Input
              placeholder="Search skills..."
              value={skillSearch}
              onChange={(e) => {
                setSkillSearch(e.target.value)
                setShowSkillDropdown(true)
              }}
              onFocus={() => setShowSkillDropdown(true)}
            />
            {showSkillDropdown && skillSearch && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                {filteredSkills.length > 0 ? (
                  filteredSkills.slice(0, 10).map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      {skill.name}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-2 text-gray-500">No skills found</p>
                )}
              </div>
            )}
          </div>

          {/* Selected Skills */}
          {selectedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map(({ skill, is_required }) => (
                <div
                  key={skill.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                    is_required
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <span className="text-sm font-medium">{skill.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleRequired(skill.id)}
                    className="text-xs underline"
                  >
                    {is_required ? 'Required' : 'Nice-to-have'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill.id)}
                    className="p-0.5 hover:bg-gray-200 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No skills selected</p>
          )}
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/company/jobs')}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
