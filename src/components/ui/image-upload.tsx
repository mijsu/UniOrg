'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { fileToBase64, validateImageFile } from '@/lib/image-utils'

interface ImageUploadProps {
  label?: string
  currentImage?: string
  onImageChange: (base64: string | null) => void
  maxSizeMB?: number
  className?: string
}

export default function ImageUpload({
  label,
  currentImage,
  onImageChange,
  maxSizeMB = 5,
  className = '',
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      onImageChange(null)
      setPreview(null)
      setError(null)
      return
    }

    // Validate file
    const validation = validateImageFile(file, maxSizeMB)
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setError(null)

    try {
      // Convert to Base64
      const base64 = await fileToBase64(file)
      onImageChange(base64)
      setPreview(base64)
    } catch (err) {
      setError('Failed to process image')
      console.error('Image processing error:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    handleFileSelect(file || null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    handleFileSelect(file || null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleRemove = () => {
    onImageChange(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <Card
        className={`
          relative border-2 border-dashed
          ${isDragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'}
          transition-all
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!preview && !currentImage && (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop an image here, or click to browse
              </p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Select Image
              </Button>
              <p className="text-xs text-muted-foreground">
                Supports: JPG, PNG, GIF, WebP (max {maxSizeMB}MB)
              </p>
            </div>
          )}

          {(preview || currentImage) && (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img
                  src={preview || currentImage}
                  alt="Preview"
                  className="max-w-full max-h-64 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  onClick={handleRemove}
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Change Image
                </Button>

                <Button
                  type="button"
                  onClick={handleRemove}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
