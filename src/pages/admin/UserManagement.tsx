import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users, Building2, User, ToggleLeft, ToggleRight, Trash2, Eye, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, Button, Input, Select, Spinner, EmptyState, Modal, Badge } from '@/components/ui'
import type { Profile, Company, JobSeeker } from '@/types'
import toast from 'react-hot-toast'

type UserWithDetails = Profile & {
  companies?: Company | null
  job_seekers?: JobSeeker | null
}

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'company', label: 'Company' },
  { value: 'jobseeker', label: 'Job Seeker' },
]

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const USERS_PER_PAGE = 10

export function UserManagement() {
  const [users, setUsers] = useState<UserWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null)

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserWithDetails | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle status loading
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [searchQuery, roleFilter, statusFilter, currentPage])

  const fetchUsers = async () => {
    setIsLoading(true)

    try {
      // Build the query - use maybeSingle for the relations since it's a one-to-one
      let query = supabase
        .from('profiles')
        .select(`
          *,
          companies:companies!companies_user_id_fkey(*),
          job_seekers:job_seekers!job_seekers_user_id_fkey(*)
        `, { count: 'exact' })

      // Apply search filter
      if (searchQuery) {
        query = query.ilike('email', `%${searchQuery}%`)
      }

      // Apply role filter
      if (roleFilter) {
        query = query.eq('role', roleFilter as Profile['role'])
      }

      // Apply status filter
      if (statusFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false)
      }

      // Apply pagination
      const from = (currentPage - 1) * USERS_PER_PAGE
      const to = from + USERS_PER_PAGE - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Transform the data to handle arrays from Supabase joins
      const transformedData = (data || []).map((user: Record<string, unknown>) => ({
        ...user,
        companies: Array.isArray(user.companies) ? user.companies[0] || null : user.companies,
        job_seekers: Array.isArray(user.job_seekers) ? user.job_seekers[0] || null : user.job_seekers,
      })) as UserWithDetails[]

      setUsers(transformedData)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserStatus = async (user: UserWithDetails) => {
    setTogglingUserId(user.id)

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to update user status')
      console.error(error)
    } else {
      toast.success(user.is_active ? 'User deactivated' : 'User activated')
      setUsers(
        users.map((u) =>
          u.id === user.id ? { ...u, is_active: !u.is_active } : u
        )
      )
    }

    setTogglingUserId(null)
  }

  const openDeleteModal = (user: UserWithDetails) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    setIsDeleting(true)

    try {
      // Delete related records first based on role
      if (userToDelete.role === 'company' && userToDelete.companies) {
        // Delete job posting skills
        const { data: jobPostings } = await supabase
          .from('job_postings')
          .select('id')
          .eq('company_id', userToDelete.companies.id)

        if (jobPostings && jobPostings.length > 0) {
          const jobIds = jobPostings.map(j => j.id)

          await supabase
            .from('job_posting_skills')
            .delete()
            .in('job_posting_id', jobIds)

          await supabase
            .from('applications')
            .delete()
            .in('job_posting_id', jobIds)

          await supabase
            .from('job_postings')
            .delete()
            .eq('company_id', userToDelete.companies.id)
        }

        await supabase
          .from('companies')
          .delete()
          .eq('id', userToDelete.companies.id)
      }

      if (userToDelete.role === 'jobseeker' && userToDelete.job_seekers) {
        await supabase
          .from('job_seeker_skills')
          .delete()
          .eq('job_seeker_id', userToDelete.job_seekers.id)

        await supabase
          .from('applications')
          .delete()
          .eq('job_seeker_id', userToDelete.job_seekers.id)

        await supabase
          .from('bookmarks')
          .delete()
          .eq('job_seeker_id', userToDelete.job_seekers.id)

        await supabase
          .from('job_seekers')
          .delete()
          .eq('id', userToDelete.job_seekers.id)
      }

      // Delete messages
      await supabase
        .from('messages')
        .delete()
        .or(`sender_id.eq.${userToDelete.id},receiver_id.eq.${userToDelete.id}`)

      // Delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id)

      if (error) throw error

      toast.success('User deleted successfully')
      setUsers(users.filter((u) => u.id !== userToDelete.id))
      setTotalCount(prev => prev - 1)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    } finally {
      setIsDeleting(false)
      setDeleteModalOpen(false)
      setUserToDelete(null)
    }
  }

  const openDetailModal = (user: UserWithDetails) => {
    setSelectedUser(user)
    setDetailModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Users className="h-4 w-4" />
      case 'company':
        return <Building2 className="h-4 w-4" />
      case 'jobseeker':
        return <User className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: string): 'primary' | 'success' | 'warning' | 'danger' | 'gray' => {
    switch (role) {
      case 'admin':
        return 'warning'
      case 'company':
        return 'primary'
      case 'jobseeker':
        return 'success'
      default:
        return 'gray'
    }
  }

  const getUserDisplayName = (user: UserWithDetails) => {
    if (user.role === 'company' && user.companies?.company_name) {
      return user.companies.company_name
    }
    if (user.role === 'jobseeker' && user.job_seekers?.full_name) {
      return user.job_seekers.full_name
    }
    return user.email
  }

  const totalPages = Math.ceil(totalCount / USERS_PER_PAGE)

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage all platform users</p>
        </div>
        <Link to="/admin/users/new">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search by Email
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search users..."
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Role
            </label>
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              options={roleOptions}
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              options={statusOptions}
            />
          </div>
        </div>
      </Card>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {users.length} of {totalCount} users
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No users found"
          description={
            searchQuery || roleFilter || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'No users have registered yet.'
          }
          action={
            (searchQuery || roleFilter || statusFilter) ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setRoleFilter('')
                  setStatusFilter('')
                  setCurrentPage(1)
                }}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {getUserDisplayName(user)}
                        </h3>
                        <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                          {user.role}
                        </Badge>
                        {!user.is_active && (
                          <Badge variant="danger" size="sm">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Registered {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetailModal(user)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleUserStatus(user)}
                      disabled={togglingUserId === user.id}
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {togglingUserId === user.id ? (
                        <Spinner size="sm" />
                      ) : user.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(user)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* User Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedUser(null)
        }}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                {getRoleIcon(selectedUser.role)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {getUserDisplayName(selectedUser)}
                </h3>
                <p className="text-gray-600">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                    {selectedUser.role}
                  </Badge>
                  <Badge variant={selectedUser.is_active ? 'success' : 'danger'}>
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Registered</p>
                <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium">{formatDate(selectedUser.updated_at)}</p>
              </div>
            </div>

            {/* Role-specific info */}
            {selectedUser.role === 'company' && selectedUser.companies && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Company Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Company Name</p>
                    <p className="font-medium">{selectedUser.companies.company_name}</p>
                  </div>
                  {selectedUser.companies.location && (
                    <div>
                      <p className="text-gray-500">Location</p>
                      <p className="font-medium">{selectedUser.companies.location}</p>
                    </div>
                  )}
                  {selectedUser.companies.website && (
                    <div>
                      <p className="text-gray-500">Website</p>
                      <a
                        href={selectedUser.companies.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {selectedUser.companies.website}
                      </a>
                    </div>
                  )}
                  {selectedUser.companies.contact_email && (
                    <div>
                      <p className="text-gray-500">Contact Email</p>
                      <p className="font-medium">{selectedUser.companies.contact_email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedUser.role === 'jobseeker' && selectedUser.job_seekers && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Job Seeker Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Full Name</p>
                    <p className="font-medium">{selectedUser.job_seekers.full_name}</p>
                  </div>
                  {selectedUser.job_seekers.location && (
                    <div>
                      <p className="text-gray-500">Location</p>
                      <p className="font-medium">{selectedUser.job_seekers.location}</p>
                    </div>
                  )}
                  {selectedUser.job_seekers.phone && (
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium">{selectedUser.job_seekers.phone}</p>
                    </div>
                  )}
                  {selectedUser.job_seekers.expected_salary && (
                    <div>
                      <p className="text-gray-500">Expected Salary</p>
                      <p className="font-medium">{selectedUser.job_seekers.expected_salary}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Remote Work</p>
                    <p className="font-medium">
                      {selectedUser.job_seekers.remote_ok ? 'Open to remote' : 'Prefers on-site'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => toggleUserStatus(selectedUser)}
                disabled={togglingUserId === selectedUser.id}
              >
                {selectedUser.is_active ? 'Deactivate' : 'Activate'} User
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDetailModalOpen(false)
                  openDeleteModal(selectedUser)
                }}
              >
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setUserToDelete(null)
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{userToDelete?.email}</strong>?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone. All associated data (profile, applications, job postings, etc.) will be permanently deleted.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setUserToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
