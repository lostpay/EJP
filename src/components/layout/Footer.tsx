import { Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Briefcase className="h-8 w-8 text-primary-400" />
              <span className="font-bold text-xl text-white">Engineer Job Portal</span>
            </div>
            <p className="text-gray-400 max-w-md">
              A specialized job portal for engineers, connecting talented professionals
              with innovative companies based on technical skills and experience.
            </p>
          </div>

          {/* For Job Seekers */}
          <div>
            <h3 className="font-semibold text-white mb-4">For Job Seekers</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/jobs" className="hover:text-white transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  My Applications
                </Link>
              </li>
            </ul>
          </div>

          {/* For Companies */}
          <div>
            <h3 className="font-semibold text-white mb-4">For Companies</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Post a Job
                </Link>
              </li>
              <li>
                <Link to="/company" className="hover:text-white transition-colors">
                  Manage Postings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Engineer Job Portal. All rights reserved.</p>
          <p className="mt-2 text-sm">
            Feng Chia University - Department of Computer Science
          </p>
        </div>
      </div>
    </footer>
  )
}
