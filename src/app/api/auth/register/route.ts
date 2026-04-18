import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where } from '@/lib/firestore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, avatar } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUsers = await firestoreService.query<any>(
      COLLECTIONS.USERS,
      [where('email', '==', email.toLowerCase())]
    )

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Check if email is in the allowed_students list
    const allowedStudents = await firestoreService.query<any>(
      COLLECTIONS.ALLOWED_STUDENTS,
      [where('email', '==', email.toLowerCase())]
    )

    if (!allowedStudents || allowedStudents.length === 0) {
      return NextResponse.json(
        { error: 'Your email is not authorized to register. Please contact the administrator.' },
        { status: 403 }
      )
    }

    // Check if the allowed student is active
    const allowedStudent = allowedStudents[0]
    if (allowedStudent.status === 'inactive') {
      return NextResponse.json(
        { error: 'Your registration is currently not allowed. Please contact the administrator.' },
        { status: 403 }
      )
    }

    // Use the name from allowed_students if not provided
    const studentName = name || allowedStudent.name || 'Student'

    // Create new user with membership_status
    const result = await firestoreService.create(COLLECTIONS.USERS, {
      name: studentName,
      email: email.toLowerCase(),
      password, // In production, this should be hashed
      role: 'Student',
      bio: '',
      phone: '',
      major: '',
      avatar: avatar && avatar.startsWith('data:') ? avatar : '', // Store Base64 avatar if provided
      managedOrgs: '',
      membershipStatus: 'Pending', // Default membership status
      allowedStudentId: allowedStudent.id, // Link to allowed_students record
    })

    const { password: _, ...userWithoutPassword } = result.data

    return NextResponse.json(
      { message: 'User created successfully', user: { id: result.id, ...userWithoutPassword } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
