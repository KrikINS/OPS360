import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { users, profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'

export async function GET() {
  return NextResponse.json({ data: [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ETHAN-XXXX format — excludes ambiguous chars (0, O, 1, I)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const suffix = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    const temporaryPassword = `ETHAN-${suffix}`

    const password_hash = await bcrypt.hash(temporaryPassword, 10)
    await db
      .update(users)
      .set({ password_hash })
      .where(eq(users.id, userId))

    await db
      .update(profiles)
      .set({ force_password_change: true })
      .where(eq(profiles.id, userId))

    return NextResponse.json({ success: true, temporaryPassword })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}
