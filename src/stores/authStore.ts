import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Profile, Company, JobSeeker } from '@/types'

interface AuthState {
  user: Profile | null
  company: Company | null
  jobSeeker: JobSeeker | null
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<{ error: string | null }>
  register: (email: string, password: string, role: 'company' | 'jobseeker') => Promise<{ error: string | null }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      jobSeeker: null,
      isLoading: true,
      isInitialized: false,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            await get().refreshProfile()
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error)
        } finally {
          set({ isLoading: false, isInitialized: true })
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true })

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          set({ isLoading: false })
          return { error: error.message }
        }

        await get().refreshProfile()
        set({ isLoading: false })
        return { error: null }
      },

      register: async (email: string, password: string, role: 'company' | 'jobseeker') => {
        set({ isLoading: true })

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          set({ isLoading: false })
          return { error: error.message }
        }

        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: email,
              role: role,
            })

          if (profileError) {
            set({ isLoading: false })
            return { error: profileError.message }
          }

          // Create company or job_seeker record
          if (role === 'company') {
            await supabase
              .from('companies')
              .insert({
                user_id: data.user.id,
                company_name: '',
              })
          } else {
            await supabase
              .from('job_seekers')
              .insert({
                user_id: data.user.id,
                full_name: '',
              })
          }

          await get().refreshProfile()
        }

        set({ isLoading: false })
        return { error: null }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, company: null, jobSeeker: null })
      },

      refreshProfile: async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          set({ user: null, company: null, jobSeeker: null })
          return
        }

        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!profile) {
          set({ user: null, company: null, jobSeeker: null })
          return
        }

        set({ user: profile })

        // Get role-specific data
        if (profile.role === 'company') {
          const { data: company } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', profile.id)
            .single()

          set({ company, jobSeeker: null })
        } else if (profile.role === 'jobseeker') {
          const { data: jobSeeker } = await supabase
            .from('job_seekers')
            .select('*')
            .eq('user_id', profile.id)
            .single()

          set({ jobSeeker, company: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

// Listen to auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    useAuthStore.getState().refreshProfile()
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, company: null, jobSeeker: null })
  }
})
