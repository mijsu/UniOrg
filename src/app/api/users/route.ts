import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where } from '@/lib/firestore'

// GET all users (for admin)
export async function GET(request: NextRequest) {
  try {
    const users = await firestoreService.getAll<any>(COLLECTIONS.USERS)

    // Fetch memberships for each user
    const usersWithMemberships = await Promise.all(
      users.map(async (user) => {
        const memberships = await firestoreService.query<any>(
          COLLECTIONS.MEMBERS,
          [where('userId', '==', user.id)]
        )

        const membershipOrgIds = memberships.map((m) => m.orgId)

        console.log('Fetching orgs for user:', user.id, 'membershipOrgIds:', membershipOrgIds)

        let orgs: any[] = []

        if (membershipOrgIds.length > 0) {
          // Fetch organizations individually to avoid issues with 'in' operator
          for (const orgId of membershipOrgIds) {
            try {
              const org = await firestoreService.getById<any>(COLLECTIONS.ORGANIZATIONS, orgId.trim())
              if (org) {
                orgs.push(org)
              }
            } catch (error) {
              console.error('Error fetching org:', orgId, error)
            }
          }
        }

        console.log('Fetched orgs count:', orgs.length, 'orgs:', orgs)

        return {
          ...user,
          memberships: memberships.map((m) => {
            const org = orgs.find((o) => o.id === m.orgId)
            console.log('Matching membership orgId:', m.orgId, 'to org:', org)
            return {
              id: org?.id || m.orgId,
              name: org?.name || m.orgId,
              role: m.role,
            }
          }),
        }
      })
    )

    return NextResponse.json({ users: usersWithMemberships })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update user role (for admin)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, role, orgId } = body

    if (!id || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['Admin', 'OrgAdmin', 'Student']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Get current user data
    const currentUser = await firestoreService.getById<any>(COLLECTIONS.USERS, id)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      role,
    }

    // Handle managedOrgs when changing to/from OrgAdmin
    const currentManagedOrgs = currentUser.managedOrgs && typeof currentUser.managedOrgs === 'string'
      ? currentUser.managedOrgs.split(',')
      : []

    if (role === 'OrgAdmin' && orgId) {
      // Add org to managedOrgs if not already there
      if (!currentManagedOrgs.includes(orgId)) {
        updateData.managedOrgs = [...currentManagedOrgs, orgId].join(',')
      }
    } else if (role === 'OrgAdmin') {
      // If becoming OrgAdmin without specifying orgId, use current managedOrgs
      // (this handles the case when admin just changes role to OrgAdmin)
      if (!updateData.managedOrgs) {
        updateData.managedOrgs = currentManagedOrgs.join(',')
      }
    } else if (role !== 'OrgAdmin') {
      // Remove all managed orgs if no longer OrgAdmin
      updateData.managedOrgs = ''
    }

    // Update user document
    await firestoreService.update(COLLECTIONS.USERS, id, updateData)

    // Create or update membership entries for OrgAdmin
    if (role === 'OrgAdmin') {
      const managedOrgIds = updateData.managedOrgs && typeof updateData.managedOrgs === 'string'
        ? updateData.managedOrgs.split(',')
        : []

      console.log('Creating OrgAdmin memberships for user:', id, 'managedOrgs:', managedOrgIds)

      // For each managed org, ensure user is a member with Admin role
      for (const orgIdToManage of managedOrgIds) {
        if (orgIdToManage.trim() === '') continue

        console.log('Processing org for user:', id, 'orgId:', orgIdToManage.trim())

        // Check if membership already exists
        const existingMembers = await firestoreService.query<any>(
          COLLECTIONS.MEMBERS,
          [where('userId', '==', id), where('orgId', '==', orgIdToManage.trim())]
        )

        console.log('Existing members for org:', existingMembers.length, existingMembers)

        if (existingMembers && existingMembers.length > 0) {
          // Update existing membership ONLY if it's not already Admin
          const currentMemberRole = existingMembers[0].role
          console.log('Existing membership role:', currentMemberRole, 'Should update to Admin?', currentMemberRole !== 'Admin')

          if (currentMemberRole !== 'Admin') {
            console.log('Updating membership to Admin role')
            await firestoreService.update(COLLECTIONS.MEMBERS, existingMembers[0].id, {
              role: 'Admin',
            })
          } else {
            console.log('Membership is already Admin, skipping update')
          }
        } else {
          // Create new membership entry
          console.log('Creating new membership with Admin role')
          await firestoreService.create(COLLECTIONS.MEMBERS, {
            userId: id,
            orgId: orgIdToManage.trim(),
            role: 'Admin',
            joinedDate: new Date().toISOString(),
          })
        }
      }

      // Delete any pending join requests for organizations where user is now OrgAdmin
      console.log('Deleting join requests for user:', id, 'managed orgs:', managedOrgIds)
      for (const orgId of managedOrgIds) {
        if (orgId.trim() === '') continue

        // Find and delete any pending join requests from this user for this organization
        const existingRequests = await firestoreService.query<any>(
          COLLECTIONS.JOIN_REQUESTS,
          [where('userId', '==', id), where('orgId', '==', orgId.trim())]
        )

        console.log('Found existing join requests:', existingRequests.length, 'for org:', orgId.trim())

        if (existingRequests && existingRequests.length > 0) {
          for (const request of existingRequests) {
            console.log('Deleting join request:', request.id)
            await firestoreService.delete(COLLECTIONS.JOIN_REQUESTS, request.id)
          }
        }
      }
    }

    // Remove membership entries for orgs no longer managed
    if (role !== 'OrgAdmin') {
      const allMemberships = await firestoreService.query<any>(
        COLLECTIONS.MEMBERS,
        [where('userId', '==', id)]
      )

      for (const membership of allMemberships) {
        const isStillManaging = currentManagedOrgs.includes(membership.orgId)
        if (!isStillManaging && membership.role === 'Admin') {
          await firestoreService.delete(COLLECTIONS.MEMBERS, membership.id)
        }
      }
    }

    // Get updated user
    const updatedUser = await firestoreService.getById<any>(COLLECTIONS.USERS, id)

    return NextResponse.json({
      message: 'User role updated successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete user (for admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Delete user's memberships
    const memberships = await firestoreService.query<any>(
      COLLECTIONS.MEMBERS,
      [where('userId', '==', id)]
    )

    for (const membership of memberships) {
      await firestoreService.delete(COLLECTIONS.MEMBERS, membership.id)
    }

    // Delete user
    await firestoreService.delete(COLLECTIONS.USERS, id)

    return NextResponse.json({
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
