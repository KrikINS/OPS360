"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/db/client"
import { profiles, branches, user_permissions, user_branch_access, users } from "@/db/schema"
import { eq, and } from "drizzle-orm"


export async function getBranchesAction() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { data: [] as { id: string; name: string }[], error: 'Unauthorized' }
  }
  try {
    const rows = await db.select({ id: branches.id, name: branches.name }).from(branches).orderBy(branches.name)
    return { data: rows }
  } catch (error) {
    console.error(error)
    return { data: [] as { id: string; name: string }[] }
  }
}

export async function getAdminUsersDataAction(userId: string | undefined) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { profiles: [], branches: [], currentUserProfile: null, stats: { total_users: 0, pending_requests: 0, recent_logins: 0 }, error: 'Unauthorized: not authenticated' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isAdmin) {
    return { profiles: [], branches: [], currentUserProfile: null, stats: { total_users: 0, pending_requests: 0, recent_logins: 0 }, error: 'Insufficient permission' }
  }

  try {
    const allProfiles = await db.select().from(profiles)
    const allBranches = await db.select().from(branches)

    const permsList = await db.select().from(user_permissions)
    const branchAccess = await db.select().from(user_branch_access)

    const profilesWithDetails = allProfiles.map(p => {
      const userPerms = permsList.filter(perm => perm.user_id === p.id)
      const permsMap: Record<string, boolean> = {}
      userPerms.forEach(perm => {
        permsMap[perm.module] = perm.enabled || false
      })

      const uBranches = branchAccess.filter(b => b.user_id === p.id).map(b => b.branch_id)
      return {
        ...p,
        permissions: permsMap,
        assigned_branch_ids: uBranches,
        assigned_branch_id: uBranches.length > 0 ? uBranches[0] : null
      }
    })

    const currentUserProfile = userId ? profilesWithDetails.find(p => p.id === userId) : null

    return {
      profiles: profilesWithDetails,
      branches: allBranches,
      currentUserProfile,
      stats: {
        total_users: profilesWithDetails.length,
        pending_requests: 0,
        recent_logins: 0
      }
    }
  } catch (error) {
    console.error(error)
    return { profiles: [], branches: [], currentUserProfile: null, stats: { total_users: 0, pending_requests: 0, recent_logins: 0 } }
  }
}

export async function updateUserPermissionsAction(input: {
  userId: string
  role: string
  permissions: Record<string, boolean>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  if (!isAdmin) {
    return { success: false, error: 'Admin role required' }
  }

  try {
    await db
      .update(users)
      .set({ role: input.role })
      .where(eq(users.id, input.userId))

    await db
      .update(profiles)
      .set({ role: input.role })
      .where(eq(profiles.id, input.userId))

    // No unique constraint on (user_id, module) — delete then insert
    const modules = Object.keys(input.permissions)
    for (const module of modules) {
      await db
        .delete(user_permissions)
        .where(
          and(
            eq(user_permissions.user_id, input.userId),
            eq(user_permissions.module, module)
          )
        )
      await db.insert(user_permissions).values({
        user_id: input.userId,
        module,
        enabled: input.permissions[module],
      })
    }

    return { success: true }
  } catch (error) {
    console.error('UPDATE PERMISSIONS ERROR:', error)
    return { success: false, error: (error as Error).message }
  }
}

export async function updateProfileDetailsAction(input: {
  userId: string
  fullName: string | null
  email: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  if (!isAdmin) {
    return { success: false, error: 'Admin role required' }
  }

  try {
    await db
      .update(profiles)
      .set({
        full_name: input.fullName,
        email: input.email,
      })
      .where(eq(profiles.id, input.userId))

    return { success: true }
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error)
    return { success: false, error: (error as Error).message }
  }
}
