"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/db/client"
import { profiles, user_permissions, user_branch_access } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function updateUserProfileAction(id: string, fullName: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: { message: 'Unauthorized: not authenticated' } }
  }

  try {
    const data = await db.update(profiles).set({ full_name: fullName }).where(eq(profiles.id, id)).returning()
    return { data: data[0] }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getUserPermissionsAction(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: { message: 'Unauthorized: not authenticated' } }
  }

  try {
    const profileData = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, id)).limit(1)
    const permsData = await db.select().from(user_permissions).where(eq(user_permissions.user_id, id))

    const permissions: Record<string, boolean> = {}
    permsData.forEach(p => {
      permissions[p.module] = p.enabled || false
    })

    return { data: { role: profileData[0]?.role || "", permissions } }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getUserProfileAction(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: { message: 'Unauthorized: not authenticated' } }
  }

  try {
    const data = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1)
    return { data: data[0] }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getUserAction() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { data: { user: null } }
  return { data: { user: session.user } }
}

export async function signOutAction() {
  return { error: null }
}

export async function getUserBranchIdsAction(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: { message: 'Unauthorized' } }
  try {
    const rows = await db
      .select({ branchId: user_branch_access.branch_id, isPrimary: user_branch_access.is_primary })
      .from(user_branch_access)
      .where(eq(user_branch_access.user_id, id))
    // primary first, then the rest
    const sorted = rows.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    return { data: sorted.map(r => r.branchId).filter(Boolean) as string[] }
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : String(error) } }
  }
}
