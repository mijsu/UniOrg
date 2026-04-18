import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where, orderBy } from '@/lib/firestore'

// GET members of an organization
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

    const members = await firestoreService.query<any>(
      COLLECTIONS.MEMBERS,
      [where('orgId', '==', orgId)]
    )

    // Sort by joinedDate in descending order
    const sortedMembers = members.sort((a, b) =>
      new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime()
    )

    // Get user details for each member
    const userIds = sortedMembers.map((m: any) => m.userId)
    const users = userIds.length > 0
      ? await firestoreService.query<any>(
        COLLECTIONS.USERS,
        [where('id', 'in', userIds)]
      )
      : []

    const membersWithUsers = sortedMembers.map((member: any) => ({
      ...member,
      user: users.find((u: any) => u.id === member.userId) || null,
    }))

    return NextResponse.json({ members: membersWithUsers })
  } catch (error) {
    console.error('Members fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add or update member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, userId, role } = body

    if (!orgId || !userId || !role) {
      return NextResponse.json(
        { error: 'orgId, userId, and role are required' },
        { status: 400 }
      )
    }

    // Check if member exists
    const existingMembers = await firestoreService.query<any>(
      COLLECTIONS.MEMBERS,
      [where('userId', '==', userId), where('orgId', '==', orgId)]
    )

    let member

    if (existingMembers && existingMembers.length > 0) {
      // Update role
      await firestoreService.update(
        COLLECTIONS.MEMBERS,
        existingMembers[0].id,
        { role }
      )
      member = { ...existingMembers[0], role }
    } else {
      // Create new member
      const result = await firestoreService.create(COLLECTIONS.MEMBERS, {
        userId,
        orgId,
        role,
        joinedDate: new Date().toISOString(),
      })
      member = { id: result.id, ...result.data }
    }

    return NextResponse.json(
      { message: 'Member added/updated successfully', member },
      { status: 201 }
    )
  } catch (error) {
    console.error('Member creation/update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update member role
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, userId, role, showInLeaders, quote } = body

    if (!orgId || !userId) {
      return NextResponse.json(
        { error: 'orgId and userId are required' },
        { status: 400 }
      )
    }

    // Check if member exists
    const existingMembers = await firestoreService.query<any>(
      COLLECTIONS.MEMBERS,
      [where('userId', '==', userId), where('orgId', '==', orgId)]
    )

    if (!existingMembers || existingMembers.length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Build update object with provided fields
    const updates: any = {}
    if (role) updates.role = role
    if (showInLeaders !== undefined) updates.showInLeaders = showInLeaders
    if (quote !== undefined) updates.quote = quote

    await firestoreService.update(
      COLLECTIONS.MEMBERS,
      existingMembers[0].id,
      updates
    )

    const member = { ...existingMembers[0], ...updates }

    return NextResponse.json({
      message: 'Member updated successfully',
      member,
    })
  } catch (error) {
    console.error('Member update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove member
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const userId = searchParams.get('userId')

    if (!orgId || !userId) {
      return NextResponse.json(
        { error: 'Organization ID and User ID are required' },
        { status: 400 }
      )
    }

    // Find the member
    const existingMembers = await firestoreService.query<any>(
      COLLECTIONS.MEMBERS,
      [where('userId', '==', userId), where('orgId', '==', orgId)]
    )

    if (!existingMembers || existingMembers.length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    await firestoreService.delete(COLLECTIONS.MEMBERS, existingMembers[0].id)

    return NextResponse.json({
      message: 'Member removed successfully',
    })
  } catch (error) {
    console.error('Member removal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
