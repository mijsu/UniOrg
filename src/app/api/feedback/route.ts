import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where, orderBy } from '@/lib/firestore'

// GET feedback for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const id = searchParams.get('id')

    if (id) {
      // Get single feedback
      const feedback = await firestoreService.getById<any>(COLLECTIONS.FEEDBACK, id)

      if (!feedback) {
        return NextResponse.json(
          { error: 'Feedback not found' },
          { status: 404 }
        )
      }

      // Get user and org details
      const user = await firestoreService.getById<any>(COLLECTIONS.USERS, feedback.userId)
      const org = await firestoreService.getById<any>(COLLECTIONS.ORGANIZATIONS, feedback.orgId)

      return NextResponse.json({
        feedback: {
          ...feedback,
          user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
          org: org ? { id: org.id, name: org.name } : null,
        },
      })
    }

    if (orgId) {
      // Get all feedback for an organization
      const feedbackList = await firestoreService.query<any>(
        COLLECTIONS.FEEDBACK,
        [where('orgId', '==', orgId), orderBy('createdAt', 'desc')]
      )

      // Get user details
      const userIds = [...new Set(feedbackList.map((f: any) => f.userId))]
      const users = userIds.length > 0
        ? await firestoreService.query<any>(
          COLLECTIONS.USERS,
          [where('id', 'in', userIds)]
        )
        : []

      const feedbackWithUsers = feedbackList.map((f: any) => ({
        ...f,
        user: users.find((u: any) => u.id === f.userId) || null,
      }))

      return NextResponse.json({ feedback: feedbackWithUsers })
    }

    return NextResponse.json(
      { error: 'orgId or id is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Feedback fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, userId, message, isAnonymous } = body

    if (!orgId || !userId || !message) {
      return NextResponse.json(
        { error: 'orgId, userId, and message are required' },
        { status: 400 }
      )
    }

    const result = await firestoreService.create(COLLECTIONS.FEEDBACK, {
      orgId,
      userId,
      message,
      status: 'pending',
      isAnonymous: isAnonymous || false,
    })

    return NextResponse.json(
      { message: 'Feedback submitted successfully', feedback: { id: result.id, ...result.data } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Feedback creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update feedback (e.g., mark as reviewed)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Feedback ID and status are required' },
        { status: 400 }
      )
    }

    await firestoreService.update(COLLECTIONS.FEEDBACK, id, { status })

    const feedback = await firestoreService.getById<any>(COLLECTIONS.FEEDBACK, id)

    return NextResponse.json({
      message: 'Feedback updated successfully',
      feedback,
    })
  } catch (error) {
    console.error('Feedback update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete feedback
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      )
    }

    await firestoreService.delete(COLLECTIONS.FEEDBACK, id)

    return NextResponse.json({
      message: 'Feedback deleted successfully',
    })
  } catch (error) {
    console.error('Feedback deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
