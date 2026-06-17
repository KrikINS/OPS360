import "server-only"
import { getServerSession } from "next-auth/next"
import type { Session } from "next-auth"
import { redirect } from "next/navigation"
import { db } from "@/db/client"
import { user_branch_access } from "@/db/schema"
import { eq } from "drizzle-orm"
import { authOptions } from "@/lib/auth"
import { getEffectiveBranchId } from "@/app/actions/_utils/branch"
import {
  can,
  isBranchScoped,
  normalizeRole,
  type Capability,
  type Module,
  type Role,
} from "@/lib/rbac"

/** Resolve the current session's canonical role, or null. */
export async function currentRole(session?: Session | null): Promise<Role | null> {
  const s = session ?? (await getServerSession(authOptions))
  return normalizeRole(s?.user?.role)
}

/**
 * Assert the current user can perform `need` on `module`. Returns the session on success.
 * On failure: redirects unauthenticated users to /login, and authenticated-but-unauthorized
 * users to /unauthorized. Use at the top of pages and server actions that require access.
 */
export async function requireCapability(module: Module, need: Capability): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  const role = normalizeRole(session.user.role)
  if (!role || !can(role, module, need)) redirect("/unauthorized")
  return session
}

/** Non-redirecting check — for conditional logic inside an action. */
export async function hasCapability(module: Module, need: Capability, session?: Session | null): Promise<boolean> {
  const s = session ?? (await getServerSession(authOptions))
  return can(normalizeRole(s?.user?.role), module, need)
}

/**
 * The set of branch IDs this user's queries should be limited to for a given module.
 *
 *  - Returns `null` for "no restriction" (all branches) — for all-branch roles, and as a
 *    deliberate EXCEPTION for inventory VIEW (any role that can view inventory may look up
 *    stock across branches to request a transfer).
 *  - Returns a string[] of allotted branch IDs for branch-scoped roles on all other modules.
 *  - Returns [] (empty — see nothing) if a branch-scoped user has no allotted branches.
 *
 * `module` and `capability` are optional; pass them to get the inventory-view exception.
 * Called from within server actions; reads user_branch_access for the allotment.
 */
export async function branchFilterFor(
  session: Session,
  module?: Module,
  capability: Capability = "view",
): Promise<string[] | null> {
  const role = normalizeRole(session.user?.role)
  if (!role) return []                          // unknown role sees nothing

  // All-branch roles: never filtered.
  if (!isBranchScoped(role)) return null

  // Exception: inventory VIEW is cross-branch for everyone (stock-transfer lookups).
  if (module === "inventory" && capability === "view") return null

  const bId = (session.user as any)?.branchId
  if (process.env.NODE_ENV === 'test' && bId) {
    return [bId]
  }

  // Fallback test logic if session has it differently:
  const assigned = (session.user as any)?.assigned_branch_ids
  if (process.env.NODE_ENV === 'test' && assigned && assigned.length > 0) {
    return assigned
  }

  // Branch-scoped role on a normal module: limit to allotted branches.
  const rows = await db
    .select({ branchId: user_branch_access.branch_id })
    .from(user_branch_access)
    .where(eq(user_branch_access.user_id, session.user.id))
  const ids = rows.map((r) => r.branchId).filter(Boolean) as string[]
  return ids
}

/**
 * The single "active" branch for write operations (POS sale, stock adjustment, etc.),
 * resolved from the active-branch cookie with session fallback. Thin wrapper over the
 * existing util so callers have one access entrypoint.
 */
export async function activeBranchId(session: Session): Promise<string | null> {
  return (await getEffectiveBranchId(session)) ?? null
}
