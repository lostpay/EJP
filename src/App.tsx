import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { MainLayout, AuthLayout, DashboardLayout } from '@/components/layout'
import { AuthGuard, GuestGuard } from '@/components/auth'
import { LoadingScreen } from '@/components/ui'
import {
  Home,
  NotFound,
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  JobList,
  JobDetail,
  JobSeekerDashboard,
  CompanyDashboard,
  JobSeekerProfile,
  ApplicationHistory,
  CompanyProfile,
  CreateJobPosting,
  EditJobPosting,
  ManageJobPostings,
  ViewApplicants,
  HiringPipeline,
  PipelineAnalytics,
  AdminDashboard,
  UserManagement,
  JobPostingManagement,
  CreateUser,
  Messages,
  Bookmarks,
  MarketInsights,
} from '@/pages'

function App() {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!isInitialized) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      {/* Public routes with main layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Route>

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestGuard>
              <Login />
            </GuestGuard>
          }
        />
        <Route
          path="/register"
          element={
            <GuestGuard>
              <Register />
            </GuestGuard>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestGuard>
              <ForgotPassword />
            </GuestGuard>
          }
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
      </Route>

      {/* Job Seeker routes */}
      <Route
        element={
          <AuthGuard allowedRoles={['jobseeker']}>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<JobSeekerDashboard />} />
        <Route path="/profile" element={<JobSeekerProfile />} />
        <Route path="/applications" element={<ApplicationHistory />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/market-insights" element={<MarketInsights />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:oderId" element={<Messages />} />
      </Route>

      {/* Company routes */}
      <Route
        element={
          <AuthGuard allowedRoles={['company']}>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route path="/company" element={<CompanyDashboard />} />
        <Route path="/company/profile" element={<CompanyProfile />} />
        <Route path="/company/jobs" element={<ManageJobPostings />} />
        <Route path="/company/jobs/new" element={<CreateJobPosting />} />
        <Route path="/company/jobs/:id/edit" element={<EditJobPosting />} />
        <Route path="/company/jobs/:id/applicants" element={<ViewApplicants />} />
        <Route path="/company/jobs/:id/pipeline" element={<HiringPipeline />} />
        <Route path="/company/analytics" element={<PipelineAnalytics />} />
        <Route path="/company/messages" element={<Messages />} />
        <Route path="/company/messages/:oderId" element={<Messages />} />
      </Route>

      {/* Admin routes */}
      <Route
        element={
          <AuthGuard allowedRoles={['admin']}>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/users/new" element={<CreateUser />} />
        <Route path="/admin/jobs" element={<JobPostingManagement />} />
        <Route path="/admin/settings" element={<div className="p-4">Settings - Coming soon</div>} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
