import { Outlet, Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center space-x-2">
          <Briefcase className="h-12 w-12 text-primary-600" />
          <span className="font-bold text-2xl text-gray-900">EJP</span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
