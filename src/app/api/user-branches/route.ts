import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { branches, user_branch_access } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { asc } from 'drizzle-orm'
import { isBranchScoped, normalizeRole } from '@/lib/rbac'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ data: [] }, { status: 401 })
  }

  try {
    if (!isBranchScoped(normalizeRole(session.user.role))) {
      const rows = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .orderBy(asc(branches.name))
      return NextResponse.json({ data: rows })
    }

    const rows = await db
      .select({
        id: branches.id,
        name: branches.name,
      })
      .from(user_branch_access)
      .innerJoin(
        branches,
        eq(user_branch_access.branch_id, branches.id)
      )
      .where(eq(user_branch_access.user_id, session.user.id))
      .orderBy(asc(branches.name))

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error('User branches error:', error)
    return NextResponse.json({ data: [] })
  }
}
