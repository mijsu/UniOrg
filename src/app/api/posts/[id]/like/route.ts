import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where } from '@/lib/firestore'

// POST - Like a post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { authorId } = body

    if (!authorId) {
      return NextResponse.json({ error: 'Author ID is required' }, { status: 400 })
    }

    // Check if already liked
    const existingReactions = await firestoreService.query<any>(
      COLLECTIONS.REACTIONS,
      [where('authorId', '==', authorId), where('postId', '==', params.id), where('type', '==', 'like')]
    )

    if (existingReactions && existingReactions.length > 0) {
      return NextResponse.json(
        { error: 'Already liked' },
        { status: 400 }
      )
    }

    // Create like reaction
    const result = await firestoreService.create(COLLECTIONS.REACTIONS, {
      authorId,
      postId: params.id,
      type: 'like',
    })

    // Get author details
    const author = await firestoreService.getById<any>(COLLECTIONS.USERS, authorId)

    const reaction = {
      id: result.id,
      ...result.data,
      author: author ? {
        id: author.id,
        name: author.name,
        avatar: author.avatar,
      } : null,
    }

    return NextResponse.json({ reaction }, { status: 201 })
  } catch (error) {
    console.error('Error liking post:', error)
    return NextResponse.json({ error: 'Failed to like post' }, { status: 500 })
  }
}

// DELETE - Unlike a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const authorId = searchParams.get('authorId')

    if (!authorId) {
      return NextResponse.json({ error: 'Author ID is required' }, { status: 400 })
    }

    // Find and delete like reaction
    const existingReactions = await firestoreService.query<any>(
      COLLECTIONS.REACTIONS,
      [where('authorId', '==', authorId), where('postId', '==', params.id), where('type', '==', 'like')]
    )

    if (existingReactions && existingReactions.length > 0) {
      await firestoreService.delete(COLLECTIONS.REACTIONS, existingReactions[0].id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unliking post:', error)
    return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 })
  }
}
