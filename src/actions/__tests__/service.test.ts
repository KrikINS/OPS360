/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import * as schema from '@/db/schema'
import {
  setupTestDb, cleanupTestDb, teardownTestDb,
  seedBranch, seedServiceJob, seedCounter,
} from '@/test/db'
import type { TestDb } from '@/test/db'
import {
  createServiceJob, updateJobStatus,
  assignTechnician, getServiceJobs,
} from '@/actions/service'

let db: TestDb
beforeAll(async () => { db = await setupTestDb() })
afterEach(async () => { await cleanupTestDb(db) })
afterAll(async () => { await teardownTestDb() })

const MANAGER_ID = '00000000-0000-0000-0000-000000000001'
const STAFF_ID   = '00000000-0000-0000-0000-000000000002'

async function setupUserAccess(db: TestDb, userId: string, role: string, branchId: string) {
  await db.insert(schema.users).values({ id: userId, email: userId + '@test.com', password_hash: 'xxx', role }).onConflictDoNothing()
  if (role !== 'admin' && role !== 'super_admin') {
    await db.insert(schema.user_branch_access).values({ user_id: userId, branch_id: branchId }).onConflictDoNothing()
  }
}


// ─────────────────────────────────────────────────────
// createServiceJob
// ─────────────────────────────────────────────────────

describe('createServiceJob', () => {
  it('creates a job with sequential SRV number', async () => {
    const branch = await seedBranch(db)
    await seedCounter(db, branch.id, 'SRV')
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await createServiceJob({ title: 'Screen replacement' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.job.job_id).toMatch(/^SRV\/\d{4}\/\d{3}$/)
    expect(result.job.status).toBe('Pending')
    expect(result.job.priority).toBe('Medium')
  })

  it('rejects empty title', async () => {
    const branch = await seedBranch(db)
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await createServiceJob({ title: '' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/title/i)
  })

  it('rejects invalid priority', async () => {
    const branch = await seedBranch(db)
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await createServiceJob({ title: 'Test job', priority: 'SuperUrgent' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/priority/i)
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    const result = await createServiceJob({ title: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })

  it('rejects when user has no branch assigned', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: null, role: 'staff' },
    })
    const result = await createServiceJob({ title: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/branch/i)
  })

  it('generates unique job IDs under concurrent load', async () => {
    const branch = await seedBranch(db)
    await seedCounter(db, branch.id, 'SRV')
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    const requests = Array.from({ length: 10 }, () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
      return createServiceJob({ title: 'Concurrent job' })
    })
    const results = await Promise.all(requests)
    const successful = results.filter(r => r.success) as any[]
    const jobIds = successful.map(r => r.job.job_id)
    expect(new Set(jobIds).size).toBe(10)
  })
})

// ─────────────────────────────────────────────────────
// updateJobStatus
// ─────────────────────────────────────────────────────

describe('updateJobStatus', () => {
  it('transitions Pending → In-Progress', async () => {
    const branch = await seedBranch(db)
    const job = await seedServiceJob(db, {
      branchId: branch.id, createdBy: STAFF_ID, status: 'Pending',
    })
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await updateJobStatus({ jobId: job.id, newStatus: 'In-Progress' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.job.status).toBe('In-Progress')
  })

  it('rejects invalid status transition', async () => {
    const branch = await seedBranch(db)
    const job = await seedServiceJob(db, {
      branchId: branch.id, createdBy: STAFF_ID, status: 'Pending',
    })
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await updateJobStatus({ jobId: job.id, newStatus: 'Completed' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cannot transition/i)
  })

  it('rejects transition from Completed', async () => {
    const branch = await seedBranch(db)
    const job = await seedServiceJob(db, {
      branchId: branch.id, createdBy: STAFF_ID, status: 'Completed',
    })
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await updateJobStatus({ jobId: job.id, newStatus: 'In-Progress' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cannot transition/i)
  })

  it('rejects cross-branch status update by staff', async () => {
    const branch1 = await seedBranch(db, { name: 'Branch 1', gstin: '27AAAAA0000A1Z5' })
    const branch2 = await seedBranch(db, { name: 'Branch 2', gstin: '27BBBBB0000B1Z3' })
    const job = await seedServiceJob(db, { branchId: branch1.id, createdBy: STAFF_ID })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch2.id, role: 'staff' },
    })
    const result = await updateJobStatus({ jobId: job.id, newStatus: 'In-Progress' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized|branch/i)
  })

  it('rejects invalid status value', async () => {
    const branch = await seedBranch(db)
    const job = await seedServiceJob(db, { branchId: branch.id, createdBy: STAFF_ID })
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await updateJobStatus({ jobId: job.id, newStatus: 'Flying' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid status/i)
  })
})

// ─────────────────────────────────────────────────────
// assignTechnician
// ─────────────────────────────────────────────────────

describe('assignTechnician', () => {
  it('assigns a technician — manager role', async () => {
    const branch = await seedBranch(db)
    const job = await seedServiceJob(db, { branchId: branch.id, createdBy: STAFF_ID })
    await setupUserAccess(db, MANAGER_ID, 'manager', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })
    const result = await assignTechnician({ jobId: job.id, technicianId: STAFF_ID })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.job.technician_id).toBe(STAFF_ID)
  })

  it('rejects assignment by staff role', async () => {
    const branch = await seedBranch(db)
    const job = await seedServiceJob(db, { branchId: branch.id, createdBy: STAFF_ID })
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await assignTechnician({ jobId: job.id, technicianId: MANAGER_ID })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/permission/i)
  })

  it('rejects assignment on completed job', async () => {
    const branch = await seedBranch(db)
    const job = await seedServiceJob(db, {
      branchId: branch.id, createdBy: STAFF_ID, status: 'Completed',
    })
    await setupUserAccess(db, MANAGER_ID, 'manager', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })
    const result = await assignTechnician({ jobId: job.id, technicianId: STAFF_ID })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/completed|cancelled/i)
  })
})

// ─────────────────────────────────────────────────────
// getServiceJobs
// ─────────────────────────────────────────────────────

describe('getServiceJobs', () => {
  it('returns only jobs for user branch', async () => {
    const branch1 = await seedBranch(db, { name: 'Branch 1', gstin: '27AAAAA0000A1Z5' })
    const branch2 = await seedBranch(db, { name: 'Branch 2', gstin: '27BBBBB0000B1Z3' })
    await seedServiceJob(db, { branchId: branch1.id, createdBy: STAFF_ID })
    await seedServiceJob(db, { branchId: branch1.id, createdBy: STAFF_ID })
    await seedServiceJob(db, { branchId: branch2.id, createdBy: STAFF_ID })

    await setupUserAccess(db, STAFF_ID, 'staff', branch1.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch1.id, role: 'staff' },
    })
    const result = await getServiceJobs()
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.jobs.length).toBe(2)
    result.jobs.forEach(j => expect(j.branchId).toBe(branch1.id))
  })

  it('filters by status', async () => {
    const branch = await seedBranch(db)
    await seedServiceJob(db, { branchId: branch.id, createdBy: STAFF_ID, status: 'Pending' })
    await seedServiceJob(db, { branchId: branch.id, createdBy: STAFF_ID, status: 'Completed' })
    await setupUserAccess(db, STAFF_ID, 'staff', branch.id)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await getServiceJobs({ status: 'Pending' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.jobs.every(j => j.status === 'Pending')).toBe(true)
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    const result = await getServiceJobs()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })
})
