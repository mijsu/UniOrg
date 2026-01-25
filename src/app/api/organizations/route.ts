import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where, orderBy } from '@/lib/firestore'

// GET all organizations or a specific organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (id) {
      // Get single organization with details
      const org = await firestoreService.getById<any>(COLLECTIONS.ORGANIZATIONS, id)

      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }

      // Get related data
      console.log('Loading organization members for org:', id)
      const members = await firestoreService.query<any>(
        COLLECTIONS.MEMBERS,
        [where('orgId', '==', id)]
      )
      console.log('Members loaded:', members.length, members)

      const userIds = members.map((m: any) => m.userId)
      console.log('Member userIds:', userIds)

      // Fetch users one by one to avoid Firebase index issues
      const users = await Promise.all(
        userIds.map(async (userId) => {
          try {
            const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)
            console.log('Successfully fetched member user:', userId, user?.name)
            return user
          } catch (e) {
            console.error('Error fetching member user:', userId, e)
            return null
          }
        })
      )

      const filteredMemberUsers = users.filter((u) => u !== null)
      console.log('Member users loaded:', filteredMemberUsers.length, filteredMemberUsers)

      const membersWithUsers = members.map((member: any) => ({
        ...member,
        user: filteredMemberUsers.find((u: any) => u.id === member.userId) || null,
      }))

      console.log('Members with users:', membersWithUsers)

      const activities = await firestoreService.query<any>(
        COLLECTIONS.ACTIVITIES,
        [where('orgId', '==', id)]
      )
      const sortedActivities = activities.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      const budgets = await firestoreService.query<any>(
        COLLECTIONS.BUDGETS,
        [where('orgId', '==', id)]
      )

      const feedback = await firestoreService.query<any>(
        COLLECTIONS.FEEDBACK,
        [where('orgId', '==', id)]
      )
      const sortedFeedback = feedback.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      const feedbackUserIds = sortedFeedback.map((f: any) => f.userId)
      console.log('Feedback user IDs:', feedbackUserIds)

      // Get all reply user IDs as well
      const replyUserIds: string[] = []
      sortedFeedback.forEach((f: any) => {
        if (f.replies && Array.isArray(f.replies)) {
          f.replies.forEach((r: any) => {
            if (r.userId && !replyUserIds.includes(r.userId)) {
              replyUserIds.push(r.userId)
            }
          })
        }
      })

      const allFeedbackUserIds = [...new Set([...feedbackUserIds, ...replyUserIds])]
      console.log('All feedback user IDs including replies:', allFeedbackUserIds)

      // Fetch feedback users one by one to avoid Firebase index issues
      const feedbackUsers = await Promise.all(
        allFeedbackUserIds.map(async (userId) => {
          try {
            const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)
            return user
          } catch (e) {
            console.error('Error fetching user for feedback:', userId, e)
            return null
          }
        })
      )

      const feedbackWithUsers = sortedFeedback.map((f: any) => {
        const user = feedbackUsers.find((u: any) => u && u.id === f.userId) || null

        // Add user info to replies
        const repliesWithUsers = (f.replies || []).map((r: any) => ({
          ...r,
          user: feedbackUsers.find((u: any) => u && u.id === r.userId) || null,
        }))

        return {
          ...f,
          user,
          replies: repliesWithUsers,
        }
      })

      // Get all requests for the organization
      const requests = await firestoreService.query<any>(
        COLLECTIONS.JOIN_REQUESTS,
        [where('orgId', '==', id)]
      )
      const sortedRequests = requests.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      console.log('Requests loaded for org:', id, 'count:', sortedRequests.length)

      // Filter out requests from users who are already members
      const memberUserIds = userIds.map((m: any) => m.userId)
      const filteredRequests = sortedRequests.filter((r: any) => !memberUserIds.includes(r.userId))

      console.log('Filtered requests (excluding members):', filteredRequests.length, filteredRequests.length)

      // Fetch users one by one to avoid Firebase index issues
      const requestUserIds = filteredRequests.map((r: any) => r.userId)
      console.log('Request user IDs:', requestUserIds)

      const requestUsers = await Promise.all(
        requestUserIds.map(async (userId) => {
          try {
            const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)
            console.log('Successfully fetched user:', userId, user?.name)
            return user
          } catch (e) {
            console.error('Error fetching user:', userId, e)
            return null
          }
        })
      )

      const filteredRequestUsers = requestUsers.filter((u) => u !== null)
      console.log('Request users loaded:', filteredRequestUsers.length, filteredRequestUsers)

      const requestsWithUsers = filteredRequests.map((r: any) => ({
        ...r,
        user: filteredRequestUsers.find((u: any) => u.id === r.userId) || null,
      }))

      console.log('Requests with users:', requestsWithUsers.length, requestsWithUsers)

      return NextResponse.json({
        org: {
          ...org,
          members: membersWithUsers,
          activities: sortedActivities,
          budgets,
          feedback: feedbackWithUsers,
          requests: requestsWithUsers,
        },
      })
    }

    // Get all organizations
    const organizations = await firestoreService.getAll<any>(COLLECTIONS.ORGANIZATIONS)

    // Add counts
    const orgsWithCounts = await Promise.all(
      organizations.map(async (org: any) => {
        const members = await firestoreService.query<any>(
          COLLECTIONS.MEMBERS,
          [where('orgId', '==', org.id)]
        )
        const activities = await firestoreService.query<any>(
          COLLECTIONS.ACTIVITIES,
          [where('orgId', '==', org.id)]
        )

        return {
          ...org,
          _count: {
            members: members.length,
            activities: activities.length,
          },
        }
      })
    )

    const sortedOrgs = orgsWithCounts.sort((a: any, b: any) => a.name.localeCompare(b.name))

    // Filter by user membership if userId provided
    if (userId) {
      console.log('=== Fetching organizations for userId:', userId)
      
      // Fetch user's data to check if they're an OrgAdmin
      const user = await firestoreService.getById<any>(COLLECTIONS.USERS, userId)
      console.log('User data:', user)

      if (!user) {
        console.log('User not found, returning empty array')
        return NextResponse.json({ organizations: [] })
      }

      // Get memberships and also check managedOrgs for OrgAdmins
      const userMembers = await firestoreService.query<any>(
        COLLECTIONS.MEMBERS,
        [where('userId', '==', userId)]
      )
      console.log('User memberships:', userMembers.length, userMembers)

      const membershipOrgIds = userMembers.map((m: any) => m.orgId)

      // For OrgAdmins, include organizations they manage
      const managedOrgIds = user.managedOrgs && typeof user.managedOrgs === 'string'
        ? user.managedOrgs.split(',').map((id) => id.trim()).filter((id) => id !== '')
        : []
      console.log('User managedOrgs:', managedOrgIds)

      // Combine membership and managed orgs
      const allUserOrgIds = [...new Set([...membershipOrgIds, ...managedOrgIds])]
      console.log('All user org IDs (combined):', allUserOrgIds)

      if (allUserOrgIds.length > 0) {
        const myOrgs = orgsWithCounts.filter((org: any) => allUserOrgIds.includes(org.id))
        console.log('Filtered organizations for user:', myOrgs.length, myOrgs)

        // Get pending requests count
        const pendingRequests = await firestoreService.query<any>(
          COLLECTIONS.JOIN_REQUESTS,
          [where('orgId', 'in', allUserOrgIds), where('status', '==', 'pending')]
        )

        const requestCountByOrg = pendingRequests.reduce((acc: any, req: any) => {
          acc[req.orgId] = (acc[req.orgId] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        console.log('Pending requests count by org:', requestCountByOrg)

        return NextResponse.json({
          organizations: myOrgs.map((org: any) => {
            const pendingCount = requestCountByOrg[org.id] || 0
            return {
              ...org,
              // Only include pendingRequests if there are any
              ...(pendingCount > 0 && { pendingRequests: pendingCount }),
            }
          }),
        })
      }

      console.log('No org IDs for user, returning empty array')
      return NextResponse.json({ organizations: [] })
    }

    return NextResponse.json({ organizations: sortedOrgs })
  } catch (error) {
    console.error('Organizations fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, mission, logo, cover, creatorUserId } = body

    if (!name || !description || !mission) {
      return NextResponse.json(
        { error: 'Name, description, and mission are required' },
        { status: 400 }
      )
    }

    const orgData: any = {
      name,
      description,
      mission,
    }

    // Add logo if provided (should be Base64 string)
    if (logo && logo.startsWith('data:')) {
      orgData.logo = logo
    } else {
      orgData.logo = logo || `https://picsum.photos/seed/${Date.now()}/200/200`
    }

    // Add cover if provided (should be Base64 string)
    if (cover && cover.startsWith('data:')) {
      orgData.cover = cover
    } else {
      orgData.cover = cover || `https://picsum.photos/seed/${Date.now()}_cover/1200/400`
    }

    const result = await firestoreService.create(COLLECTIONS.ORGANIZATIONS, orgData)
    const orgId = result.id

    // If creatorUserId is provided, add creator as first org admin
    if (creatorUserId) {
      console.log('Adding creator as org admin:', creatorUserId, 'for org:', orgId)

      // Create membership with Admin role
      await firestoreService.create(COLLECTIONS.MEMBERS, {
        userId: creatorUserId,
        orgId,
        role: 'Admin',
        joinedDate: new Date().toISOString(),
      })

      // Update user's role to OrgAdmin and add org to managedOrgs
      const user = await firestoreService.getById<any>(COLLECTIONS.USERS, creatorUserId)
      if (user) {
        const currentManagedOrgs = user.managedOrgs && typeof user.managedOrgs === 'string'
          ? user.managedOrgs.split(',')
          : []
        const updatedManagedOrgs = [...new Set([...currentManagedOrgs, orgId])].join(',')

        await firestoreService.update(COLLECTIONS.USERS, creatorUserId, {
          role: 'OrgAdmin',
          managedOrgs: updatedManagedOrgs,
        })

        console.log('User updated to OrgAdmin with managedOrgs:', updatedManagedOrgs)

        // Delete any pending join requests from this user for this organization
        const existingRequests = await firestoreService.query<any>(
          COLLECTIONS.JOIN_REQUESTS,
          [where('userId', '==', creatorUserId), where('orgId', '==', orgId)]
        )

        console.log('Found existing join requests for creator:', existingRequests.length)

        if (existingRequests && existingRequests.length > 0) {
          for (const request of existingRequests) {
            console.log('Deleting join request:', request.id)
            await firestoreService.delete(COLLECTIONS.JOIN_REQUESTS, request.id)
          }
        }
      }
    }

    return NextResponse.json(
      { message: 'Organization created successfully', org: { id: orgId, ...result.data } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Organization creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update organization
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, mission, logo, cover, collectionData, cblData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}

    // Only include fields that are provided (not undefined)
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (mission !== undefined) updateData.mission = mission
    if (logo !== undefined) updateData.logo = logo
    if (cover !== undefined) updateData.cover = cover

    // Add collection data if provided
    if (collectionData) {
      updateData.collectionData = {
        totalStudents: parseInt(collectionData.totalStudents) || 0,
        paidStudents: parseInt(collectionData.paidStudents) || 0,
        studentFee: parseInt(collectionData.studentFee) || 150,
      }
    }

    // Add CBL data if provided with PDF validation
    if (cblData !== undefined) {
      // Validate CBL data is base64 and is PDF
      if (cblData && cblData.startsWith('data:application/pdf')) {
        updateData.cbl = {
          data: cblData,
          fileName: cblData.name || 'constitution_bylaws.pdf',
          uploadedAt: new Date().toISOString(),
        }
      } else if (cblData && !cblData.startsWith('data:application/pdf')) {
        return NextResponse.json(
          { error: 'CBL file must be in PDF format only' },
          { status: 400 }
        )
      } else {
        updateData.cbl = null
      }
    }

    await firestoreService.update(
      COLLECTIONS.ORGANIZATIONS,
      id,
      updateData
    )

    const org = await firestoreService.getById<any>(COLLECTIONS.ORGANIZATIONS, id)

    return NextResponse.json({
      message: 'Organization updated successfully',
      org,
    })
  } catch (error) {
    console.error('Organization update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete organization
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Delete related data first
    const members = await firestoreService.query<any>(
      COLLECTIONS.MEMBERS,
      [where('orgId', '==', id)]
    )

    for (const member of members) {
      await firestoreService.delete(COLLECTIONS.MEMBERS, member.id)
    }

    // Delete organization
    await firestoreService.delete(COLLECTIONS.ORGANIZATIONS, id)

    return NextResponse.json({
      message: 'Organization deleted successfully',
    })
  } catch (error) {
    console.error('Organization deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
