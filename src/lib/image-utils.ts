/**
 * Convert a file to Base64 string
 * @param file - The file to convert
 * @returns Promise resolving to Base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Validate file type and size
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in megabytes (default: 5MB)
 * @returns Object with isValid and error message
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { isValid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.',
    }
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`,
    }
  }

  return { isValid: true }
}

/**
 * Extract data URL from Base64 string
 * @param base64 - Base64 string with data URL prefix
 * @returns Base64 string without data URL prefix
 */
export function getBase64Data(base64: string): string {
  if (base64.startsWith('data:')) {
    return base64.split(',')[1]
  }
  return base64
}
