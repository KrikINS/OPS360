"use server"

import { db } from "@/db/client"
import { profiles } from "@/db/schema"
import { desc, sql } from "drizzle-orm"

export async function getAdminDashboardMetricsAction() {
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
