'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { profiles, user_branch_access, branches } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type StaffRow = {
  userId: string
  fullName: string | null
  email: string | null
  role: string | null
  branchId: string | null
  branchName: string | null
  isPrimary: boolean | null
}

export async function getStaffDirectory(input?: { branchId?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    const query = db
      .select({
        userId: profiles.id,
        fullName: profiles.full_name,
        email: profiles.email,
        role: profiles.role,
        branchId: user_branch_access.branch_id,
        branchName: branches.name,
        isPrimary: user_branch_access.is_primary,
      })
      .from(profiles)
      .leftJoin(user_branch_access, eq(profiles.id, user_branch_access.user_id))
      .leftJoin(branches, eq(user_branch_access.branch_id, branches.id))
      .orderBy(profiles.full_name)

    if (!isAdmin) {
      if (!session.user.branchId) {
        return { success: false as const, error: 'No branch assigned to your account' }
      }
      const rows = await query.where(
        eq(user_branch_access.branch_id, session.user.branchId)
      )
      return { success: true as const, staff: rows }
    }

    if (input?.branchId) {
      const rows = await query.where(
        eq(user_branch_access.branch_id, input.branchId)
      )
      return { success: true as const, staff: rows }
    }

    const rows = await query
    return { success: true as const, staff: rows }
  } catch (error) {
    console.error('HR error:', error)
    return { success: false as const, error: (error as Error).message }
  }
}
