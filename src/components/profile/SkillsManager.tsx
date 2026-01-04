import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Button, Select, Badge, Spinner } from '@/components/ui'
import { Plus, X, Search } from 'lucide-react'
import type { Skill, JobSeekerSkill } from '@/types'
import toast from 'react-hot-toast'

type SkillWithDetails = JobSeekerSkill & { skills: Skill }

const proficiencyLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
]

const proficiencyColors: Record<string, 'gray' | 'primary' | 'success' | 'warning'> = {
  beginner: 'gray',
  intermediate: 'primary',
  advanced: 'success',
  expert: 'warning',
}

export function SkillsManager() {
  const { jobSeeker } = useAuthStore()
  const [userSkills, setUserSkills] = useState<SkillWithDetails[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedProficiency, setSelectedProficiency] = useState<string>('intermediate')
  const [isAdding, setIsAdding] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (jobSeeker) {
      fetchUserSkills()
      fetchAllSkills()
    }
  }, [jobSeeker])

  useEffect(() => {
    if (searchQuery.trim()) {
      const userSkillIds = userSkills.map(us => us.skill_id)
      const filtered = allSkills.filter(
        skill =>
          skill.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !userSkillIds.includes(skill.id)
      )
      setFilteredSkills(filtered)
      setShowDropdown(true)
    } else {
      setFilteredSkills([])
      setShowDropdown(false)
    }
  }, [searchQuery, allSkills, userSkills])

  const fetchUserSkills = async () => {
    if (!jobSeeker) return

    const { data, error } = await supabase
      .from('job_seeker_skills')
      .select(`
        *,
        skills (*)
      `)
      .eq('job_seeker_id', jobSeeker.id)

    if (error) {
      console.error('Error fetching skills:', error)
    } else {
      setUserSkills(data as SkillWithDetails[] || [])
    }

    setIsLoading(false)
  }

  const fetchAllSkills = async () => {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching all skills:', error)
    } else {
      setAllSkills(data || [])
    }
  }

  const handleSelectSkill = (skill: Skill) => {
    setSelectedSkill(skill)
    setSearchQuery(skill.name)
    setShowDropdown(false)
  }

  const handleAddSkill = async () => {
    if (!jobSeeker || !selectedSkill) return

    setIsAdding(true)

    const { error } = await supabase
      .from('job_seeker_skills')
      .insert({
        job_seeker_id: jobSeeker.id,
        skill_id: selectedSkill.id,
        proficiency: selectedProficiency as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      })

    if (error) {
      if (error.code === '23505') {
        toast.error('You already have this skill')
      } else {
        toast.error('Failed to add skill')
        console.error(error)
      }
    } else {
      toast.success('Skill added')
      setSearchQuery('')
      setSelectedSkill(null)
      setSelectedProficiency('intermediate')
      await fetchUserSkills()
    }

    setIsAdding(false)
  }

  const handleCreateAndAddSkill = async () => {
    if (!jobSeeker || !searchQuery.trim()) return

    setIsAdding(true)

    // First, create the skill
    const { data: newSkill, error: createError } = await supabase
      .from('skills')
      .insert({ name: searchQuery.trim() })
      .select()
      .single()

    if (createError) {
      if (createError.code === '23505') {
        toast.error('This skill already exists')
      } else {
        toast.error('Failed to create skill')
        console.error(createError)
      }
      setIsAdding(false)
      return
    }

    // Then add it to user's skills
    const { error: addError } = await supabase
      .from('job_seeker_skills')
      .insert({
        job_seeker_id: jobSeeker.id,
        skill_id: newSkill.id,
        proficiency: selectedProficiency as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      })

    if (addError) {
      toast.error('Failed to add skill')
      console.error(addError)
    } else {
      toast.success('Skill created and added')
      setSearchQuery('')
      setSelectedSkill(null)
      setSelectedProficiency('intermediate')
      await fetchUserSkills()
      await fetchAllSkills()
    }

    setIsAdding(false)
  }

  const handleRemoveSkill = async (skillId: string) => {
    if (!jobSeeker) return

    const { error } = await supabase
      .from('job_seeker_skills')
      .delete()
      .eq('job_seeker_id', jobSeeker.id)
      .eq('skill_id', skillId)

    if (error) {
      toast.error('Failed to remove skill')
      console.error(error)
    } else {
      toast.success('Skill removed')
      setUserSkills(userSkills.filter(us => us.skill_id !== skillId))
    }
  }

  const handleUpdateProficiency = async (skillId: string, proficiency: string) => {
    if (!jobSeeker) return

    const { error } = await supabase
      .from('job_seeker_skills')
      .update({ proficiency: proficiency as 'beginner' | 'intermediate' | 'advanced' | 'expert' })
      .eq('job_seeker_id', jobSeeker.id)
      .eq('skill_id', skillId)

    if (error) {
      toast.error('Failed to update proficiency')
      console.error(error)
    } else {
      setUserSkills(
        userSkills.map(us =>
          us.skill_id === skillId
            ? { ...us, proficiency: proficiency as 'beginner' | 'intermediate' | 'advanced' | 'expert' }
            : us
        )
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Skill Form */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search or add a skill..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedSkill(null)
              }}
              onFocus={() => searchQuery && setShowDropdown(true)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredSkills.length > 0 ? (
                filteredSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => handleSelectSkill(skill)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                  >
                    {skill.name}
                    {skill.category && (
                      <span className="text-sm text-gray-500 ml-2">({skill.category})</span>
                    )}
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <button
                  onClick={handleCreateAndAddSkill}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-primary-600"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Create "{searchQuery}"
                </button>
              ) : null}
            </div>
          )}
        </div>

        <Select
          value={selectedProficiency}
          onChange={(e) => setSelectedProficiency(e.target.value)}
          options={proficiencyLevels}
          className="w-full sm:w-40"
        />

        <Button
          onClick={selectedSkill ? handleAddSkill : handleCreateAndAddSkill}
          disabled={!searchQuery.trim()}
          isLoading={isAdding}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Skills List */}
      {userSkills.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No skills added yet. Start adding skills to showcase your expertise.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {userSkills.map((userSkill) => (
            <div
              key={userSkill.id}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            >
              <span className="font-medium text-gray-900">{userSkill.skills.name}</span>
              <select
                value={userSkill.proficiency || 'intermediate'}
                onChange={(e) => handleUpdateProficiency(userSkill.skill_id, e.target.value)}
                className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer"
              >
                {proficiencyLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <Badge variant={proficiencyColors[userSkill.proficiency || 'intermediate']} size="sm">
                {userSkill.proficiency || 'intermediate'}
              </Badge>
              <button
                onClick={() => handleRemoveSkill(userSkill.skill_id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
