import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Button, Spinner } from '@/components/ui'
import { Upload, FileText, Download, Trash2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function ResumeUpload() {
  const { jobSeeker, refreshProfile } = useAuthStore()
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB')
      return
    }

    await uploadResume(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadResume = async (file: File) => {
    if (!jobSeeker) return

    setIsUploading(true)

    try {
      // Delete existing resume if any
      if (jobSeeker.resume_url) {
        const existingPath = jobSeeker.resume_url.split('/').pop()
        if (existingPath) {
          await supabase.storage
            .from('resumes')
            .remove([`${jobSeeker.user_id}/${existingPath}`])
        }
      }

      // Upload new resume
      const fileExt = file.name.split('.').pop()
      const fileName = `resume_${Date.now()}.${fileExt}`
      const filePath = `${jobSeeker.user_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath)

      // Update job seeker record
      const { error: updateError } = await supabase
        .from('job_seekers')
        .update({ resume_url: urlData.publicUrl })
        .eq('id', jobSeeker.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Resume uploaded successfully')
      await refreshProfile()
    } catch (error) {
      console.error('Error uploading resume:', error)
      toast.error('Failed to upload resume')
    }

    setIsUploading(false)
  }

  const handleDelete = async () => {
    if (!jobSeeker?.resume_url) return

    setIsDeleting(true)

    try {
      // Extract file path from URL
      const urlParts = jobSeeker.resume_url.split('/')
      const fileName = urlParts.pop()
      const filePath = `${jobSeeker.user_id}/${fileName}`

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('resumes')
        .remove([filePath])

      if (deleteError) {
        console.error('Storage delete error:', deleteError)
        // Continue anyway to update the database
      }

      // Update job seeker record
      const { error: updateError } = await supabase
        .from('job_seekers')
        .update({ resume_url: null })
        .eq('id', jobSeeker.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Resume deleted')
      await refreshProfile()
    } catch (error) {
      console.error('Error deleting resume:', error)
      toast.error('Failed to delete resume')
    }

    setIsDeleting(false)
  }

  const handleDownload = () => {
    if (jobSeeker?.resume_url) {
      window.open(jobSeeker.resume_url, '_blank')
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {jobSeeker?.resume_url ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">Resume uploaded</p>
              <p className="text-sm text-green-700">PDF document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-600">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-4 text-lg font-medium text-gray-900">Upload your resume</p>
              <p className="mt-1 text-sm text-gray-500">PDF only, max 5MB</p>
              <Button className="mt-4">
                Select File
              </Button>
            </>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 text-sm text-gray-600">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Your resume will be shared with employers when you apply for jobs.
          Make sure it's up to date and highlights your best qualifications.
        </p>
      </div>
    </div>
  )
}
