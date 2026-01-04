export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'company' | 'jobseeker'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'admin' | 'company' | 'jobseeker'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'company' | 'jobseeker'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          user_id: string
          company_name: string
          description: string | null
          website: string | null
          location: string | null
          contact_email: string | null
          contact_phone: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          description?: string | null
          website?: string | null
          location?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          description?: string | null
          website?: string | null
          location?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      job_seekers: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone: string | null
          location: string | null
          bio: string | null
          resume_url: string | null
          expected_salary: string | null
          remote_ok: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          phone?: string | null
          location?: string | null
          bio?: string | null
          resume_url?: string | null
          expected_salary?: string | null
          remote_ok?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone?: string | null
          location?: string | null
          bio?: string | null
          resume_url?: string | null
          expected_salary?: string | null
          remote_ok?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_seekers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      skills: {
        Row: {
          id: string
          name: string
          category: string | null
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
        }
        Relationships: []
      }
      job_seeker_skills: {
        Row: {
          id: string
          job_seeker_id: string
          skill_id: string
          proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
        }
        Insert: {
          id?: string
          job_seeker_id: string
          skill_id: string
          proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
        }
        Update: {
          id?: string
          job_seeker_id?: string
          skill_id?: string
          proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
        }
        Relationships: [
          {
            foreignKeyName: "job_seeker_skills_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            referencedRelation: "job_seekers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_seeker_skills_skill_id_fkey"
            columns: ["skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          }
        ]
      }
      job_postings: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string
          job_type: 'full-time' | 'part-time' | 'contract' | 'internship' | null
          location: string | null
          remote_ok: boolean
          salary_min: number | null
          salary_max: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          title: string
          description: string
          job_type?: 'full-time' | 'part-time' | 'contract' | 'internship' | null
          location?: string | null
          remote_ok?: boolean
          salary_min?: number | null
          salary_max?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          title?: string
          description?: string
          job_type?: 'full-time' | 'part-time' | 'contract' | 'internship' | null
          location?: string | null
          remote_ok?: boolean
          salary_min?: number | null
          salary_max?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      job_posting_skills: {
        Row: {
          id: string
          job_posting_id: string
          skill_id: string
          is_required: boolean
        }
        Insert: {
          id?: string
          job_posting_id: string
          skill_id: string
          is_required?: boolean
        }
        Update: {
          id?: string
          job_posting_id?: string
          skill_id?: string
          is_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_skills_job_posting_id_fkey"
            columns: ["job_posting_id"]
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posting_skills_skill_id_fkey"
            columns: ["skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          }
        ]
      }
      applications: {
        Row: {
          id: string
          job_posting_id: string
          job_seeker_id: string
          cover_letter: string | null
          resume_url: string | null
          status: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn'
          applied_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_posting_id: string
          job_seeker_id: string
          cover_letter?: string | null
          resume_url?: string | null
          status?: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn'
          applied_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_posting_id?: string
          job_seeker_id?: string
          cover_letter?: string | null
          resume_url?: string | null
          status?: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn'
          applied_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            referencedRelation: "job_seekers"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          application_id: string | null
          content: string
          is_read: boolean
          sent_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          application_id?: string | null
          content: string
          is_read?: boolean
          sent_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          application_id?: string | null
          content?: string
          is_read?: boolean
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      bookmarks: {
        Row: {
          id: string
          job_seeker_id: string
          job_posting_id: string
          created_at: string
        }
        Insert: {
          id?: string
          job_seeker_id: string
          job_posting_id: string
          created_at?: string
        }
        Update: {
          id?: string
          job_seeker_id?: string
          job_posting_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            referencedRelation: "job_seekers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_job_posting_id_fkey"
            columns: ["job_posting_id"]
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          }
        ]
      }
      skill_synonyms: {
        Row: {
          id: string
          skill_id: string
          synonym: string
          created_at: string
        }
        Insert: {
          id?: string
          skill_id: string
          synonym: string
          created_at?: string
        }
        Update: {
          id?: string
          skill_id?: string
          synonym?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_synonyms_skill_id_fkey"
            columns: ["skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          }
        ]
      }
      skill_relationships: {
        Row: {
          id: string
          parent_skill_id: string
          child_skill_id: string
          relationship_type: 'parent' | 'related' | 'prerequisite'
          weight: number
          created_at: string
        }
        Insert: {
          id?: string
          parent_skill_id: string
          child_skill_id: string
          relationship_type: 'parent' | 'related' | 'prerequisite'
          weight?: number
          created_at?: string
        }
        Update: {
          id?: string
          parent_skill_id?: string
          child_skill_id?: string
          relationship_type?: 'parent' | 'related' | 'prerequisite'
          weight?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_relationships_parent_skill_id_fkey"
            columns: ["parent_skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_relationships_child_skill_id_fkey"
            columns: ["child_skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          }
        ]
      }
      application_status_history: {
        Row: {
          id: string
          application_id: string
          old_status: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn' | null
          new_status: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn'
          changed_by: string | null
          changed_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          application_id: string
          old_status?: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn' | null
          new_status: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn'
          changed_by?: string | null
          changed_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          application_id?: string
          old_status?: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn' | null
          new_status?: 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn'
          changed_by?: string | null
          changed_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_changed_by_fkey"
            columns: ["changed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_match_score: {
        Args: {
          p_job_seeker_id: string
          p_job_posting_id: string
        }
        Returns: {
          score: number
          matched_skills: Json
          missing_skills: Json
          skill_match_percentage: number
          location_match: boolean
          remote_match: boolean
        }[]
      }
      get_valid_next_statuses: {
        Args: {
          current_status: string
        }
        Returns: string[]
      }
      get_status_sort_order: {
        Args: {
          status: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience types
export type Profile = Tables<'profiles'>
export type Company = Tables<'companies'>
export type JobSeeker = Tables<'job_seekers'>
export type Skill = Tables<'skills'>
export type JobSeekerSkill = Tables<'job_seeker_skills'>
export type JobPosting = Tables<'job_postings'>
export type JobPostingSkill = Tables<'job_posting_skills'>
export type Application = Tables<'applications'>
export type Message = Tables<'messages'>
export type Bookmark = Tables<'bookmarks'>

// Extended types with relations
export type JobPostingWithCompany = JobPosting & {
  companies: Company
}

export type JobPostingWithSkills = JobPosting & {
  job_posting_skills: (JobPostingSkill & { skills: Skill })[]
}

export type ApplicationWithDetails = Application & {
  job_postings: JobPostingWithCompany
  job_seekers: JobSeeker
}

export type JobSeekerWithSkills = JobSeeker & {
  job_seeker_skills: (JobSeekerSkill & { skills: Skill })[]
}

// Phase 1 - Smart Matching Types
export type SkillSynonym = Tables<'skill_synonyms'>
export type SkillRelationship = Tables<'skill_relationships'>
export type ApplicationStatusHistory = Tables<'application_status_history'>

// Match score result interfaces
export interface MatchedSkill {
  skill_id: string
  skill_name: string
  is_required: boolean
  proficiency: string | null
}

export interface MissingSkill {
  skill_id: string
  skill_name: string
  is_required: boolean
}

export interface MatchScoreResult {
  score: number
  matched_skills: MatchedSkill[]
  missing_skills: MissingSkill[]
  skill_match_percentage: number
  location_match: boolean
  remote_match: boolean
}

// Application Status State Machine
export type ApplicationStatus = 'pending' | 'reviewing' | 'interview' | 'offered' | 'rejected' | 'withdrawn'

export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending: ['reviewing', 'rejected', 'withdrawn'],
  reviewing: ['interview', 'rejected', 'withdrawn'],
  interview: ['offered', 'rejected', 'withdrawn'],
  offered: ['rejected'],
  rejected: [],
  withdrawn: [],
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Applied',
  reviewing: 'Under Review',
  interview: 'Interview',
  offered: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export const STATUS_SORT_ORDER: Record<ApplicationStatus, number> = {
  pending: 1,
  reviewing: 2,
  interview: 3,
  offered: 4,
  rejected: 5,
  withdrawn: 6,
}

export function isValidStatusTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function getValidNextStatuses(current: ApplicationStatus): ApplicationStatus[] {
  return VALID_STATUS_TRANSITIONS[current] ?? []
}
