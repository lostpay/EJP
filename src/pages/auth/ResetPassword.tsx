import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Lock, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Button, Input, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      // The user should have a session from the recovery link
      if (session) {
        setIsValidSession(true)
      } else {
        // Try to get session from URL hash (Supabase sends tokens in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')

        if (accessToken && type === 'recovery') {
          // Set the session from recovery token
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          })

          if (!error) {
            setIsValidSession(true)
            // Clean up URL
            window.history.replaceState(null, '', window.location.pathname)
            return
          }
        }

        setIsValidSession(false)
      }
    }

    checkSession()
  }, [])

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {}

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setIsSuccess(true)

      // Sign out to clear the recovery session
      await supabase.auth.signOut()

      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      console.error('Error resetting password:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to reset password')
      } else {
        toast.error('Failed to reset password')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center py-8">
            <Spinner size="lg" />
            <p className="text-gray-600 mt-4">Verifying reset link...</p>
          </div>
        </Card>
      </div>
    )
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-center mb-2">Invalid or Expired Link</CardTitle>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired.
              Please request a new password reset link.
            </p>
            <div className="space-y-3">
              <Link to="/forgot-password" className="block">
                <Button className="w-full">
                  Request New Link
                </Button>
              </Link>
              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-center mb-2">Password Reset Successful</CardTitle>
            <p className="text-gray-600 mb-6">
              Your password has been reset successfully.
              You will be redirected to the login page shortly.
            </p>
            <Link to="/login" className="block">
              <Button className="w-full">
                Go to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary-600" />
          </div>
          <CardTitle className="text-center">Reset Your Password</CardTitle>
          <p className="text-gray-600 mt-2">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
            }}
            error={errors.password}
            placeholder="Minimum 6 characters"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }))
            }}
            error={errors.confirmPassword}
            placeholder="Re-enter your new password"
            required
          />

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Reset Password
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
