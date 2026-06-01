'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { profiles, user_branch_access } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Sets the active branch for the current session via a persistent cookie.
 * Triggers a global revalidation to ensure all Server Components (Layout, Registry, POS)
 * reflect the newly selected context.
 */
export async function setActiveBranchAction(branchId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')

  const userId = session.user.id

  // Check role via Drizzle — single targeted query, no full-table scan
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  const normalizedRole = (profile?.role ?? '').toLowerCase().trim()
  const isAdmin = normalizedRole === 'admin/owner' || normalizedRole === 'admin'
    || normalizedRole === 'owner' || normalizedRole === 'super_admin'

  if (!isAdmin) {
    // Validate branch access via Drizzle — targeted lookup
    const [access] = await db
      .select({ user_id: user_branch_access.user_id })
      .from(user_branch_access)
      .where(
        and(
          eq(user_branch_access.user_id, userId),
          eq(user_branch_access.branch_id, branchId)
        )
      )
      .limit(1)

    if (!access) {
      throw new Error(`Forbidden: You do not have access to branch ${branchId}.`)
    }
  }

  const cookieStore = await cookies()

  cookieStore.set('active_branch_id', branchId, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')

  return { success: true }
}
