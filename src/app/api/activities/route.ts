import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where, orderBy, collection, doc } from '@/lib/firestore'
import { db } from '@/lib/firebase'

// GET activities for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const id = searchParams.get('id')

    if (id) {
      // Get single activity
      const activity = await firestoreService.getById<any>(COLLECTIONS.ACTIVITIES, id)

      if (!activity) {
        return NextResponse.json(
          { error: 'Activity not found' },
          { status: 404 }
        )
      }

      // Get org details
      const org = await firestoreService.getById<any>(COLLECTIONS.ORGANIZATIONS, activity.orgId)

      return NextResponse.json({
        activity: {
          ...activity,
          org: org ? { id: org.id, name: org.name } : null,
        },
      })
    }

    if (orgId) {
      // Get all activities for an organization
      const activities = await firestoreService.query<any>(
        COLLECTIONS.ACTIVITIES,
        [where('orgId', '==', orgId)]
      )

      // Sort by date in descending order
      const sortedActivities = activities.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      return NextResponse.json({ activities: sortedActivities })
    }

    return NextResponse.json(
      { error: 'orgId or id is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Activities fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new activity — uses setDoc with custom ID (same pattern as update)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, title, date, description, image, fee } = body

    if (!orgId || !title || !date || !description) {
      return NextResponse.json(
        { error: 'orgId, title, date, and description are required' },
        { status: 400 }
      )
    }

    const activityId = doc(collection(db, COLLECTIONS.ACTIVITIES)).id

    const activityData: any = {
      orgId,
      title,
      date,
      description,
    }

    if (fee !== undefined && fee !== null) {
      activityData.fee = Number(fee) || 0
    }

    if (image && image.trim() !== '') {
      activityData.image = image
    }

    // Use setDoc with a custom ID — same pattern as updateDoc in PUT
    const result = await firestoreService.create(COLLECTIONS.ACTIVITIES, activityData, activityId)

    return NextResponse.json({
      message: 'Activity created successfully',
      activityId: result.id,
    })
  } catch (error) {
    console.error('Activity creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update activity
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, date, description, image, fee, feePayments } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (date !== undefined) updateData.date = date
    if (description !== undefined) updateData.description = description
    if (image !== undefined) updateData.image = image
    if (fee !== undefined) updateData.fee = Number(fee) || 0
    if (feePayments !== undefined) updateData.feePayments = feePayments

    await firestoreService.update(COLLECTIONS.ACTIVITIES, id, updateData)

    return NextResponse.json({
      message: 'Activity updated successfully',
    })
  } catch (error) {
    console.error('Activity update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete activity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    await firestoreService.delete(COLLECTIONS.ACTIVITIES, id)

    return NextResponse.json({
      message: 'Activity deleted successfully',
    })
  } catch (error) {
    console.error('Activity deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
