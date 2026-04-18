import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where } from '@/lib/firestore'

// DELETE - Delete a comment (by author or org admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the comment to check ownership
    const comment = await firestoreService.getById<any>(COLLECTIONS.COMMENTS, params.id)

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Get the user to check role
    const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is the comment author
    const isAuthor = comment.authorId === userId

    // Check if user is an org admin for this post's organization
    const post = await firestoreService.getById<any>(COLLECTIONS.POSTS, comment.postId)

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user manages this organization
    const isOrgAdmin = user.managedOrgs &&
      user.managedOrgs.split(',').map((id: string) => id.trim()).includes(post.orgId)

    // Allow deletion if user is author or org admin
    if (!isAuthor && !isOrgAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this comment' },
        { status: 403 }
      )
    }

    // Delete the comment
    await firestoreService.delete(COLLECTIONS.COMMENTS, params.id)

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
