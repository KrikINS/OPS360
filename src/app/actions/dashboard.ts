'use server'

import { db } from '@/db/client'
import { sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

function unpackRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows
  }
  if (Array.isArray(result)) return result as T[]
  return []
}

// ── Admin KPIs ────────────────────────────────────────────────────────────────
export async function getAdminKPIs(branchId?: string | null) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  try {
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10)
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10)

    const branchFilter = branchId ? sql`AND si.branch_id = ${branchId}::uuid` : sql``

    // Today's revenue
    const todayRows = unpackRows(await db.execute(sql`
      SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS invoice_count
      FROM sales_invoices si
      WHERE DATE(si.created_at) = ${today}::date ${branchFilter}
    `))
    const todayRevenue = Number((todayRows[0] as any)?.revenue ?? 0)
    const todayInvoices = Number((todayRows[0] as any)?.invoice_count ?? 0)

    // MTD revenue
    const mtdRows = unpackRows(await db.execute(sql`
      SELECT COALESCE(SUM(total_amount), 0) AS revenue
      FROM sales_invoices si
      WHERE si.created_at >= ${monthStart}::date ${branchFilter}
    `))
    const mtdRevenue = Number((mtdRows[0] as any)?.revenue ?? 0)

    // Last month revenue (for % change)
    const lastMonthRows = unpackRows(await db.execute(sql`
      SELECT COALESCE(SUM(total_amount), 0) AS revenue
      FROM sales_invoices si
      WHERE si.created_at >= ${lastMonthStart}::date AND si.created_at <= ${lastMonthEnd}::date ${branchFilter}
    `))
    const lastMonthRevenue = Number((lastMonthRows[0] as any)?.revenue ?? 0)
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((mtdRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null

    // Outstanding AP (unpaid vendor bills)
    // AP balance = SUM of credits to account 2010 (AP) minus debits (payments made)
    const apRows = unpackRows(await db.execute(sql`
      SELECT COALESCE(SUM(jl.credit) - SUM(jl.debit), 0) AS outstanding
      FROM journal_lines jl
      JOIN accounts a ON a.id = jl.account_id
      WHERE a.code = '2010'
    `))
    const outstandingAP = Math.max(0, Number((apRows[0] as any)?.outstanding ?? 0))

    // Low stock count
    const lowStockRows = unpackRows(await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) AS count
      FROM products p
      WHERE p.min_stock_level IS NOT NULL
        AND (
          SELECT COUNT(*) FROM inventory i
          WHERE i.product_id = p.id AND i.status = 'Available'
            ${branchId ? sql`AND i.branch_id = ${branchId}::uuid` : sql``}
        ) <= p.min_stock_level
    `))
    const lowStockCount = Number((lowStockRows[0] as any)?.count ?? 0)

    // Active service jobs
    const serviceRows = unpackRows(await db.execute(sql`
      SELECT COUNT(*) AS count FROM service_jobs
      WHERE status NOT IN ('Completed', 'Cancelled')
        ${branchId ? sql`AND branch_id = ${branchId}::uuid` : sql``}
    `))
    const activeServiceJobs = Number((serviceRows[0] as any)?.count ?? 0)

    return {
      todayRevenue, todayInvoices, mtdRevenue,
      revenueChange, outstandingAP, lowStockCount, activeServiceJobs,
    }
  } catch { return null }
}

// ── Manager KPIs ──────────────────────────────────────────────────────────────
export async function getManagerKPIs(branchId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  try {
    const today = new Date().toISOString().slice(0, 10)
    const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // Today's branch sales
    const todayRows = unpackRows(await db.execute(sql`
      SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS invoice_count
      FROM sales_invoices
      WHERE DATE(created_at) = ${today}::date AND branch_id = ${branchId}::uuid
    `))
    const todayRevenue = Number((todayRows[0] as any)?.revenue ?? 0)
    const todayInvoices = Number((todayRows[0] as any)?.invoice_count ?? 0)

    // This week's invoices
    const weekRows = unpackRows(await db.execute(sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS revenue
      FROM sales_invoices
      WHERE created_at >= ${weekStart}::date AND branch_id = ${branchId}::uuid
    `))
    const weekInvoices = Number((weekRows[0] as any)?.count ?? 0)
    const weekRevenue = Number((weekRows[0] as any)?.revenue ?? 0)

    // Pending service jobs for this branch
    const serviceRows = unpackRows(await db.execute(sql`
      SELECT COUNT(*) AS count FROM service_jobs
      WHERE status NOT IN ('Completed', 'Cancelled') AND branch_id = ${branchId}::uuid
    `))
    const pendingServiceJobs = Number((serviceRows[0] as any)?.count ?? 0)

    // Low stock items for this branch
    const lowStockRows = unpackRows(await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) AS count
      FROM products p
      WHERE p.min_stock_level IS NOT NULL
        AND (
          SELECT COUNT(*) FROM inventory i
          WHERE i.product_id = p.id AND i.status = 'Available'
            AND i.branch_id = ${branchId}::uuid
        ) <= p.min_stock_level
    `))
    const lowStockCount = Number((lowStockRows[0] as any)?.count ?? 0)

    // Top 3 products this week
    const topProductRows = unpackRows(await db.execute(sql`
      SELECT p.model_name, SUM(ii.qty) AS units_sold
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      JOIN sales_invoices si ON si.id = ii.invoice_id
      WHERE si.created_at >= ${weekStart}::date AND si.branch_id = ${branchId}::uuid
      GROUP BY p.model_name
      ORDER BY units_sold DESC
      LIMIT 3
    `))
    const topProducts = topProductRows.map((r: any) => ({
      name: r.model_name as string,
      units: Number(r.units_sold),
    }))

    return {
      todayRevenue, todayInvoices, weekInvoices,
      weekRevenue, pendingServiceJobs, lowStockCount, topProducts,
    }
  } catch { return null }
}

// ── Staff KPIs ────────────────────────────────────────────────────────────────
export async function getStaffKPIs(userId: string, branchId?: string | null) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  try {
    const today = new Date().toISOString().slice(0, 10)

    // Today's sales processed by this user
    const salesRows = unpackRows(await db.execute(sql`
      SELECT COUNT(*) AS invoice_count, COALESCE(SUM(total_amount), 0) AS revenue
      FROM sales_invoices
      WHERE DATE(created_at) = ${today}::date
        AND created_by = ${userId}::uuid
    `))
    const todayInvoices = Number((salesRows[0] as any)?.invoice_count ?? 0)
    const todayRevenue = Number((salesRows[0] as any)?.revenue ?? 0)

    // Attendance status today
    const attendanceRows = unpackRows(await db.execute(sql`
      SELECT status, clock_in_time FROM attendance_records
      WHERE user_id = ${userId}::uuid AND DATE(date) = ${today}::date
      LIMIT 1
    `))
    const attendance = attendanceRows[0] as any

    return {
      todayInvoices,
      todayRevenue,
      attendanceStatus: attendance?.status ?? null,
      clockedInAt: attendance?.clock_in_time ?? null,
    }
  } catch { return null }
}
