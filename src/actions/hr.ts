'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import {
  profiles,
  user_branch_access,
  branches,
  attendance_records,
  attendance_corrections,
  sales_invoices,
  inventory_transactions,
  purchase_orders,
  grn_receipts,
  stock_transfers,
  vendor_audit_log,
} from '@/db/schema'
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'

export type StaffRow = {
  userId: string
  fullName: string | null
  email: string | null
  role: string | null
  branchId: string | null
  branchName: string | null
  isPrimary: boolean | null
}

export async function getStaffDirectory(input?: { branchId?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    const query = db
      .select({
        userId: profiles.id,
        fullName: profiles.full_name,
        email: profiles.email,
        role: profiles.role,
        branchId: user_branch_access.branch_id,
        branchName: branches.name,
        isPrimary: user_branch_access.is_primary,
      })
      .from(profiles)
      .leftJoin(user_branch_access, eq(profiles.id, user_branch_access.user_id))
      .leftJoin(branches, eq(user_branch_access.branch_id, branches.id))
      .orderBy(profiles.full_name)

    if (!isAdmin) {
      if (!session.user.branchId) {
        return { success: false as const, error: 'No branch assigned to your account' }
      }
      const rows = await query.where(
        eq(user_branch_access.branch_id, session.user.branchId)
      )
      return { success: true as const, staff: rows }
    }

    if (input?.branchId) {
      const rows = await query.where(
        eq(user_branch_access.branch_id, input.branchId)
      )
      return { success: true as const, staff: rows }
    }

    const rows = await query
    return { success: true as const, staff: rows }
  } catch (error) {
    console.error('HR error:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function clockIn(input?: { notes?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!session.user.branchId) {
    return { success: false as const, error: 'No branch assigned to your account' }
  }

  const today = new Date().toISOString().split('T')[0]

  const existing = await db
    .select()
    .from(attendance_records)
    .where(
      and(
        eq(attendance_records.user_id, session.user.id),
        eq(attendance_records.date, today)
      )
    )
    .limit(1)

  if (existing[0]) {
    return {
      success: false as const,
      error: existing[0].clock_out
        ? 'Already clocked in and out today — contact manager to correct'
        : 'Already clocked in — please clock out first',
    }
  }

  const [record] = await db
    .insert(attendance_records)
    .values({
      user_id: session.user.id,
      branch_id: session.user.branchId,
      date: today,
      clock_in: new Date(),
      notes: input?.notes ?? null,
    })
    .returning()

  return { success: true as const, record }
}

export async function clockOut(input?: { notes?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const today = new Date().toISOString().split('T')[0]

  const [record] = await db
    .select()
    .from(attendance_records)
    .where(
      and(
        eq(attendance_records.user_id, session.user.id),
        eq(attendance_records.date, today)
      )
    )
    .limit(1)

  if (!record) {
    return { success: false as const, error: 'No clock-in found for today' }
  }
  if (record.clock_out) {
    return { success: false as const, error: 'Already clocked out today' }
  }

  const clockOutTime = new Date()
  const durationMinutes = Math.round(
    (clockOutTime.getTime() - record.clock_in.getTime()) / 60000
  )

  const [updated] = await db
    .update(attendance_records)
    .set({
      clock_out: clockOutTime,
      duration_minutes: durationMinutes,
      notes: input?.notes ?? record.notes,
    })
    .where(eq(attendance_records.id, record.id))
    .returning()

  return { success: true as const, record: updated }
}

export async function getAttendanceByBranch(input: {
  branchId?: string
  fromDate: string
  toDate: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isAdmin) {
    return { success: false as const, error: 'Manager role required' }
  }

  const targetBranchId = input.branchId ?? session.user.branchId
  if (!targetBranchId) {
    return { success: false as const, error: 'No branch specified' }
  }

  const records = await db
    .select({
      id: attendance_records.id,
      userId: attendance_records.user_id,
      fullName: profiles.full_name,
      email: profiles.email,
      date: attendance_records.date,
      clockIn: attendance_records.clock_in,
      clockOut: attendance_records.clock_out,
      durationMinutes: attendance_records.duration_minutes,
      notes: attendance_records.notes,
    })
    .from(attendance_records)
    .leftJoin(profiles, eq(attendance_records.user_id, profiles.id))
    .where(
      and(
        eq(attendance_records.branch_id, targetBranchId),
        gte(attendance_records.date, input.fromDate),
        lte(attendance_records.date, input.toDate)
      )
    )
    .orderBy(desc(attendance_records.date), profiles.full_name)

  return { success: true as const, records }
}

export async function getMyAttendance(input: {
  fromDate: string
  toDate: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const records = await db
    .select()
    .from(attendance_records)
    .where(
      and(
        eq(attendance_records.user_id, session.user.id),
        gte(attendance_records.date, input.fromDate),
        lte(attendance_records.date, input.toDate)
      )
    )
    .orderBy(desc(attendance_records.date))

  return { success: true as const, records }
}

export async function correctAttendance(input: {
  attendanceId: string
  newClockIn: string
  newClockOut?: string
  reason: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isManager = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isManager) {
    return { success: false as const, error: 'Manager role required to correct attendance' }
  }

  if (!input.reason?.trim()) {
    return { success: false as const, error: 'Reason is required for attendance corrections' }
  }

  const [existing] = await db
    .select()
    .from(attendance_records)
    .where(eq(attendance_records.id, input.attendanceId))
    .limit(1)

  if (!existing) {
    return { success: false as const, error: 'Attendance record not found' }
  }

  await db.insert(attendance_corrections).values({
    attendance_id: input.attendanceId,
    corrected_by: session.user.id,
    original_clock_in: existing.clock_in,
    original_clock_out: existing.clock_out ?? null,
    new_clock_in: new Date(input.newClockIn),
    new_clock_out: input.newClockOut ? new Date(input.newClockOut) : null,
    reason: input.reason,
  })

  let durationMinutes: number | null = null
  if (input.newClockOut) {
    durationMinutes = Math.round(
      (new Date(input.newClockOut).getTime() - new Date(input.newClockIn).getTime()) / 60000
    )
  }

  const [updated] = await db
    .update(attendance_records)
    .set({
      clock_in: new Date(input.newClockIn),
      clock_out: input.newClockOut ? new Date(input.newClockOut) : null,
      duration_minutes: durationMinutes,
    })
    .where(eq(attendance_records.id, input.attendanceId))
    .returning()

  return { success: true as const, record: updated }
}

// ── Activity Log ──────────────────────────────────────────────────────────────

type ActivityEntry = {
  id: string
  timestamp: Date | null
  userId: string | null
  branchId: string | null
  module: string
  actionType: string
  description: string
  referenceId: string | null
}

export async function getActivityLog(input: {
  userId?: string
  branchId?: string
  module?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const isManager = isAdmin || role === 'manager'

  const effectiveUserId: string | null = isManager
    ? (input.userId ?? null)
    : session.user.id
  const effectiveBranchId: string | null = isAdmin
    ? (input.branchId ?? null)
    : session.user.branchId ?? null

  const limit = Math.min(input.limit ?? 50, 200)
  const offset = input.offset ?? 0

  const fromTs = input.fromDate
    ? new Date(input.fromDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const toTs = input.toDate
    ? new Date(input.toDate + 'T23:59:59Z')
    : new Date()

  // Drizzle's and() skips undefined conditions; use these helpers for optional filters.
  const filterUser = (col: Parameters<typeof eq>[0]) =>
    effectiveUserId ? eq(col, effectiveUserId) : undefined
  const filterBranch = (col: Parameters<typeof eq>[0]) =>
    effectiveBranchId ? eq(col, effectiveBranchId) : undefined

  // Alias for readability
  const userEq = filterUser
  const branchEq = filterBranch

  function moduleMatch(mod: string) {
    return !input.module || input.module === mod
  }

  try {
    const all: ActivityEntry[] = []

    // ── POS Sales ──────────────────────────────────────────────────────────
    if (moduleMatch('POS')) {
      const rows = await db
        .select({ id: sales_invoices.id, ts: sales_invoices.created_at, userId: sales_invoices.user_id, branchId: sales_invoices.branch_id, inv: sales_invoices.invoice_number })
        .from(sales_invoices)
        .where(and(gte(sales_invoices.created_at, fromTs), lte(sales_invoices.created_at, toTs), userEq(sales_invoices.user_id), branchEq(sales_invoices.branch_id)))
      rows.forEach(r => all.push({ id: r.id, timestamp: r.ts, userId: r.userId, branchId: r.branchId, module: 'POS', actionType: 'pos_sale', description: `POS sale — invoice #${r.inv}`, referenceId: r.id }))
    }

    // ── Inventory Transactions ──────────────────────────────────────────────
    if (moduleMatch('Inventory')) {
      const rows = await db
        .select({ id: inventory_transactions.id, ts: inventory_transactions.created_at, userId: inventory_transactions.created_by, branchId: inventory_transactions.branch_id, txType: inventory_transactions.transaction_type, qty: inventory_transactions.quantity, refId: inventory_transactions.reference_id })
        .from(inventory_transactions)
        .where(and(gte(inventory_transactions.created_at, fromTs), lte(inventory_transactions.created_at, toTs), userEq(inventory_transactions.created_by), branchEq(inventory_transactions.branch_id)))
      rows.forEach(r => all.push({ id: r.id, timestamp: r.ts, userId: r.userId, branchId: r.branchId, module: 'Inventory', actionType: r.txType ?? 'inventory_txn', description: `Inventory ${r.txType} — qty ${r.qty}`, referenceId: r.refId }))
    }

    // ── Purchase Orders created ─────────────────────────────────────────────
    if (moduleMatch('Procurement')) {
      const created = await db
        .select({ id: purchase_orders.id, ts: purchase_orders.created_at, userId: purchase_orders.created_by, branchId: purchase_orders.branch_id, poNum: purchase_orders.po_number })
        .from(purchase_orders)
        .where(and(gte(purchase_orders.created_at, fromTs), lte(purchase_orders.created_at, toTs), userEq(purchase_orders.created_by), branchEq(purchase_orders.branch_id)))
      created.forEach(r => all.push({ id: r.id, timestamp: r.ts, userId: r.userId, branchId: r.branchId, module: 'Procurement', actionType: 'po_created', description: `PO created — ${r.poNum}`, referenceId: r.id }))

      const approved = await db
        .select({ id: purchase_orders.id, ts: purchase_orders.created_at, userId: purchase_orders.approved_by, branchId: purchase_orders.branch_id, poNum: purchase_orders.po_number })
        .from(purchase_orders)
        .where(and(
          gte(purchase_orders.created_at, fromTs),
          lte(purchase_orders.created_at, toTs),
          effectiveUserId ? eq(purchase_orders.approved_by, effectiveUserId) : undefined,
          branchEq(purchase_orders.branch_id)
        ))
      approved.filter(r => r.userId).forEach(r => all.push({ id: `${r.id}-approved`, timestamp: r.ts, userId: r.userId, branchId: r.branchId, module: 'Procurement', actionType: 'po_approved', description: `PO approved — ${r.poNum}`, referenceId: r.id }))
    }

    // ── GRN Receipts ────────────────────────────────────────────────────────
    if (moduleMatch('Procurement')) {
      const rows = await db
        .select({ id: grn_receipts.id, ts: grn_receipts.created_at, userId: grn_receipts.created_by, branchId: grn_receipts.branch_id, grnNum: grn_receipts.grn_number })
        .from(grn_receipts)
        .where(and(gte(grn_receipts.created_at, fromTs), lte(grn_receipts.created_at, toTs), userEq(grn_receipts.created_by), branchEq(grn_receipts.branch_id)))
      rows.forEach(r => all.push({ id: r.id, timestamp: r.ts, userId: r.userId, branchId: r.branchId, module: 'Procurement', actionType: 'grn_received', description: `GRN received — ${r.grnNum}`, referenceId: r.id }))
    }

    // ── Stock Transfers ─────────────────────────────────────────────────────
    if (moduleMatch('Transfers')) {
      const rows = await db
        .select({ id: stock_transfers.id, ts: stock_transfers.created_at, userId: stock_transfers.originator_id, branchId: stock_transfers.source_branch_id, txNum: stock_transfers.transfer_number })
        .from(stock_transfers)
        .where(and(gte(stock_transfers.created_at, fromTs), lte(stock_transfers.created_at, toTs), userEq(stock_transfers.originator_id), branchEq(stock_transfers.source_branch_id)))
      rows.forEach(r => all.push({ id: r.id, timestamp: r.ts, userId: r.userId, branchId: r.branchId, module: 'Transfers', actionType: 'transfer_initiated', description: `Transfer initiated — ${r.txNum}`, referenceId: r.id }))
    }

    // ── Vendor Audit Log ────────────────────────────────────────────────────
    if (moduleMatch('Vendors')) {
      const rows = await db
        .select({ id: vendor_audit_log.id, ts: vendor_audit_log.created_at, userId: vendor_audit_log.changed_by, vendorId: vendor_audit_log.vendor_id, field: vendor_audit_log.field_name, oldVal: vendor_audit_log.old_value, newVal: vendor_audit_log.new_value })
        .from(vendor_audit_log)
        .where(and(gte(vendor_audit_log.created_at, fromTs), lte(vendor_audit_log.created_at, toTs), userEq(vendor_audit_log.changed_by)))
      rows.forEach(r => all.push({ id: r.id, timestamp: r.ts, userId: r.userId, branchId: null, module: 'Vendors', actionType: 'vendor_updated', description: `Vendor field updated: ${r.field} changed from "${r.oldVal}" to "${r.newVal}"`, referenceId: r.vendorId }))
    }

    // ── Attendance Clock-In ─────────────────────────────────────────────────
    if (moduleMatch('HR')) {
      const clockInRows = await db
        .select({ id: attendance_records.id, ts: attendance_records.clock_in, userId: attendance_records.user_id, branchId: attendance_records.branch_id })
        .from(attendance_records)
        .where(and(gte(attendance_records.clock_in, fromTs), lte(attendance_records.clock_in, toTs), userEq(attendance_records.user_id), branchEq(attendance_records.branch_id)))
      clockInRows.forEach(r => {
        const t = r.ts instanceof Date ? r.ts : new Date(r.ts as unknown as string)
        all.push({ id: `${r.id}-in`, timestamp: r.ts, userId: r.userId, branchId: r.branchId, module: 'HR', actionType: 'clock_in', description: `Clocked in at ${t.toISOString().slice(11, 16)}`, referenceId: r.id })
      })

      const clockOutRows = await db
        .select({ id: attendance_records.id, ts: attendance_records.clock_out, userId: attendance_records.user_id, branchId: attendance_records.branch_id, dur: attendance_records.duration_minutes })
        .from(attendance_records)
        .where(and(
          gte(attendance_records.clock_out, fromTs),
          lte(attendance_records.clock_out, toTs),
          userEq(attendance_records.user_id),
          branchEq(attendance_records.branch_id)
        ))
      clockOutRows.filter(r => r.ts).forEach(r => {
        const t = r.ts instanceof Date ? r.ts! : new Date(r.ts as unknown as string)
        all.push({ id: `${r.id}-out`, timestamp: r.ts, userId: r.userId, branchId: r.branchId, module: 'HR', actionType: 'clock_out', description: `Clocked out at ${t.toISOString().slice(11, 16)} — ${r.dur} min`, referenceId: r.id })
      })
    }

    // ── Merge, sort, paginate ───────────────────────────────────────────────
    all.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tb - ta
    })

    const page = all.slice(offset, offset + limit)

    // Fetch profile names for users in the result
    const userIds = [...new Set(page.map(a => a.userId).filter(Boolean))] as string[]
    const profileMap: Record<string, { name: string | null; role: string | null }> = {}
    if (userIds.length > 0) {
      const profs = await db.select({ id: profiles.id, name: profiles.full_name, role: profiles.role }).from(profiles).where(inArray(profiles.id, userIds))
      profs.forEach(p => { profileMap[p.id] = { name: p.name, role: p.role } })
    }

    return {
      success: true as const,
      activities: page.map(a => ({
        id: a.id,
        timestamp: a.timestamp ? a.timestamp.toISOString() : null,
        userId: a.userId,
        userName: (a.userId ? profileMap[a.userId]?.name : null) ?? 'Unknown',
        userRole: (a.userId ? profileMap[a.userId]?.role : null) ?? '',
        branchId: a.branchId,
        module: a.module,
        actionType: a.actionType,
        description: a.description,
        referenceId: a.referenceId,
      })),
      total: all.length,
    }
  } catch (error) {
    console.error('ACTIVITY LOG ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}
