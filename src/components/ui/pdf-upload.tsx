'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Upload, X, FileText, Download } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PDFUploadProps {
  label?: string
  currentPDF?: { data: string; fileName: string; uploadedAt: string } | null
  onPDFChange: (pdfData: string | null) => void
  maxSizeMB?: number
  className?: string
}

export default function PDFUpload({
  label,
  currentPDF,
  onPDFChange,
  maxSizeMB = 10,
  className = '',
}: PDFUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const validatePDFFile = (file: File): { isValid: boolean; error?: string } => {
    if (!file.type.startsWith('application/pdf')) {
      return { isValid: false, error: 'Only PDF files are allowed' }
    }

    const maxSize = maxSizeMB * 1024 * 1024 // Convert MB to bytes
    if (file.size > maxSize) {
      return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` }
    }

    return { isValid: true }
  }

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      onPDFChange(null)
      setError(null)
      return
    }

    // Validate file
    const validation = validatePDFFile(file)
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setError(null)

    try {
      // Convert to Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Add file name to the base64 string
      const pdfData = {
        data: base64,
        name: file.name,
        uploadedAt: new Date().toISOString(),
      }

      onPDFChange(base64)
      toast({
        title: 'Success',
        description: 'PDF uploaded successfully',
      })
    } catch (err) {
      setError('Failed to process PDF')
      console.error('PDF processing error:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process PDF file',
      })
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
    onPDFChange(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownload = () => {
    if (currentPDF?.data) {
      // Create download link
      const link = document.createElement('a')
      link.href = currentPDF.data
      link.download = currentPDF.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
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
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {!currentPDF ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-red-600" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your Constitution and By-Laws (CBL) PDF here, or click to browse
              </p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select PDF
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Format:</strong> PDF only • <strong>Max size:</strong> {maxSizeMB}MB
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-red-50 to-amber-50 rounded-lg border border-red-200">
                <FileText className="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900">
                    Constitution & By-Laws
                  </p>
                  <p className="text-xs text-red-700">
                    Uploaded: {currentPDF.uploadedAt ? new Date(currentPDF.uploadedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Replace PDF
                </Button>
                <Button
                  type="button"
                  onClick={handleDownload}
                  variant="default"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
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
