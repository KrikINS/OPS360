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

  const { hasCapability } = await import("@/lib/access")
  if (!(await hasCapability("admin", "view", session))) {
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
        assigned_branch_id: uBranches.length > 0 ? uBranches[0] : null,
        has_pos_pin: !!p.pos_pin
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
  branchIds: string[]
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { hasCapability, branchFilterFor } = await import("@/lib/access")
  const { normalizeRole, ROLE_RANK, isBranchScoped } = await import("@/lib/rbac")
  if (!(await hasCapability("admin", "edit", session))) {
    return { success: false, error: 'Insufficient permission' }
  }

  const actorRole = normalizeRole(session.user.role)
  const targetRole = normalizeRole(input.role)
  if (actorRole && targetRole && ROLE_RANK[targetRole] > ROLE_RANK[actorRole]) {
    return { success: false, error: 'You cannot manage a user with a role higher than your own' }
  }

  // Branch scope check
  if (isBranchScoped(actorRole) && input.branchIds.length > 0) {
    const allowed = await branchFilterFor(session, "admin", "edit")
    if (allowed !== null) {
      const outside = input.branchIds.filter((b: string) => !allowed.includes(b))
      if (outside.length > 0) {
        return { success: false, error: 'You can only assign branches you manage' }
      }
    }
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

    // Delete all existing branch assignments then insert the new set
    await db
      .delete(user_branch_access)
      .where(eq(user_branch_access.user_id, input.userId))

    if (input.branchIds.length > 0) {
      await db.insert(user_branch_access).values(
        input.branchIds.map((branchId, i) => ({
          user_id: input.userId,
          branch_id: branchId,
          is_primary: i === 0,
        }))
      )
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

  const { hasCapability } = await import("@/lib/access")
  if (!(await hasCapability("admin", "edit", session))) {
    return { success: false, error: 'Insufficient permission' }
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
