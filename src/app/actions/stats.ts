"use server"

import { db } from "@/db/client"
import { products, profiles } from "@/db/schema"
import { sql, eq } from "drizzle-orm"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getEffectiveBranchId } from "@/app/actions/_utils/branch"

function unpackRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows
  }
  if (Array.isArray(result)) return result as T[]
  return []
}

export async function getLaunchpadStatsAction() {
  try {
    const res = await db.select({
      count: sql<number>`count(*)`
    }).from(products).where(sql`${products.min_stock_level} > 0`)
    
    return { data: { lowStockCount: Number(res[0]?.count || 0) } }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getRoleMetricsAction() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: "Unauthorized" }

  const branchId = await getEffectiveBranchId(session)
  const { hasCapability } = await import("@/lib/access")
  const isAdminView = await hasCapability("admin", "view", session)
  if (!branchId && !isAdminView) {
    return { error: "No branch selected" }
  }

  const profileList = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, session.user.id))
  const profileRole = profileList[0]?.role

  const [isAdmin, isSales, isInventory, isService] = await Promise.all([
    hasCapability("admin", "view", session),
    hasCapability("sales", "view", session),
    hasCapability("inventory", "view", session),
    hasCapability("service", "view", session)
  ])

  try {
    const metrics: Record<string, { label: string, value: string | number }> = {}

    // 1. Admin Metrics
    if (isAdmin) {
      // Today's Revenue
      const revRes = await db.execute(sql`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM sales_invoices 
        WHERE DATE(created_at) = CURRENT_DATE
        ${branchId && branchId !== 'ALL_000' ? sql`AND branch_id = ${branchId}::uuid` : sql``}
      `)
      metrics.revenue = { label: "Today's Revenue", value: `₹${Number(unpackRows(revRes)[0]?.total || 0).toLocaleString('en-IN')}` }

      // Pending POs
      const poRes = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM purchase_orders
        WHERE status IN ('pending', 'approved')
        ${branchId && branchId !== 'ALL_000' ? sql`AND branch_id = ${branchId}::uuid` : sql``}
      `)
      metrics.pendingPOs = { label: "Pending POs", value: Number(unpackRows(poRes)[0]?.count || 0) }

      // Open Service Jobs
      const srvRes = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM service_jobs
        WHERE status IN ('Pending', 'In-Progress')
        ${branchId && branchId !== 'ALL_000' ? sql`AND branch_id = ${branchId}::uuid` : sql``}
      `)
      metrics.openService = { label: "Open Service Jobs", value: Number(unpackRows(srvRes)[0]?.count || 0) }
    }

    // 2. Sales Metrics
    if (isSales || isAdmin) {
      const mySalesRes = await db.execute(sql`
        SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
        FROM sales_invoices
        WHERE DATE(created_at) = CURRENT_DATE
        AND user_id = ${session.user.id}::uuid
      `)
      const mySalesData = unpackRows(mySalesRes)[0]
      metrics.mySales = { label: "My Sales Today", value: `₹${Number(mySalesData?.total || 0).toLocaleString('en-IN')}` }
      metrics.myInvoices = { label: "My Invoices Today", value: Number(mySalesData?.count || 0) }
    }

    // 3. Inventory Metrics
    if (isInventory || isAdmin) {
      // Low Stock
      const stockRes = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM (
          SELECT product_id, COUNT(*) as qty
          FROM inventory
          WHERE status = 'Available'
          ${branchId && branchId !== 'ALL_000' ? sql`AND branch_id = ${branchId}::uuid` : sql``}
          GROUP BY product_id
        ) as stock
        JOIN products p ON p.id = stock.product_id
        WHERE stock.qty < p.min_stock_level
      `)
      metrics.lowStock = { label: "Low Stock Items", value: Number(unpackRows(stockRes)[0]?.count || 0) }

      // Pending GRNs
      const grnRes = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM purchase_orders
        WHERE status IN ('approved', 'partially_received')
        ${branchId && branchId !== 'ALL_000' ? sql`AND branch_id = ${branchId}::uuid` : sql``}
      `)
      metrics.pendingGRNs = { label: "Pending GRNs", value: Number(unpackRows(grnRes)[0]?.count || 0) }
    }

    // 4. Service Metrics
    if (isService || isAdmin) {
      const myJobsRes = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM service_jobs
        WHERE status IN ('Pending', 'In-Progress')
        AND (technician_id = ${session.user.id}::uuid OR created_by = ${session.user.id}::uuid)
      `)
      metrics.myJobs = { label: "My Open Jobs", value: Number(unpackRows(myJobsRes)[0]?.count || 0) }

      const completedRes = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM service_jobs
        WHERE status = 'Completed'
        AND DATE(completed_at) = CURRENT_DATE
        ${branchId && branchId !== 'ALL_000' ? sql`AND branch_id = ${branchId}::uuid` : sql``}
      `)
      metrics.completedJobs = { label: "Completed Today", value: Number(unpackRows(completedRes)[0]?.count || 0) }
    }

    return { data: metrics }
  } catch (error) {
    console.error("Failed to fetch role metrics:", error)
    return { error: { message: "Failed to fetch metrics" } }
  }
}
