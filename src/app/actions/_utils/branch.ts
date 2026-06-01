import { cookies } from 'next/headers';
import type { Session } from 'next-auth';

/**
 * Resolve the effective branch ID for the current request.
 * 1. Reads the `active_branch_id` cookie (set by the UI when a user switches branches).
 * 2. Falls back to `session.user.branchId` if the cookie is missing or unavailable.
 *
 * NOT a Server Action — this is a plain utility called from within server actions.
 * Keeping it free of 'use server' prevents Next.js from wrapping it in its own
 * action boundary, which would inject a redundant session-validation call.
 */
export async function getEffectiveBranchId(session: Session) {
  try {
    const cookieStore = await cookies();
    const cookieBranch = cookieStore.get('active_branch_id')?.value;
    if (cookieBranch) return cookieBranch;
  } catch {
    // cookies() not available outside an HTTP request context (e.g. tests, scripts)
  }
  return session?.user?.branchId;
}
