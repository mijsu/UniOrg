import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS } from '@/lib/firestore'

// Create a reply to feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedbackId, userId, message } = body

    if (!feedbackId || !userId || !message) {
      return NextResponse.json(
        { error: 'feedbackId, userId, and message are required' },
        { status: 400 }
      )
    }

    // Get the feedback document
    const feedback = await firestoreService.getById<any>(COLLECTIONS.FEEDBACK, feedbackId)

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Initialize replies array if it doesn't exist
    const replies = feedback.replies || []

    // Add the new reply
    replies.push({
      id: `reply-${Date.now()}`,
      userId,
      message,
      createdAt: new Date().toISOString(),
    })

    // Update feedback with new reply and mark as reviewed
    await firestoreService.update(COLLECTIONS.FEEDBACK, feedbackId, {
      replies,
      status: 'reviewed',
    })

    return NextResponse.json(
      { message: 'Reply added successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Feedback reply creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
