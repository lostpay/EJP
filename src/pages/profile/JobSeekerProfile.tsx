import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, CardTitle, Button, Input, Textarea, Spinner } from '@/components/ui'
import { SkillsManager } from '@/components/profile/SkillsManager'
import { ResumeUpload } from '@/components/profile/ResumeUpload'
import { User, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export function JobSeekerProfile() {
  const { jobSeeker, refreshProfile } = useAuthStore()
  const [isLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location: '',
    bio: '',
    expected_salary: '',
    remote_ok: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (jobSeeker) {
      setFormData({
        full_name: jobSeeker.full_name || '',
        phone: jobSeeker.phone || '',
        location: jobSeeker.location || '',
        bio: jobSeeker.bio || '',
        expected_salary: jobSeeker.expected_salary || '',
        remote_ok: jobSeeker.remote_ok || false,
      })
    }
  }, [jobSeeker])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (formData.phone && !/^[+]?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !jobSeeker) return

    setIsSaving(true)

    const { error } = await supabase
      .from('job_seekers')
      .update({
        full_name: formData.full_name,
        phone: formData.phone || null,
        location: formData.location || null,
        bio: formData.bio || null,
        expected_salary: formData.expected_salary || null,
        remote_ok: formData.remote_ok,
      })
      .eq('id', jobSeeker.id)

    if (error) {
      toast.error('Failed to update profile')
      console.error(error)
    } else {
      toast.success('Profile updated successfully')
      await refreshProfile()
    }

    setIsSaving(false)
  }

  const profileCompletion = () => {
    if (!jobSeeker) return 0
    let score = 0
    if (jobSeeker.full_name) score += 20
    if (jobSeeker.phone) score += 15
    if (jobSeeker.location) score += 15
    if (jobSeeker.bio) score += 20
    if (jobSeeker.resume_url) score += 30
    return score
  }

  if (isLoading || !jobSeeker) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600">Manage your profile information to help employers find you.</p>
      </div>

      {/* Profile Completion */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Profile Completion</h3>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${profileCompletion()}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">{profileCompletion()}% complete</p>
          </div>
        </div>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardTitle className="mb-6">Basic Information</CardTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="full_name"
              label="Full Name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              error={errors.full_name}
              required
            />
            <Input
              id="phone"
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={errors.phone}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="location"
              label="Location"
              placeholder="New York, NY"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <Input
              id="expected_salary"
              label="Expected Salary"
              placeholder="$80,000 - $100,000"
              value={formData.expected_salary}
              onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
              hint="Optional - visible to employers"
            />
          </div>

          <Textarea
            id="bio"
            label="Professional Summary"
            placeholder="Tell employers about yourself, your experience, and what you're looking for..."
            rows={4}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remote_ok"
              checked={formData.remote_ok}
              onChange={(e) => setFormData({ ...formData, remote_ok: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="remote_ok" className="text-sm text-gray-700">
              I'm open to remote work opportunities
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Resume Upload */}
      <Card>
        <CardTitle className="mb-6">Resume</CardTitle>
        <ResumeUpload />
      </Card>

      {/* Skills */}
      <Card>
        <CardTitle className="mb-6">Skills</CardTitle>
        <SkillsManager />
      </Card>
    </div>
  )
}
