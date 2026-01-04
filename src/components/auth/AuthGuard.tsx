import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { LoadingScreen } from '@/components/ui'

interface AuthGuardProps {
  children: ReactNode
  allowedRoles?: ('admin' | 'company' | 'jobseeker')[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  // Show loading while checking auth
  if (!isInitialized || isLoading) {
    return <LoadingScreen />
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = user.role === 'admin' ? '/admin' :
                         user.role === 'company' ? '/company' : '/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}

interface GuestGuardProps {
  children: ReactNode
}

export function GuestGuard({ children }: GuestGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  // Show loading while checking auth
  if (!isInitialized || isLoading) {
    return <LoadingScreen />
  }

  // Redirect to dashboard if already authenticated
  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname
    const redirectPath = from || (
      user.role === 'admin' ? '/admin' :
      user.role === 'company' ? '/company' : '/dashboard'
    )
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}
