import { NextRequest, NextResponse } from 'next/server'
import { firestoreService, COLLECTIONS, query, where } from '@/lib/firestore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const users = await firestoreService.query<any>(
      COLLECTIONS.USERS,
      [where('email', '==', email)]
    )

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const user = users[0]

    // Check password (in production, use bcrypt.compare)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      )
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
