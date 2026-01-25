import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS } from '@/lib/firestore'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, bio, phone, major, avatar, currentPassword, newPassword } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (bio !== undefined) updateData.bio = bio
    if (phone !== undefined) updateData.phone = phone
    if (major !== undefined) updateData.major = major
    if (avatar !== undefined) updateData.avatar = avatar

    // Handle password change
    if (newPassword && currentPassword) {
      // Get current user to verify old password
      const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Verify current password
      if (user.password !== currentPassword) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 401 }
        )
      }

      // Update password
      updateData.password = newPassword
    }

    // Update user
    await firestoreService.update(COLLECTIONS.USERS, userId, updateData)

    const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { password, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { password, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
