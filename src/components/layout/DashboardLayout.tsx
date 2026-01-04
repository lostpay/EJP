import { Outlet, Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { Header } from './Header'
import {
  LayoutDashboard,
  User,
  Briefcase,
  FileText,
  MessageSquare,
  Bookmark,
  Building2,
  Users,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/stores'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

export function DashboardLayout() {
  const { user } = useAuthStore()
  const location = useLocation()

  const getNavItems = (): NavItem[] => {
    switch (user?.role) {
      case 'jobseeker':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: 'Profile', href: '/profile', icon: <User className="h-5 w-5" /> },
          { label: 'My Applications', href: '/applications', icon: <FileText className="h-5 w-5" /> },
          { label: 'Bookmarks', href: '/bookmarks', icon: <Bookmark className="h-5 w-5" /> },
          { label: 'Messages', href: '/messages', icon: <MessageSquare className="h-5 w-5" /> },
        ]
      case 'company':
        return [
          { label: 'Dashboard', href: '/company', icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: 'Company Profile', href: '/company/profile', icon: <Building2 className="h-5 w-5" /> },
          { label: 'Job Postings', href: '/company/jobs', icon: <Briefcase className="h-5 w-5" /> },
          { label: 'Messages', href: '/company/messages', icon: <MessageSquare className="h-5 w-5" /> },
        ]
      case 'admin':
        return [
          { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: 'Users', href: '/admin/users', icon: <Users className="h-5 w-5" /> },
          { label: 'Job Postings', href: '/admin/jobs', icon: <Briefcase className="h-5 w-5" /> },
          { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={clsx(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                        location.pathname === item.href
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
