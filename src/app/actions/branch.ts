'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'


/**
 * Sets the active branch for the current session via a persistent cookie.
 * Triggers a global revalidation to ensure all Server Components (Layout, Registry, POS) 
 * reflect the newly selected context.
 */
export async function setActiveBranchAction(branchId: string) {
  
  const { data: { user } } = await import("@/app/actions/user").then(m => m.getUserAction())

  if (!user) throw new Error("Unauthorized")

  // Check if admin
  const { data: profileList } = await import("@/app/actions/generics").then(m => m.fetchData("profiles"))
  const profile = profileList && Array.isArray(profileList)
    ? profileList.find((p: Record<string, unknown>) => p['id'] === user.id)
    : null
  const normalizedRole = String((profile as Record<string, unknown> | null)?.['role'] || '').toLowerCase().trim()
  const isAdmin = normalizedRole === 'admin/owner' || normalizedRole === 'admin' || normalizedRole === 'owner'

  if (!isAdmin) {
    // Validate branch access
    const { data: accessList, error } = await import("@/app/actions/generics").then(m => m.fetchData("user_branch_access"))
    const access = accessList && Array.isArray(accessList)
      ? accessList.find((a: Record<string, unknown>) => a['user_id'] === user.id && a['branch_id'] === branchId)
      : null

    if (error || !access) {
      throw new Error(`Forbidden: You do not have access to branch ${branchId}.`)
    }
  }

  const cookieStore = await cookies()
  
  // Set cookie for 30 days
  cookieStore.set('active_branch_id', branchId, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    httpOnly: true,
    secure: false, // Ensure it works on localhost even in production mode
    sameSite: 'lax'
  })

  // Refresh everything aggressively across the dashboard
  revalidatePath('/', 'layout')
  
  return { success: true }
}
