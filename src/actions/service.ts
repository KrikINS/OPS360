'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
import {
  service_jobs, service_job_items, warranty_registrations,
  customers, products, profiles,
} from '@/db/schema'
import { eq, and, or, desc, sql } from 'drizzle-orm'

const STATUS_TRANSITIONS: Record<string, string[]> = {
  'Pending':         ['In-Progress', 'Cancelled'],
  'In-Progress':     ['Awaiting-Spares', 'Completed', 'Cancelled'],
  'Awaiting-Spares': ['In-Progress', 'Cancelled'],
  'Completed':       [],
  'Cancelled':       [],
}

const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const VALID_STATUSES = ['Pending', 'In-Progress', 'Awaiting-Spares', 'Completed', 'Cancelled']

// ── createServiceJob ────────────────────────────────

export async function createServiceJob(input: {
  title: string
  description?: string
  priority?: string
  customerId?: string
  productId?: string
  technicianId?: string
  estimatedCost?: number
  serial_number?: string
  invoice_id?: string
  warranty_status?: string
  resolution_notes?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  const effectiveBranchId = await getEffectiveBranchId(session);
  if (!effectiveBranchId) {
    return { success: false as const, error: 'No branch assigned to your account' };
  }
  if (!input.title?.trim()) {
    return { success: false as const, error: 'Job title is required' }
  }
  if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
    return { success: false as const, error: 'Invalid priority value' }
  }

  try {
    const year = new Date().getFullYear()
    const counterRes = await db.execute(sql`
      INSERT INTO sequential_counters (prefix, year, current_value)
      VALUES ('SRV', ${year}, 1)
      ON CONFLICT (prefix, year) DO UPDATE
        SET current_value = sequential_counters.current_value + 1
      RETURNING current_value
    `)
    const counterRows = (counterRes as unknown as { rows?: { current_value: number }[] }).rows
      ?? (counterRes as unknown as { current_value: number }[])
    const counterValue = counterRows[0]?.current_value
    const jobId = `SRV/${year}/${String(counterValue).padStart(3, '0')}`

    const [job] = await db
      .insert(service_jobs)
      .values({
        job_id: jobId,
        branch_id: effectiveBranchId,
        customer_id: input.customerId ?? null,
        product_id: input.productId ?? null,
        technician_id: input.technicianId ?? null,
        title: input.title.trim(),
        description: input.description ?? null,
        priority: input.priority ?? 'Medium',
        status: 'Pending',
        estimated_cost: input.estimatedCost ? String(input.estimatedCost) : null,
        created_by: session.user.id,
        serial_number:    input.serial_number ?? null,
        invoice_id:       input.invoice_id ?? null,
        warranty_status:  input.warranty_status ?? 'unknown',
        resolution_notes: input.resolution_notes ?? null,
      })
      .returning()

    return { success: true as const, job }
  } catch (error) {
    console.error('SERVICE ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

// ── updateJobStatus ─────────────────────────────────

export async function updateJobStatus(input: {
  jobId: string
  newStatus: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!VALID_STATUSES.includes(input.newStatus)) {
    return { success: false as const, error: 'Invalid status value' }
  }

  const [existing] = await db
    .select()
    .from(service_jobs)
    .where(eq(service_jobs.id, input.jobId))
    .limit(1)

  if (!existing) {
    return { success: false as const, error: 'Job not found' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const effectiveBranchId = await getEffectiveBranchId(session);
  if (!isAdmin && existing.branch_id !== effectiveBranchId) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }

  const allowed = STATUS_TRANSITIONS[existing.status] ?? []
  if (!allowed.includes(input.newStatus)) {
    return {
      success: false as const,
      error: `Cannot transition from ${existing.status} to ${input.newStatus}`,
    }
  }

  const [updated] = await db
    .update(service_jobs)
    .set({ status: input.newStatus, updated_at: new Date() })
    .where(eq(service_jobs.id, input.jobId))
    .returning()

  return { success: true as const, job: updated }
}

// ── assignTechnician ────────────────────────────────

export async function assignTechnician(input: {
  jobId: string
  technicianId: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isManager = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isManager) {
    return { success: false as const, error: 'Manager role required to assign technicians' }
  }

  const [existing] = await db
    .select()
    .from(service_jobs)
    .where(eq(service_jobs.id, input.jobId))
    .limit(1)

  if (!existing) {
    return { success: false as const, error: 'Job not found' }
  }

  if (['Completed', 'Cancelled'].includes(existing.status)) {
    return {
      success: false as const,
      error: 'Cannot reassign technician on a completed or cancelled job',
    }
  }

  const [updated] = await db
    .update(service_jobs)
    .set({ technician_id: input.technicianId, updated_at: new Date() })
    .where(eq(service_jobs.id, input.jobId))
    .returning()

  return { success: true as const, job: updated }
}

// ── getServiceJobs ──────────────────────────────────

export async function getServiceJobs(input?: {
  status?: string
  priority?: string
  technicianId?: string
  search?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    const conditions = []

    if (!isAdmin) {
      const effectiveBranchId = await getEffectiveBranchId(session);
      if (effectiveBranchId) {
        conditions.push(eq(service_jobs.branch_id, effectiveBranchId))
      }
    }
    if (input?.status) {
      conditions.push(eq(service_jobs.status, input.status))
    }
    if (input?.priority) {
      conditions.push(eq(service_jobs.priority, input.priority))
    }
    if (input?.technicianId) {
      conditions.push(eq(service_jobs.technician_id, input.technicianId))
    }

    const jobs = await db
      .select({
        id: service_jobs.id,
        jobId: service_jobs.job_id,
        branchId: service_jobs.branch_id,
        customerId: service_jobs.customer_id,
        productId: service_jobs.product_id,
        technicianId: service_jobs.technician_id,
        title: service_jobs.title,
        description: service_jobs.description,
        priority: service_jobs.priority,
        status: service_jobs.status,
        estimatedCost: service_jobs.estimated_cost,
        actualCost: service_jobs.actual_cost,
        createdAt: service_jobs.created_at,
        updatedAt: service_jobs.updated_at,
        customerName: customers.full_name,
        customerPhone: customers.phone_number,
        productName: products.model_name,
        technicianName: profiles.full_name,
      })
      .from(service_jobs)
      .leftJoin(customers, eq(service_jobs.customer_id, customers.id))
      .leftJoin(products, eq(service_jobs.product_id, products.id))
      .leftJoin(profiles, eq(service_jobs.technician_id, profiles.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(service_jobs.created_at))

    return { success: true as const, jobs }
  } catch (error) {
    console.error('SERVICE ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

// ── getServiceJobById ───────────────────────────────

export async function getServiceJobById(jobId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const [job] = await db
    .select({
      id: service_jobs.id,
      jobId: service_jobs.job_id,
      branchId: service_jobs.branch_id,
      customerId: service_jobs.customer_id,
      productId: service_jobs.product_id,
      technicianId: service_jobs.technician_id,
      title: service_jobs.title,
      description: service_jobs.description,
      priority: service_jobs.priority,
      status: service_jobs.status,
      estimatedCost: service_jobs.estimated_cost,
      actualCost: service_jobs.actual_cost,
      createdAt: service_jobs.created_at,
      updatedAt: service_jobs.updated_at,
      customerName: customers.full_name,
      customerPhone: customers.phone_number,
      productName: products.model_name,
      technicianName: profiles.full_name,
    })
    .from(service_jobs)
    .leftJoin(customers, eq(service_jobs.customer_id, customers.id))
    .leftJoin(products, eq(service_jobs.product_id, products.id))
    .leftJoin(profiles, eq(service_jobs.technician_id, profiles.id))
    .where(eq(service_jobs.id, jobId))
    .limit(1)

  if (!job) {
    return { success: false as const, error: 'Job not found' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const effectiveBranchId = await getEffectiveBranchId(session);
  if (!isAdmin && job.branchId !== effectiveBranchId) {
    return { success: false as const, error: 'Unauthorized' }
  }

  return { success: true as const, job }
}

export async function checkWarranty(serialNumber: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!serialNumber?.trim()) return { success: false as const, error: 'Serial number required' }

  try {
    // 1. Find the inventory unit by serial
    const invRows = await db.execute(sql`
      SELECT 
        inv.id, inv.serial_number, inv.product_id, inv.invoice_id, inv.status,
        p.model_name, p.brand, p.warranty_months,
        si.invoice_number,
        si.created_at AS purchase_date,
        c.full_name AS customer_name
      FROM inventory inv
      LEFT JOIN products p ON p.id = inv.product_id
      LEFT JOIN sales_invoices si ON si.id = inv.invoice_id
      LEFT JOIN customers c ON c.id = si.customer_id
      WHERE inv.serial_number = ${serialNumber.trim()}
      LIMIT 1
    `)
    const rows = ((invRows as any).rows ?? invRows) as any[]
    if (!rows.length) {
      return { success: true as const, found: false, warrantyStatus: 'unknown' as const, message: 'Serial number not found in inventory' }
    }
    const unit = rows[0]

    // 2. Check warranty_registrations table first (manual or auto-registered)
    const [warReg] = await db
      .select()
      .from(warranty_registrations)
      .where(and(
        eq(warranty_registrations.serial_number, serialNumber.trim()),
        eq(warranty_registrations.is_active, true)
      ))
      .limit(1)

    let warrantyStatus: 'in_warranty' | 'out_of_warranty' | 'unknown' = 'unknown'
    let warrantyExpiresAt: string | null = null
    let purchaseDate: string | null = null
    let customerName: string | null = unit.customer_name ?? null

    if (warReg) {
      warrantyExpiresAt = warReg.warranty_expires_at as string
      purchaseDate = warReg.purchase_date as string
      const expiry = new Date(warReg.warranty_expires_at as string)
      warrantyStatus = expiry >= new Date() ? 'in_warranty' : 'out_of_warranty'
    } else if (unit.purchase_date && unit.warranty_months) {
      // Derive from invoice + product warranty_months
      const pd = new Date(unit.purchase_date)
      purchaseDate = pd.toISOString().slice(0, 10)
      const expiry = new Date(pd)
      expiry.setMonth(expiry.getMonth() + Number(unit.warranty_months))
      warrantyExpiresAt = expiry.toISOString().slice(0, 10)
      warrantyStatus = expiry >= new Date() ? 'in_warranty' : 'out_of_warranty'
    }

    return {
      success: true as const,
      found: true,
      warrantyStatus,
      warrantyExpiresAt,
      purchaseDate,
      productName: unit.model_name ?? null,
      productBrand: unit.brand ?? null,
      productId: unit.product_id ?? null,
      invoiceId: unit.invoice_id ?? null,
      invoiceNumber: unit.invoice_number ?? null,
      customerName,
    }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function completeServiceJob(input: {
  jobId: string
  actualCost?: number
  resolutionNotes?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  try {
    await db.update(service_jobs)
      .set({
        status: 'Completed',
        actual_cost: input.actualCost != null ? String(input.actualCost) : undefined,
        resolution_notes: input.resolutionNotes ?? null,
        completed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(service_jobs.id, input.jobId))
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function registerWarranty(input: {
  serialNumber: string
  productId: string
  customerId?: string
  invoiceId?: string
  purchaseDate: string
  warrantyMonths: number
  notes?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!input.serialNumber?.trim()) return { success: false as const, error: 'Serial number required' }
  if (input.warrantyMonths <= 0) return { success: false as const, error: 'Warranty months must be > 0' }

  const purchaseDate = new Date(input.purchaseDate)
  const expiryDate = new Date(purchaseDate)
  expiryDate.setMonth(expiryDate.getMonth() + input.warrantyMonths)

  try {
    // Deactivate any existing warranty for this serial
    await db.update(warranty_registrations)
      .set({ is_active: false })
      .where(eq(warranty_registrations.serial_number, input.serialNumber.trim()))

    const [reg] = await db.insert(warranty_registrations).values({
      serial_number:       input.serialNumber.trim(),
      product_id:          input.productId,
      customer_id:         input.customerId ?? null,
      invoice_id:          input.invoiceId ?? null,
      purchase_date:       input.purchaseDate,
      warranty_months:     input.warrantyMonths,
      warranty_expires_at: expiryDate.toISOString().slice(0, 10),
      notes:               input.notes ?? null,
      registered_by:       session.user.id,
      is_active:           true,
    }).returning()

    return { success: true as const, registration: reg }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}
