import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS } from '@/lib/firestore'

// GET - List comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const resolvedParams = await params
    const postId = resolvedParams.id

    const allComments = await firestoreService.query<any>(
      COLLECTIONS.COMMENTS,
      [{ field: 'postId', operator: '==', value: postId }]
    )

    // IMPORTANT: Filter comments by postId as a safety measure
    // (in case Firestore query filter doesn't work properly)
    const filteredComments = allComments.filter((comment: any) => comment.postId === postId)

    console.log('Comments API - Raw query results:', allComments.length)
    console.log('Comments API - After manual filter:', filteredComments.length, 'comments for post:', postId)

    // Sort by createdAt in descending order
    const sortedComments = filteredComments.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Get unique author IDs
    const authorIds = [...new Set(sortedComments.map((c: any) => c.authorId))]
    console.log('Comments API - Author IDs:', authorIds)
    console.log('Comments API - Raw comments:', sortedComments.map(c => ({ id: c.id, authorId: c.authorId, content: c.content })))

    // Fetch authors individually to avoid Firestore 'in' query issues
    const authorsMap: { [key: string]: any } = {}
    for (const authorId of authorIds) {
      try {
        const author = await firestoreService.getById<any>(COLLECTIONS.USERS, authorId)
        if (author) {
          authorsMap[authorId] = author
        }
      } catch (error) {
        console.error(`Failed to fetch author ${authorId}:`, error)
      }
    }

    const authors = Object.values(authorsMap)
    console.log('Comments API - Found authors:', authors.map(a => ({ id: a.id, name: a.name, email: a.email })))

    const comments = sortedComments.map((comment: any) => ({
      ...comment,
      author: authorsMap[comment.authorId] || null,
    }))

    console.log('Comments API - Final comments with authors:', comments.map(c => ({ id: c.id, content: c.content, authorId: c.authorId, authorName: c.author?.name })))

    const totalComments = sortedComments.length
    const startIndex = (page - 1) * limit
    const paginatedComments = comments.slice(startIndex, startIndex + limit)

    return NextResponse.json({
      comments: paginatedComments,
      pagination: {
        page,
        limit,
        total: totalComments,
        totalPages: Math.ceil(totalComments / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { content, authorId } = body
    const resolvedParams = await params
    const postId = resolvedParams.id

    if (!content || !authorId) {
      return NextResponse.json(
        { error: 'Content and author ID are required' },
        { status: 400 }
      )
    }

    // Verify post exists
    const post = await firestoreService.getById<any>(COLLECTIONS.POSTS, postId)

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    console.log('Creating comment - Author ID:', authorId)

    const result = await firestoreService.create(COLLECTIONS.COMMENTS, {
      postId,
      authorId,
      content,
    })

    // Get author details
    const author = await firestoreService.getById<any>(COLLECTIONS.USERS, authorId)

    console.log('Creating comment - Found author:', author ? { id: author.id, name: author.name, email: author.email } : 'NOT FOUND')

    const comment = {
      id: result.id,
      ...result.data,
      author: author ? {
        id: author.id,
        name: author.name,
        avatar: author.avatar,
      } : null,
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
