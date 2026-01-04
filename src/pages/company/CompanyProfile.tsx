import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, CardTitle, Button, Input, Textarea, Spinner } from '@/components/ui'
import { Building2, Save, Upload, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB

export function CompanyProfile() {
  const { company, refreshProfile } = useAuthStore()
  const [isLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    company_name: '',
    description: '',
    website: '',
    location: '',
    contact_email: '',
    contact_phone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (company) {
      setFormData({
        company_name: company.company_name || '',
        description: company.description || '',
        website: company.website || '',
        location: company.location || '',
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
      })
    }
  }, [company])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://'
    }

    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format'
    }

    if (formData.contact_phone && !/^[+]?[\d\s-()]+$/.test(formData.contact_phone)) {
      newErrors.contact_phone = 'Invalid phone number format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !company) return

    setIsSaving(true)

    const { error } = await supabase
      .from('companies')
      .update({
        company_name: formData.company_name,
        description: formData.description || null,
        website: formData.website || null,
        location: formData.location || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
      })
      .eq('id', company.id)

    if (error) {
      toast.error('Failed to update profile')
      console.error(error)
    } else {
      toast.success('Profile updated successfully')
      await refreshProfile()
    }

    setIsSaving(false)
  }

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !company) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo must be less than 2MB')
      return
    }

    setIsUploadingLogo(true)

    try {
      // Delete existing logo if any
      if (company.logo_url) {
        const existingPath = company.logo_url.split('/').pop()
        if (existingPath) {
          await supabase.storage
            .from('logos')
            .remove([`${company.user_id}/${existingPath}`])
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop()
      const fileName = `logo_${Date.now()}.${fileExt}`
      const filePath = `${company.user_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      // Update company record
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', company.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Logo uploaded successfully')
      await refreshProfile()
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo')
    }

    setIsUploadingLogo(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteLogo = async () => {
    if (!company?.logo_url) return

    setIsUploadingLogo(true)

    try {
      const fileName = company.logo_url.split('/').pop()
      const filePath = `${company.user_id}/${fileName}`

      await supabase.storage.from('logos').remove([filePath])

      const { error } = await supabase
        .from('companies')
        .update({ logo_url: null })
        .eq('id', company.id)

      if (error) throw error

      toast.success('Logo deleted')
      await refreshProfile()
    } catch (error) {
      console.error('Error deleting logo:', error)
      toast.error('Failed to delete logo')
    }

    setIsUploadingLogo(false)
  }

  const profileCompletion = () => {
    if (!company) return 0
    let score = 0
    if (company.company_name) score += 25
    if (company.description) score += 25
    if (company.website) score += 15
    if (company.location) score += 15
    if (company.logo_url) score += 20
    return score
  }

  if (isLoading || !company) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        <p className="text-gray-600">Manage your company information to attract top talent.</p>
      </div>

      {/* Profile Completion */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Profile Completion</h3>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${profileCompletion()}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">{profileCompletion()}% complete</p>
          </div>
        </div>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardTitle className="mb-6">Company Logo</CardTitle>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoSelect}
          className="hidden"
        />

        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt="Company logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="h-12 w-12 text-gray-400" />
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-3">
              Upload your company logo. Recommended size: 200x200px. Max size: 2MB.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                isLoading={isUploadingLogo}
              >
                <Upload className="h-4 w-4 mr-1" />
                {company.logo_url ? 'Change' : 'Upload'}
              </Button>
              {company.logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteLogo}
                  isLoading={isUploadingLogo}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Company Information */}
      <Card>
        <CardTitle className="mb-6">Company Information</CardTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="company_name"
            label="Company Name"
            placeholder="Acme Inc."
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            error={errors.company_name}
            required
          />

          <Textarea
            id="description"
            label="Company Description"
            placeholder="Tell job seekers about your company, culture, and what makes it a great place to work..."
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="website"
              label="Website"
              placeholder="https://example.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              error={errors.website}
            />
            <Input
              id="location"
              label="Location"
              placeholder="San Francisco, CA"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="contact_email"
              label="Contact Email"
              type="email"
              placeholder="hr@example.com"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              error={errors.contact_email}
            />
            <Input
              id="contact_phone"
              label="Contact Phone"
              placeholder="+1 (555) 123-4567"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              error={errors.contact_phone}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
