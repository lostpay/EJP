export * from './database'

// Auth types
export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'company' | 'jobseeker'
}

// Form types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  role: 'company' | 'jobseeker'
}

export interface JobSeekerProfileFormData {
  full_name: string
  phone: string
  location: string
  bio: string
  expected_salary: string
  remote_ok: boolean
}

export interface CompanyProfileFormData {
  company_name: string
  description: string
  website: string
  location: string
  contact_email: string
  contact_phone: string
}

export interface JobPostingFormData {
  title: string
  description: string
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship'
  location: string
  remote_ok: boolean
  salary_min: number | null
  salary_max: number | null
  skill_ids: string[]
}

export interface ApplicationFormData {
  cover_letter: string
  resume_url?: string
}

// Filter types
export interface JobSearchFilters {
  keyword?: string
  job_type?: string
  location?: string
  remote_ok?: boolean
  skill_ids?: string[]
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
