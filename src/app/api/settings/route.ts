import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS } from '@/lib/firestore'

// Get platform settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    // Try to get settings document
    const settingsDoc = await firestoreService.getById<any>(COLLECTIONS.SETTINGS, 'platform')

    if (!settingsDoc) {
      // Return default settings if none exist
      const defaultSettings = {
        status: 'active',
        registration: 'open',
        announcement: '',
      }
      return NextResponse.json({ settings: defaultSettings })
    }

    // Return specific setting if key is requested
    if (key) {
      return NextResponse.json({ [key]: settingsDoc[key] })
    }

    return NextResponse.json({ settings: settingsDoc })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update platform settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { status, registration, announcement } = body

    // Prepare update data
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (registration !== undefined) updateData.registration = registration
    if (announcement !== undefined) updateData.announcement = announcement

    // Check if settings document exists
    const existingSettings = await firestoreService.getById<any>(COLLECTIONS.SETTINGS, 'platform')

    if (existingSettings) {
      // Update existing settings
      await firestoreService.update(COLLECTIONS.SETTINGS, 'platform', updateData)
    } else {
      // Create new settings document
      const defaultSettings = {
        status: status || 'active',
        registration: registration || 'open',
        announcement: announcement || '',
      }
      await firestoreService.create(COLLECTIONS.SETTINGS, defaultSettings, 'platform')
    }

    // Get updated settings
    const updatedSettings = await firestoreService.getById<any>(COLLECTIONS.SETTINGS, 'platform')

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: updatedSettings,
    })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
