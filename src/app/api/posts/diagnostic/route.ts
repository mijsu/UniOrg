import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS } from '@/lib/firestore'

// GET - Diagnostic endpoint to list all posts
export async function GET(request: NextRequest) {
  try {
    const allPosts = await firestoreService.query<any>(COLLECTIONS.POSTS, [])

    // Get organization names for each post
    const postsWithOrgNames = []
    for (const post of allPosts) {
      try {
        const org = await firestoreService.getById<any>(COLLECTIONS.ORGANIZATIONS, post.orgId)
        const author = await firestoreService.getById<any>(COLLECTIONS.USERS, post.authorId)

        postsWithOrgNames.push({
          id: post.id,
          orgId: post.orgId,
          orgName: org?.name || 'Unknown',
          authorId: post.authorId,
          authorName: author?.name || 'Unknown',
          authorEmail: author?.email || 'Unknown',
          content: post.content?.substring(0, 100) + '...',
          createdAt: post.createdAt
        })
      } catch (error) {
        console.error('Error fetching org/author for post:', error)
      }
    }

    return NextResponse.json({
      totalPosts: allPosts.length,
      posts: postsWithOrgNames
    })
  } catch (error) {
    console.error('Error fetching all posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}
