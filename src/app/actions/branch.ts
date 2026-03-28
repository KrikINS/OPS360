'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

/**
 * Sets the active branch for the current session via a persistent cookie.
 * Triggers a global revalidation to ensure all Server Components (Layout, Registry, POS) 
 * reflect the newly selected context.
 */
export async function setActiveBranchAction(branchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // Check if admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const normalizedRole = profile?.role?.toLowerCase().trim() || ""
  const isAdmin = normalizedRole === 'admin/owner' || normalizedRole === 'admin' || normalizedRole === 'owner'

  if (!isAdmin) {
    // Validate branch access
    const { data: access, error } = await supabase
      .from('user_branch_access')
      .select('branch_id')
      .eq('user_id', user.id)
      .eq('branch_id', branchId)
      .single()

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
