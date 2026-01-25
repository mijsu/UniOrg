import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where, orderBy } from '@/lib/firestore'

// GET join requests for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const id = searchParams.get('id')

    if (id) {
      // Get single request
      const joinRequest = await firestoreService.getById<any>(COLLECTIONS.JOIN_REQUESTS, id)

      if (!joinRequest) {
        return NextResponse.json(
          { error: 'Request not found' },
          { status: 404 }
        )
      }

      // Get user and org details
      const user = await firestoreService.getById<any>(COLLECTIONS.USERS, joinRequest.userId)
      const org = await firestoreService.getById<any>(COLLECTIONS.ORGANIZATIONS, joinRequest.orgId)

      return NextResponse.json({
        request: {
          ...joinRequest,
          user: user ? { id: user.id, name: user.name, email: user.email, avatar: user.avatar } : null,
          org: org ? { id: org.id, name: org.name } : null,
        },
      })
    }

    if (userId) {
      // Get all requests for a user
      try {
        const constraints: any[] = [where('userId', '==', userId)]
        const requests = await firestoreService.query<any>(COLLECTIONS.JOIN_REQUESTS, constraints)

        // Sort by createdAt in-memory to avoid index requirement
        const sortedRequests = requests.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        // Get organization details
        const orgIds = [...new Set(sortedRequests.map((r: any) => r.orgId))]
        const orgs = orgIds.length > 0
          ? await firestoreService.query<any>(
            COLLECTIONS.ORGANIZATIONS,
            [where('id', 'in', orgIds)]
          )
          : []

        const requestsWithOrgs = sortedRequests.map((r: any) => ({
          ...r,
          org: orgs.find((o: any) => o.id === r.orgId) || null,
        }))

        return NextResponse.json({ requests: requestsWithOrgs })
      } catch (queryError: any) {
        console.error('Error querying requests by userId:', queryError)
        // Return empty array on error to prevent 500
        return NextResponse.json({ requests: [] })
      }
    }

    if (orgId) {
      // Get all requests for an organization
      const constraints: any[] = [where('orgId', '==', orgId)]
      if (status) {
        constraints.push(where('status', '==', status))
      }
      constraints.push(orderBy('createdAt', 'desc'))

      const requests = await firestoreService.query<any>(COLLECTIONS.JOIN_REQUESTS, constraints)

      // Get user details
      const userIds = [...new Set(requests.map((r: any) => r.userId))]
      const users = userIds.length > 0
        ? await firestoreService.query<any>(
          COLLECTIONS.USERS,
          [where('id', 'in', userIds)]
        )
        : []

      const requestsWithUsers = requests.map((r: any) => ({
        ...r,
        user: users.find((u: any) => u.id === r.userId) || null,
      }))

      return NextResponse.json({ requests: requestsWithUsers })
    }

    return NextResponse.json(
      { error: 'orgId, userId, or id is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Requests fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new join request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, userId } = body

    if (!orgId || !userId) {
      return NextResponse.json(
        { error: 'orgId and userId are required' },
        { status: 400 }
      )
    }

    // Check if request already exists
    const existingRequests = await firestoreService.query<any>(
      COLLECTIONS.JOIN_REQUESTS,
      [where('userId', '==', userId), where('orgId', '==', orgId)]
    )

    if (existingRequests && existingRequests.length > 0) {
      if (existingRequests[0].status === 'pending') {
        return NextResponse.json(
          { error: 'Request already pending' },
          { status: 400 }
        )
      }
      if (existingRequests[0].status === 'approved') {
        return NextResponse.json(
          { error: 'Already a member' },
          { status: 400 }
        )
      }
    }

    // Create join request
    const result = await firestoreService.create(COLLECTIONS.JOIN_REQUESTS, {
      orgId,
      userId,
      status: 'pending',
    })

    return NextResponse.json(
      { message: 'Join request sent successfully', request: { id: result.id, ...result.data } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Join request creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update join request (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    console.log('=== PUT /api/requests called ===')
    console.log('Request ID:', id)
    console.log('Status:', status)

    if (!id || !status) {
      console.log('Missing id or status!')
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      )
    }

    // Get request
    const existingRequest = await firestoreService.getById<any>(COLLECTIONS.JOIN_REQUESTS, id)
    console.log('Existing request:', existingRequest)

    if (!existingRequest) {
      console.log('Request not found, returning 404')
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    console.log('Updating request status to:', status)
    // Update request status
    await firestoreService.update(COLLECTIONS.JOIN_REQUESTS, id, { status })
    console.log('Request status updated successfully')

    // If approved, add as member
    if (status === 'approved') {
      console.log('=== Approving request ===')
      console.log('Existing request details:', existingRequest)
      console.log('User ID:', existingRequest.userId)
      console.log('Org ID:', existingRequest.orgId)

      // Check if already a member
      console.log('Checking for existing members...')
      const existingMembers = await firestoreService.query<any>(
        COLLECTIONS.MEMBERS,
        [where('userId', '==', existingRequest.userId), where('orgId', '==', existingRequest.orgId)]
      )

      console.log('Existing members found:', existingMembers.length)

      if (!existingMembers || existingMembers.length === 0) {
        // Check if org already has an admin
        const existingOrgMembers = await firestoreService.query<any>(
          COLLECTIONS.MEMBERS,
          [where('orgId', '==', existingRequest.orgId)]
        )

        const hasAdmin = existingOrgMembers && existingOrgMembers.some((m: any) => m.role === 'Admin')

        // If no admin yet, make this user the admin
        const memberRole = hasAdmin ? 'Member' : 'Admin'

        console.log('Creating new member with role:', memberRole, '(hasAdmin:', hasAdmin, ')')

        const newMember = await firestoreService.create(COLLECTIONS.MEMBERS, {
          userId: existingRequest.userId,
          orgId: existingRequest.orgId,
          role: memberRole,
          joinedDate: new Date().toISOString(),
        })
        console.log('New member created successfully:', newMember)

        // If made admin, update user's role and managedOrgs
        if (memberRole === 'Admin') {
          const user = await firestoreService.getById<any>(COLLECTIONS.USERS, existingRequest.userId)
          if (user) {
            const currentManagedOrgs = user.managedOrgs && typeof user.managedOrgs === 'string'
              ? user.managedOrgs.split(',')
              : []
            const updatedManagedOrgs = [...new Set([...currentManagedOrgs, existingRequest.orgId])].join(',')

            await firestoreService.update(COLLECTIONS.USERS, existingRequest.userId, {
              role: 'OrgAdmin',
              managedOrgs: updatedManagedOrgs,
            })

            console.log('User promoted to OrgAdmin:', existingRequest.userId, 'managedOrgs:', updatedManagedOrgs)
          }
        }
      } else {
        console.log('User is already a member, skipping member creation. Existing member:', existingMembers[0])
      }
    }

    const updatedRequest = await firestoreService.getById<any>(COLLECTIONS.JOIN_REQUESTS, id)

    return NextResponse.json({
      message: `Request ${status} successfully`,
      request: updatedRequest,
    })
  } catch (error) {
    console.error('Join request update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete join request
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    await firestoreService.delete(COLLECTIONS.JOIN_REQUESTS, id)

    return NextResponse.json({
      message: 'Request deleted successfully',
    })
  } catch (error) {
    console.error('Request deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
