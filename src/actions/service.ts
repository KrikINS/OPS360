'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import {
  service_jobs, service_job_items,
  customers, products, profiles,
} from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

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
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!session.user.branchId) {
    return { success: false as const, error: 'No branch assigned' }
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
        branch_id: session.user.branchId,
        customer_id: input.customerId ?? null,
        product_id: input.productId ?? null,
        technician_id: input.technicianId ?? null,
        title: input.title.trim(),
        description: input.description ?? null,
        priority: input.priority ?? 'Medium',
        status: 'Pending',
        estimated_cost: input.estimatedCost ? String(input.estimatedCost) : null,
        created_by: session.user.id,
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
  if (!isAdmin && existing.branch_id !== session.user.branchId) {
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

    if (!isAdmin && session.user.branchId) {
      conditions.push(eq(service_jobs.branch_id, session.user.branchId))
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
  if (!isAdmin && job.branchId !== session.user.branchId) {
    return { success: false as const, error: 'Unauthorized' }
  }

  return { success: true as const, job }
}
