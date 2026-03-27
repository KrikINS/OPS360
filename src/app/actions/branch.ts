'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Sets the active branch for the current session via a persistent cookie.
 * Triggers a global revalidation to ensure all Server Components (Layout, Registry, POS) 
 * reflect the newly selected context.
 */
export async function setActiveBranchAction(branchId: string) {
  const cookieStore = await cookies()
  
  // Set cookie for 30 days
  cookieStore.set('active_branch_id', branchId, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  // Refresh everything
  revalidatePath('/')
  return { success: true }
}
