import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where } from '@/lib/firestore'

// GET all allowed students
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (email) {
      // Check if a specific email is allowed
      const allowedStudents = await firestoreService.query<any>(
        COLLECTIONS.ALLOWED_STUDENTS,
        [where('email', '==', email.toLowerCase())]
      )

      return NextResponse.json({
        allowed: allowedStudents.length > 0,
        student: allowedStudents[0] || null
      })
    }

    // Get all allowed students
    const students = await firestoreService.getAll<any>(COLLECTIONS.ALLOWED_STUDENTS)

    // Sort by name
    students.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Allowed students fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add a new allowed student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, status = 'active' } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingStudents = await firestoreService.query<any>(
      COLLECTIONS.ALLOWED_STUDENTS,
      [where('email', '==', email.toLowerCase())]
    )

    if (existingStudents && existingStudents.length > 0) {
      return NextResponse.json(
        { error: 'This email is already in the allowed list' },
        { status: 400 }
      )
    }

    // Create new allowed student
    const result = await firestoreService.create(COLLECTIONS.ALLOWED_STUDENTS, {
      name,
      email: email.toLowerCase(),
      status, // 'active' or 'inactive'
    })

    return NextResponse.json(
      { message: 'Student added to allowed list', student: { id: result.id, ...result.data } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Allowed student creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update an allowed student
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Check if student exists
    const existingStudent = await firestoreService.getById<any>(COLLECTIONS.ALLOWED_STUDENTS, id)

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // If email is being changed, check for duplicates
    if (email && email.toLowerCase() !== existingStudent.email) {
      const duplicateStudents = await firestoreService.query<any>(
        COLLECTIONS.ALLOWED_STUDENTS,
        [where('email', '==', email.toLowerCase())]
      )

      if (duplicateStudents && duplicateStudents.length > 0) {
        return NextResponse.json(
          { error: 'This email is already in the allowed list' },
          { status: 400 }
        )
      }
    }

    // Update student
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email.toLowerCase()
    if (status) updateData.status = status

    await firestoreService.update(COLLECTIONS.ALLOWED_STUDENTS, id, updateData)

    const updatedStudent = await firestoreService.getById<any>(COLLECTIONS.ALLOWED_STUDENTS, id)

    return NextResponse.json({
      message: 'Student updated successfully',
      student: updatedStudent,
    })
  } catch (error) {
    console.error('Allowed student update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove an allowed student
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Check if student exists
    const existingStudent = await firestoreService.getById<any>(COLLECTIONS.ALLOWED_STUDENTS, id)

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Delete student
    await firestoreService.delete(COLLECTIONS.ALLOWED_STUDENTS, id)

    return NextResponse.json({
      message: 'Student removed from allowed list',
    })
  } catch (error) {
    console.error('Allowed student deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
