import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, User, LogOut, Briefcase, Settings, FileText, Bookmark, MessageSquare, Users, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { Button } from '@/components/ui'
import { clsx } from 'clsx'

interface NavLinkProps {
  to: string
  children: React.ReactNode
  onClick?: () => void
}

function NavLink({ to, children, onClick }: NavLinkProps) {
  const location = useLocation()
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <Link
      to={to}
      onClick={onClick}
      className={clsx(
        'transition-colors',
        isActive
          ? 'text-primary-600 font-medium'
          : 'text-gray-600 hover:text-gray-900'
      )}
    >
      {children}
    </Link>
  )
}

export function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'admin':
        return '/admin'
      case 'company':
        return '/company'
      case 'jobseeker':
        return '/dashboard'
      default:
        return '/'
    }
  }

  const getProfileLink = () => {
    return user?.role === 'company' ? '/company/profile' : '/profile'
  }

  // Role-specific navigation items for authenticated users
  const getNavItems = () => {
    if (!user) return []

    switch (user.role) {
      case 'jobseeker':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/applications', label: 'My Applications', icon: FileText },
          { to: '/bookmarks', label: 'Saved Jobs', icon: Bookmark },
        ]
      case 'company':
        return [
          { to: '/company', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/company/jobs', label: 'Job Postings', icon: Briefcase },
        ]
      case 'admin':
        return [
          { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/admin/users', label: 'Users', icon: Users },
          { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Briefcase className="h-8 w-8 text-primary-600" />
            <span className="font-bold text-xl text-gray-900">EJP</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink to="/jobs">Browse Jobs</NavLink>

            {/* Role-specific navigation */}
            {user && navItems.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-600" />
                  </div>
                  <span className="font-medium max-w-[120px] truncate">{user.email}</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <Link
                      to={getDashboardLink()}
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                    <Link
                      to={getProfileLink()}
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    {user.role !== 'admin' && (
                      <Link
                        to={user.role === 'company' ? '/company/messages' : '/messages'}
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Messages
                      </Link>
                    )}
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/register">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <NavLink to="/jobs" onClick={() => setIsMenuOpen(false)}>
                Browse Jobs
              </NavLink>

              {user ? (
                <>
                  {/* Role-specific mobile navigation */}
                  {navItems.map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={() => setIsMenuOpen(false)}>
                      <span className="flex items-center">
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </span>
                    </NavLink>
                  ))}
                  <hr className="border-gray-200" />
                  <NavLink to={getProfileLink()} onClick={() => setIsMenuOpen(false)}>
                    <span className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Profile
                    </span>
                  </NavLink>
                  {user.role !== 'admin' && (
                    <NavLink
                      to={user.role === 'company' ? '/company/messages' : '/messages'}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Messages
                      </span>
                    </NavLink>
                  )}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      handleLogout()
                    }}
                    className="flex items-center text-left text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-gray-600 hover:text-gray-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
