'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
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
  employees,
  payroll_runs,
  payslips,
  employee_salary_structures,
} from '@/db/schema'
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import { getCashAccountCode, createJournalEntry } from '@/actions/finance'

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
    // ---- Auto-sync backfill step ----
    const missingProfiles = await db.execute(sql`
      SELECT p.id, p.full_name, p.email, p.role, p.branch_id
      FROM profiles p
      WHERE p.employee_id IS NULL
    `);
    const profilesToBackfill = (missingProfiles as any).rows ?? missingProfiles;
    
    if (profilesToBackfill && profilesToBackfill.length > 0) {
      for (const p of profilesToBackfill) {
        const nameParts = (p.full_name || 'Unknown User').split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || ' '
        
        const [emp] = await db.insert(employees).values({
          first_name: firstName,
          last_name: lastName,
          email: p.email,
          designation: p.role || 'staff',
          branch_id: p.branch_id
        }).returning()
        
        await db.update(profiles)
          .set({ employee_id: emp.id })
          .where(eq(profiles.id, p.id))
      }
    }
    // ----------------------------------

    const query = db
      .select({
        employeeId: employees.id,
        userId: profiles.id,
        firstName: employees.first_name,
        lastName: employees.last_name,
        email: employees.email,
        role: employees.designation,
        branchId: employees.branch_id,
        branchName: branches.name,
      })
      .from(employees)
      .leftJoin(profiles, eq(employees.id, profiles.employee_id))
      .leftJoin(branches, eq(employees.branch_id, branches.id))
      .where(eq(employees.status, 'active'))
      .orderBy(employees.first_name)

    if (!isAdmin) {
      const effectiveBranchId = await getEffectiveBranchId(session);
      if (!effectiveBranchId) {
        return { success: false as const, error: 'No branch assigned to your account' };
      }
      query.where(
        and(
          eq(employees.status, 'active'),
          eq(employees.branch_id, effectiveBranchId)
        )
      )
    } else if (input?.branchId) {
      query.where(
        and(
          eq(employees.status, 'active'),
          eq(employees.branch_id, input.branchId)
        )
      )
    }

    const rawRows = await query

    // Map to StaffRow format
    const staffMap = new Map<string, StaffRow>()
    for (const row of rawRows) {
      const uId = row.userId || row.employeeId
      if (!staffMap.has(uId)) {
        staffMap.set(uId, {
          userId: uId,
          fullName: `${row.firstName} ${row.lastName}`.trim(),
          email: row.email,
          role: row.role,
          branchId: row.branchId,
          branchName: row.branchName,
          isPrimary: true
        })
      }
    }
    
    return { success: true as const, staff: Array.from(staffMap.values()) }
  } catch (error) {
    console.error('HR error:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

export async function createNonErpStaffMember(data: { firstName: string, lastName: string, email?: string, phone?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  if (!isAdmin) {
    return { success: false as const, error: 'Admin role required' }
  }

  try {
    const [employee] = await db
      .insert(employees)
      .values({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        status: 'active'
      })
      .returning()
      
    return { success: true as const, employee }
  } catch (error) {
    console.error('Create staff error:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function clockIn(input?: { notes?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  const effectiveBranchId = await getEffectiveBranchId(session);
  if (!effectiveBranchId) {
    return { success: false as const, error: 'No branch assigned to your account' };
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
      branch_id: effectiveBranchId,
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

  const effectiveBranchIdFromCookie = await getEffectiveBranchId(session);
  const targetBranchId = input.branchId ?? effectiveBranchIdFromCookie;
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
  const effectiveBranchIdFromCookie = await getEffectiveBranchId(session);
  const effectiveBranchId: string | null = isAdmin
    ? (input.branchId ?? null)
    : effectiveBranchIdFromCookie

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

// ── Payroll ───────────────────────────────────────────────────────────────────

export async function processPayrollRun(input: {
  branchId: string
  payPeriod: string
  paymentDate: string
  paymentMethod: 'cash' | 'bank'
  notes?: string
  payslips: Array<{
    staffName: string
    staffId?: string
    structureId?: string
    basic: number
    hra: number
    gross: number
    pf_employee: number
    professional_tax: number
    tds: number
    net: number
  }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }

  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {
    return { success: false as const, error: 'Manager role required' }
  }

  if (!input.payslips || input.payslips.length === 0) {
    return { success: false as const, error: 'At least one payslip is required' }
  }
  if (!/^\d{4}-\d{2}$/.test(input.payPeriod)) {
    return { success: false as const, error: 'pay_period must be in YYYY-MM format' }
  }
  for (const p of input.payslips) {
    if (!p.staffName?.trim()) return { success: false as const, error: 'Staff name is required for each payslip' }
    if (p.gross <= 0) return { success: false as const, error: `Gross must be > 0 for ${p.staffName}` }
    if (p.net < 0) return { success: false as const, error: `Net cannot be negative for ${p.staffName}` }
  }

  const grossTotal = input.payslips.reduce((s, p) => s + p.gross, 0)
  const tdsTotal   = input.payslips.reduce((s, p) => s + p.tds, 0)
  const netTotal   = input.payslips.reduce((s, p) => s + p.net, 0)
  const pfTotal    = input.payslips.reduce((s, p) => s + p.pf_employee, 0)
  const ptTotal    = input.payslips.reduce((s, p) => s + p.professional_tax, 0)

  try {
    // 1. Insert payroll run
    const [run] = await db
      .insert(payroll_runs)
      .values({
        branch_id:      input.branchId,
        pay_period:     input.payPeriod,
        payment_date:   input.paymentDate,
        payment_method: input.paymentMethod,
        gross_total:    String(grossTotal),
        tds_total:      String(tdsTotal),
        net_total:      String(netTotal),
        notes:          input.notes ?? null,
        created_by:     session.user.id,
        status:         'draft',
      })
      .returning()

    // 2. Batch-insert payslips with component breakdown
    await db.insert(payslips).values(
      input.payslips.map(p => ({
        payroll_run_id:      run.id,
        staff_name:          p.staffName.trim(),
        staff_id:            p.staffId ?? null,
        salary_structure_id: p.structureId ?? null,
        basic:               String(p.basic),
        hra:                 String(p.hra),
        gross:               String(p.gross),
        pf_employee:         String(p.pf_employee),
        professional_tax:    String(p.professional_tax),
        tds:                 String(p.tds),
        net:                 String(p.net),
        notes:               null,
      }))
    )

    // 3. Post journal — BLOCKING (financial side-effects must not be best-effort)
    try {
      const cashCode = input.paymentMethod === 'cash'
        ? await getCashAccountCode(input.branchId)
        : '1020'

      const lines: Array<{ accountCode: string; debit?: number; credit?: number; description: string }> = [
        { accountCode: '5050', debit: grossTotal, description: `Salaries — ${input.payPeriod}` },
        { accountCode: cashCode, credit: netTotal, description: `Net salary paid — ${input.payPeriod}` },
      ]
      if (tdsTotal > 0) lines.push({ accountCode: '2060', credit: tdsTotal, description: `TDS deducted — ${input.payPeriod}` })
      if (pfTotal  > 0) lines.push({ accountCode: '2061', credit: pfTotal,  description: `PF payable (employee) — ${input.payPeriod}` })
      if (ptTotal  > 0) lines.push({ accountCode: '2062', credit: ptTotal,  description: `Professional tax payable — ${input.payPeriod}` })

      const entry = await createJournalEntry({
        description:     `Payroll: ${input.payPeriod} — Gross ₹${grossTotal.toLocaleString('en-IN')}, Net ₹${netTotal.toLocaleString('en-IN')}`,
        referenceSource: 'PAYROLL',
        referenceId:     run.id,
        branchId:        input.branchId,
        autoGenerated:   true,
        createdBy:       session.user.id,
        lines,
      })

      await db.update(payroll_runs)
        .set({ journal_entry_id: entry.id, status: 'posted' })
        .where(eq(payroll_runs.id, run.id))

      return {
        success:       true as const,
        payrollRunId:  run.id,
        journalEntryId: entry.id,
        grossTotal,
        tdsTotal,
        netTotal,
      }
    } catch (journalErr) {
      console.error('[PAYROLL] Journal FAILED after payroll committed:', journalErr)
      return {
        success:      false as const,
        error:        'Payroll recorded but journal posting failed — the accounting entry was not created. Contact finance before running payroll again.',
        payrollRunId: run.id,
        journalFailed: true as const,
      }
    }
  } catch (error) {
    console.error('PAYROLL ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

export async function getPayrollRuns(input?: { branchId?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    const effectiveBranchId = isAdmin
      ? (input?.branchId ?? null)
      : (await getEffectiveBranchId(session))

    const query = db
      .select({
        id:            payroll_runs.id,
        payPeriod:     payroll_runs.pay_period,
        paymentDate:   payroll_runs.payment_date,
        paymentMethod: payroll_runs.payment_method,
        grossTotal:    payroll_runs.gross_total,
        tdsTotal:      payroll_runs.tds_total,
        netTotal:      payroll_runs.net_total,
        notes:         payroll_runs.notes,
        status:        payroll_runs.status,
        createdAt:     payroll_runs.created_at,
        branchId:      payroll_runs.branch_id,
        branchName:    branches.name,
      })
      .from(payroll_runs)
      .leftJoin(branches, eq(payroll_runs.branch_id, branches.id))
      .orderBy(desc(payroll_runs.payment_date))

    if (effectiveBranchId) {
      query.where(eq(payroll_runs.branch_id, effectiveBranchId))
    }

    const runs = await query
    return { success: true as const, runs }
  } catch (error) {
    console.error('GET PAYROLL RUNS ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

export async function getPayslips(input: { payrollRunId: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  try {
    const slips = await db
      .select()
      .from(payslips)
      .where(eq(payslips.payroll_run_id, input.payrollRunId))
      .orderBy(payslips.staff_name)

    return { success: true as const, payslips: slips }
  } catch (error) {
    console.error('GET PAYSLIPS ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

export async function getEmployeesWithStructures(input?: { branchId?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  try {
    const rows = await db
      .select({
        id:              employees.id,
        first_name:      employees.first_name,
        last_name:       employees.last_name,
        designation:     employees.designation,
        department:      employees.department,
        date_of_joining: employees.date_of_joining,
        branch_id:       employees.branch_id,
        status:          employees.status,
        // Active salary structure (if exists)
        structure_id:          employee_salary_structures.id,
        basic:                 employee_salary_structures.basic,
        hra:                   employee_salary_structures.hra,
        gross:                 employee_salary_structures.gross,
        pf_applicable:         employee_salary_structures.pf_applicable,
        pf_employee:           employee_salary_structures.pf_employee,
        professional_tax:      employee_salary_structures.professional_tax,
        tds_monthly:           employee_salary_structures.tds_monthly,
        net:                   employee_salary_structures.net,
        effective_from:        employee_salary_structures.effective_from,
      })
      .from(employees)
      .leftJoin(
        employee_salary_structures,
        and(
          eq(employee_salary_structures.employee_id, employees.id),
          eq(employee_salary_structures.is_active, true)
        )
      )
      .where(
        and(
          eq(employees.status, 'active'),
          input?.branchId ? eq(employees.branch_id, input.branchId) : undefined
        )
      )
      .orderBy(employees.first_name)
    return { success: true as const, employees: rows }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function upsertEmployeeDetails(input: {
  employeeId: string
  designation?: string
  department?: string
  dateOfJoining?: string
  branchId?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {
    return { success: false as const, error: 'Manager role required' }
  }
  try {
    const updateData: any = {}
    if (input.designation !== undefined) updateData.designation = input.designation
    if (input.department !== undefined) updateData.department = input.department
    if (input.dateOfJoining !== undefined) updateData.date_of_joining = input.dateOfJoining
    if (input.branchId !== undefined) updateData.branch_id = input.branchId

    if (Object.keys(updateData).length === 0) return { success: true as const }

    await db.update(employees)
      .set(updateData)
      .where(eq(employees.id, input.employeeId))
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function setSalaryStructure(input: {
  employeeId: string
  effectiveFrom: string
  basic: number
  hra: number
  pfApplicable: boolean
  tdsMonthly: number
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {
    return { success: false as const, error: 'Manager role required' }
  }
  if (input.basic <= 0) return { success: false as const, error: 'Basic salary must be greater than 0' }
  if (input.hra < 0) return { success: false as const, error: 'HRA cannot be negative' }

  // Compute derived fields
  const gross = input.basic + input.hra
  // PF: 12% of basic, capped at 1800 (12% of statutory 15000 ceiling)
  const pf_employee = input.pfApplicable ? Math.min(Math.round(input.basic * 0.12), 1800) : 0
  // Professional Tax: Kerala — 200/month if gross > 15000, else 0
  const professional_tax = gross > 15000 ? 200 : 0
  const net = gross - pf_employee - professional_tax - input.tdsMonthly

  if (net < 0) return { success: false as const, error: 'Net salary cannot be negative — check deductions' }

  try {
    // Deactivate all existing structures for this employee
    await db.update(employee_salary_structures)
      .set({ is_active: false })
      .where(eq(employee_salary_structures.employee_id, input.employeeId))

    // Insert new active structure
    const [structure] = await db.insert(employee_salary_structures)
      .values({
        employee_id:      input.employeeId,
        effective_from:   input.effectiveFrom,
        basic:            String(input.basic),
        hra:              String(input.hra),
        gross:            String(gross),
        pf_applicable:    input.pfApplicable,
        pf_employee:      String(pf_employee),
        professional_tax: String(professional_tax),
        tds_monthly:      String(input.tdsMonthly),
        net:              String(net),
        is_active:        true,
        created_by:       session.user.id,
      })
      .returning()

    return { success: true as const, structure }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function getSalaryStructureHistory(employeeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  try {
    const rows = await db
      .select()
      .from(employee_salary_structures)
      .where(eq(employee_salary_structures.employee_id, employeeId))
      .orderBy(desc(employee_salary_structures.effective_from))
    return { success: true as const, structures: rows }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}
