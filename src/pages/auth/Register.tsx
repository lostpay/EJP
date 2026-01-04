import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { Button, Input } from '@/components/ui'
import { User, Building2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

export function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: '' as 'company' | 'jobseeker' | '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.role) {
      newErrors.role = 'Please select an account type'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const { error } = await register(formData.email, formData.password, formData.role as 'company' | 'jobseeker')

    if (error) {
      toast.error(error)
      return
    }

    toast.success('Account created successfully!')
    navigate(formData.role === 'company' ? '/company/profile' : '/profile')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Create your account</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Selection */}
        <div>
          <label className="label">I am a...</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'jobseeker' })}
              className={clsx(
                'p-4 border rounded-lg text-center transition-colors',
                formData.role === 'jobseeker'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <User className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Job Seeker</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'company' })}
              className={clsx(
                'p-4 border rounded-lg text-center transition-colors',
                formData.role === 'company'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Building2 className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Company</span>
            </button>
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
        </div>

        <Input
          id="email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
        />

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="Create a password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          error={errors.password}
          hint="Must be at least 6 characters"
        />

        <Input
          id="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          error={errors.confirmPassword}
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
