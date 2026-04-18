import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where } from '@/lib/firestore'

// GET - Get all students with their membership status for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get all members of the organization
    const members = await firestoreService.query<any>(
      COLLECTIONS.MEMBERS,
      [where('orgId', '==', orgId)]
    )

    // Get user details for each member
    const studentsWithMembership = await Promise.all(
      members.map(async (member) => {
        const user = await firestoreService.getById<any>(COLLECTIONS.USERS, member.userId)
        if (!user || user.role !== 'Student') return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          membershipStatus: user.membershipStatus || 'Pending',
          memberRole: member.role,
        }
      })
    )

    // Filter out null values (non-students)
    const students = studentsWithMembership.filter(Boolean)

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Membership fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update membership status for a student
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, membershipStatus } = body

    if (!userId || !membershipStatus) {
      return NextResponse.json(
        { error: 'User ID and membership status are required' },
        { status: 400 }
      )
    }

    // Validate membership status
    const validStatuses = ['Paid', 'Pending']
    if (!validStatuses.includes(membershipStatus)) {
      return NextResponse.json(
        { error: 'Invalid membership status' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update membership status
    await firestoreService.update(COLLECTIONS.USERS, userId, {
      membershipStatus,
    })

    // Get updated user
    const updatedUser = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)

    // Return user without password
    const { password: _, ...userWithoutPassword } = updatedUser || {}

    return NextResponse.json({
      message: 'Membership status updated successfully',
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Membership update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
