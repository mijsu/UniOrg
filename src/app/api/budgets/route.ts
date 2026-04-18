import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where, orderBy } from '@/lib/firestore'

// GET budgets for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const id = searchParams.get('id')

    if (id) {
      // Get single budget
      const budget = await firestoreService.getById<any>(COLLECTIONS.BUDGETS, id)

      if (!budget) {
        return NextResponse.json(
          { error: 'Budget not found' },
          { status: 404 }
        )
      }

      // Get org details
      const org = await firestoreService.getById<any>(COLLECTIONS.ORGANIZATIONS, budget.orgId)

      return NextResponse.json({
        budget: {
          ...budget,
          org: org ? { id: org.id, name: org.name } : null,
        },
      })
    }

    if (orgId) {
      // Get all budgets for an organization
      const budgets = await firestoreService.query<any>(
        COLLECTIONS.BUDGETS,
        [where('orgId', '==', orgId), orderBy('category', 'asc')]
      )

      return NextResponse.json({ budgets })
    }

    return NextResponse.json(
      { error: 'orgId or id is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Budgets fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new budget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, category, allocated, limit } = body

    if (!orgId || !category || limit === undefined) {
      return NextResponse.json(
        { error: 'orgId, category, and limit are required' },
        { status: 400 }
      )
    }

    const result = await firestoreService.create(COLLECTIONS.BUDGETS, {
      orgId,
      category,
      allocated: allocated || 0,
      limit: parseFloat(limit),
    })

    return NextResponse.json(
      { message: 'Budget created successfully', budget: { id: result.id, ...result.data } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Budget creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update budget
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, category, allocated, limit } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Budget ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (category !== undefined) updateData.category = category
    if (allocated !== undefined) updateData.allocated = parseFloat(allocated)
    if (limit !== undefined) updateData.limit = parseFloat(limit)

    await firestoreService.update(COLLECTIONS.BUDGETS, id, updateData)

    const budget = await firestoreService.getById<any>(COLLECTIONS.BUDGETS, id)

    return NextResponse.json({
      message: 'Budget updated successfully',
      budget,
    })
  } catch (error) {
    console.error('Budget update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete budget
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Budget ID is required' },
        { status: 400 }
      )
    }

    await firestoreService.delete(COLLECTIONS.BUDGETS, id)

    return NextResponse.json({
      message: 'Budget deleted successfully',
    })
  } catch (error) {
    console.error('Budget deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
