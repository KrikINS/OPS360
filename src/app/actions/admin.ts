"use server"

import { db } from "@/db/client"
import { profiles } from "@/db/schema"
import { desc, sql } from "drizzle-orm"
import { hasCapability } from "@/lib/access"

export async function getAdminDashboardMetricsAction() {
  const { getServerSession } = await import('next-auth/next')
  const { authOptions } = await import('@/lib/auth')
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: { message: 'Unauthorized' } }
  if (!(await hasCapability("admin", "view", session))) {
    return { error: { message: 'Insufficient permission' } }
  }

  try {
    const res = await db.execute(sql`SELECT * FROM get_admin_dashboard_metrics()`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result[0] : result.rows?.[0]
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getRecentUsersAction() {
  const { getServerSession } = await import('next-auth/next')
  const { authOptions } = await import('@/lib/auth')
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: { message: 'Unauthorized' } }
  if (!(await hasCapability("admin", "view", session))) {
    return { error: { message: 'Insufficient permission' } }
  }

  try {
    const data = await db.select({
      id: profiles.id,
      full_name: profiles.full_name,
      email: profiles.email,
      role: profiles.role,
      created_at: profiles.created_at
    })
    .from(profiles)
    .orderBy(desc(profiles.created_at))
    .limit(5)
    
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function setPosPin(
  userId: string,
  pin: string | null
): Promise<{ success: boolean; error?: string }> {
  const { getServerSession } = await import('next-auth/next');
  const { authOptions } = await import('@/lib/auth');
  const session = await getServerSession(authOptions);
  
  if (!session?.user) return { success: false, error: 'Unauthorized' };
  if (!(await hasCapability("admin", "edit", session))) {
    return { success: false, error: 'Insufficient permission' };
  }

  if (pin !== null && !/^\d{4}$/.test(pin)) {
    return { success: false, error: 'PIN must be exactly 4 digits' };
  }

  try {
    const { db } = await import('@/db/client');
    const { profiles } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    await db.update(profiles).set({ pos_pin: pin }).where(eq(profiles.id, userId));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Database error' };
  }
}
