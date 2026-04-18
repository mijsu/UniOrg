import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS } from '@/lib/firestore'

// GET - List posts for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const userId = searchParams.get('userId') // Get userId for authorization check
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    console.log('Posts API - Requested orgId:', orgId, 'userId:', userId)

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Authorization check: Verify user is a member of the organization
    if (userId) {
      console.log('Checking authorization for user:', userId, 'in org:', orgId)

      // Get user's memberships to check if they're a member of this org
      const userMembers = await firestoreService.query<any>(
        COLLECTIONS.MEMBERS,
        [{ field: 'userId', operator: '==', value: userId }]
      )

      const isMember = userMembers.some((m: any) => m.orgId === orgId)
      console.log('User memberships:', userMembers.length, 'Is member of org:', isMember)

      if (!isMember) {
        return NextResponse.json(
          { error: 'You must be a member of this organization to view posts' },
          { status: 403 }
        )
      }
    }

    console.log('Posts API - Querying posts with filter:', { field: 'orgId', operator: '==', value: orgId })

    const allPosts = await firestoreService.query<any>(
      COLLECTIONS.POSTS,
      [{ field: 'orgId', operator: '==', value: orgId }]
    )

    console.log('Posts API - Raw query results:', allPosts.length)
    console.log('Posts API - All returned post orgIds:', allPosts.map(p => ({ id: p.id, orgId: p.orgId, content: p.content?.substring(0, 50) })))

    // IMPORTANT: Filter posts by orgId as a safety measure
    // (in case Firestore query filter doesn't work properly)
    const filteredPosts = allPosts.filter((post: any) => post.orgId === orgId)

    console.log('Posts API - After manual filter:', filteredPosts.length, 'posts from org:', orgId)

    console.log('Posts API - Found posts for org:', filteredPosts.length)

    // Sort by createdAt in descending order
    const sortedPosts = filteredPosts.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Get unique author IDs for posts
    const authorIds = [...new Set(sortedPosts.map((p: any) => p.authorId))]

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

    // Add authors to posts
    const posts: any[] = []
    for (const post of sortedPosts) {
      posts.push({
        ...post,
        author: authorsMap[post.authorId] || null
      })
    }

    console.log('Posts with authors:', posts.map(p => ({
      id: p.id,
      orgId: p.orgId,
      authorName: p.author?.name,
      authorEmail: p.author?.email,
      content: p.content?.substring(0, 50) + '...'
    })))

    // Get comments for each post
    const postsWithComments: any[] = []
    for (const post of posts) {
      const allComments = await firestoreService.query<any>(
        COLLECTIONS.COMMENTS,
        [{ field: 'postId', operator: '==', value: post.id }]
      )

      // IMPORTANT: Filter comments by postId as a safety measure
      // (in case Firestore query filter doesn't work properly)
      const comments = allComments.filter((comment: any) => comment.postId === post.id)

      console.log(`Posts API - Post ${post.id}: Total comments fetched: ${allComments.length}, Filtered to: ${comments.length}`)

      // Sort comments by createdAt in descending order
      const sortedComments = comments.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      const commentAuthorIds = [...new Set(sortedComments.map((c: any) => c.authorId))]

      // Fetch comment authors individually
      const commentAuthorsMap: { [key: string]: any } = {}
      for (const authorId of commentAuthorIds) {
        try {
          const author = await firestoreService.getById<any>(COLLECTIONS.USERS, authorId)
          if (author) {
            commentAuthorsMap[authorId] = author
          }
        } catch (error) {
          console.error(`Failed to fetch comment author ${authorId}:`, error)
        }
      }

      const commentsWithAuthors = sortedComments.slice(0, 3).map((comment: any) => ({
        ...comment,
        author: commentAuthorsMap[comment.authorId] || null
      }))

      postsWithComments.push({
        ...post,
        comments: commentsWithAuthors,
        reactions: []
      })
    }

    const totalPosts = sortedPosts.length
    const startIndex = (page - 1) * limit
    const paginatedPosts = postsWithComments.slice(startIndex, startIndex + limit)

    return NextResponse.json({
      posts: paginatedPosts,
      pagination: {
        page,
        limit,
        total: totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

// POST - Create a new post (verify user is member/admin of org)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, content, imageUrl, authorId } = body

    console.log('Creating post - orgId:', orgId, 'authorId:', authorId)

    if (!orgId || !content || !authorId) {
      return NextResponse.json(
        { error: 'Organization ID, content, and author ID are required' },
        { status: 400 }
      )
    }

    // Verify user is a member or admin of the organization
    const userMembers = await firestoreService.query<any>(
      COLLECTIONS.MEMBERS,
      [{ field: 'userId', operator: '==', value: authorId }]
    )

    const member = userMembers.find((m: any) => m.orgId === orgId)
    console.log('User membership in org:', member ? `${member.role} of ${orgId}` : 'Not a member')

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a member of this organization to create posts' },
        { status: 403 }
      )
    }

    const postData: any = {
      orgId,
      authorId,
      content
    }

    // Add imageUrl if provided (should be Base64 string)
    if (imageUrl && imageUrl.startsWith('data:')) {
      postData.imageUrl = imageUrl
    } else {
      postData.imageUrl = imageUrl || null
    }

    const result = await firestoreService.create(COLLECTIONS.POSTS, postData)

    // Get author details
    const author = await firestoreService.getById<any>(COLLECTIONS.USERS, authorId)
    const post = {
      id: result.id,
      ...result.data,
      author: author ? {
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        email: author.email
      } : null
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}

// PUT - Update a post (verify authorization)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, content, imageUrl, userId } = body

    console.log('Updating post - id:', id, 'userId:', userId)

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Get the existing post to verify authorization
    const existingPost = await firestoreService.getById<any>(COLLECTIONS.POSTS, id)

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify user is authorized to update this post
    // Either the post author, or a member/admin of the organization
    const isPostAuthor = existingPost.authorId === userId
    console.log('Is post author:', isPostAuthor)

    if (!isPostAuthor) {
      // Check if user is a member/admin of the organization
      const userMembers = await firestoreService.query<any>(
        COLLECTIONS.MEMBERS,
        [{ field: 'userId', operator: '==', value: userId }]
      )

      const member = userMembers.find((m: any) => m.orgId === existingPost.orgId)
      console.log('User membership in org:', member ? `${member.role} of ${existingPost.orgId}` : 'Not a member')

      // Only allow update if user is an Admin of the org
      if (!member || member.role !== 'Admin') {
        return NextResponse.json(
          { error: 'You do not have permission to update this post' },
          { status: 403 }
        )
      }
    }

    const postData: any = {}

    if (content) {
      postData.content = content
    }

    if (imageUrl) {
      if (imageUrl.startsWith('data:')) {
        postData.imageUrl = imageUrl
      } else {
        postData.imageUrl = imageUrl || null
      }
    }

    await firestoreService.update(COLLECTIONS.POSTS, id, postData)

    const updatedPost = await firestoreService.getById<any>(COLLECTIONS.POSTS, id)
    return NextResponse.json({ post: updatedPost }, { status: 200 })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

// DELETE - Delete a post (verify authorization)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    console.log('Deleting post - id:', id, 'userId:', userId)

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Get the existing post to verify authorization
    const existingPost = await firestoreService.getById<any>(COLLECTIONS.POSTS, id)

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify user is authorized to delete this post
    // Either the post author, or an Admin of the organization
    const isPostAuthor = existingPost.authorId === userId
    console.log('Is post author:', isPostAuthor)

    if (!isPostAuthor) {
      // Check if user is an Admin of the organization
      const userMembers = await firestoreService.query<any>(
        COLLECTIONS.MEMBERS,
        [{ field: 'userId', operator: '==', value: userId }]
      )

      const member = userMembers.find((m: any) => m.orgId === existingPost.orgId)
      console.log('User membership in org:', member ? `${member.role} of ${existingPost.orgId}` : 'Not a member')

      // Only allow delete if user is an Admin of the org
      if (!member || member.role !== 'Admin') {
        return NextResponse.json(
          { error: 'You do not have permission to delete this post' },
          { status: 403 }
        )
      }
    }

    await firestoreService.delete(COLLECTIONS.POSTS, id)

    return NextResponse.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
