import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Button, Input, Select } from '@/components/ui'
import toast from 'react-hot-toast'

const roleOptions = [
  { value: 'jobseeker', label: 'Job Seeker' },
  { value: 'company', label: 'Company' },
  { value: 'admin', label: 'Admin' },
]

interface FormData {
  email: string
  password: string
  confirmPassword: string
  role: 'admin' | 'company' | 'jobseeker'
  fullName: string
  companyName: string
}

export function CreateUser() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'jobseeker',
    fullName: '',
    companyName: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Role-specific validation
    if (formData.role === 'jobseeker' && !formData.fullName) {
      newErrors.fullName = 'Full name is required for job seekers'
    }

    if (formData.role === 'company' && !formData.companyName) {
      newErrors.companyName = 'Company name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)

    try {
      // Create the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: formData.role,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create user')
      }

      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          role: formData.role,
          is_active: true,
        })

      if (profileError) throw profileError

      // Create role-specific record
      if (formData.role === 'jobseeker') {
        const { error: jobSeekerError } = await supabase
          .from('job_seekers')
          .insert({
            user_id: authData.user.id,
            full_name: formData.fullName,
          })

        if (jobSeekerError) throw jobSeekerError
      } else if (formData.role === 'company') {
        const { error: companyError } = await supabase
          .from('companies')
          .insert({
            user_id: authData.user.id,
            company_name: formData.companyName,
          })

        if (companyError) throw companyError
      }

      toast.success('User created successfully')
      navigate('/admin/users')
    } catch (error) {
      console.error('Error creating user:', error)
      if (error instanceof Error) {
        if (error.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered' })
        } else {
          toast.error(error.message || 'Failed to create user')
        }
      } else {
        toast.error('Failed to create user')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/users"
          className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to User Management
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
        <p className="text-gray-600">Add a new user to the platform</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            User Information
          </CardTitle>

          {/* Email */}
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            placeholder="user@example.com"
            required
          />

          {/* Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              placeholder="Minimum 6 characters"
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              placeholder="Re-enter password"
              required
            />
          </div>

          {/* Role */}
          <Select
            label="User Role"
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value)}
            options={roleOptions}
          />

          {/* Role-specific fields */}
          {formData.role === 'jobseeker' && (
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              error={errors.fullName}
              placeholder="John Doe"
              required
            />
          )}

          {formData.role === 'company' && (
            <Input
              label="Company Name"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              error={errors.companyName}
              placeholder="Acme Corporation"
              required
            />
          )}

          {/* Info about email confirmation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The user will receive an email confirmation link.
              They will need to verify their email before they can log in.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Link to="/admin/users">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
