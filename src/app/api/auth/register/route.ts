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
      [where('email', '==', email)]
    )

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Create new user
    const result = await firestoreService.create(COLLECTIONS.USERS, {
      name,
      email,
      password, // In production, this should be hashed
      role: 'Student',
      bio: '',
      phone: '',
      major: '',
      avatar: avatar && avatar.startsWith('data:') ? avatar : '', // Store Base64 avatar if provided
      managedOrgs: [],
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
