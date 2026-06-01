import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import {
  setupTestDb, cleanupTestDb, teardownTestDb,
  seedBranch, seedAttendanceRecord,
} from '@/test/db'
import {
  clockIn, clockOut, getAttendanceByBranch,
  getMyAttendance, correctAttendance, getActivityLog,
} from '@/actions/hr'
import type { TestDb } from '@/test/db'

let db: TestDb
beforeAll(async () => { db = await setupTestDb() })
afterEach(async () => { await cleanupTestDb(db) })
afterAll(async () => { await teardownTestDb() })

const MANAGER_ID = '00000000-0000-0000-0000-000000000001'
const STAFF_ID   = '00000000-0000-0000-0000-000000000002'

// ── clockIn ─��────────────────────────────────────────────────────────────────

describe('clockIn', () => {
  it('creates an attendance record for today', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })
    const result = await clockIn() as any
    expect(result.success).toBe(true)
    expect(result.record.clock_in).toBeTruthy()
    expect(result.record.clock_out).toBeNull()
  })

  it('rejects if already clocked in today', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]
    await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(),
    })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await clockIn()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already clocked in/i)
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    const result = await clockIn()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })

  it('rejects when user has no branch assigned', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: null, role: 'staff' },
    })
    const result = await clockIn()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/no branch/i)
  })
})

// ── clockOut ─────────────────────────────────────────────────────────────────

describe('clockOut', () => {
  it('sets clock_out and computes duration_minutes', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]
    const clockInTime = new Date(Date.now() - 60 * 60 * 1000)
    await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: clockInTime,
    })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await clockOut() as any
    expect(result.success).toBe(true)
    expect(result.record.clock_out).toBeTruthy()
    expect(result.record.duration_minutes).toBeGreaterThanOrEqual(59)
    expect(result.record.duration_minutes).toBeLessThanOrEqual(61)
  })

  it('rejects if no clock-in exists today', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await clockOut()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/no clock-in/i)
  })

  it('rejects if already clocked out today', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]
    const clockInTime = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const clockOutTime = new Date(Date.now() - 60 * 60 * 1000)
    await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: clockInTime,
      clockOut: clockOutTime,
    })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await clockOut()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already clocked out/i)
  })
})

// ── getAttendanceByBranch ─────────────────────────────────────────────────────

describe('getAttendanceByBranch', () => {
  it('returns records for the branch in date range', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]
    await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(),
    })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })
    const result = await getAttendanceByBranch({
      branchId: branch.id,
      fromDate: today,
      toDate: today,
    }) as any
    expect(result.success).toBe(true)
    expect(result.records.length).toBe(1)
  })

  it('rejects staff role — manager required', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await getAttendanceByBranch({
      fromDate: '2025-01-01',
      toDate: '2025-12-31',
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/manager/i)
  })
})

// ── getMyAttendance ───────────────────────────────────────────────────────────

describe('getMyAttendance', () => {
  it('returns only the current user records in date range', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]
    await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(),
    })
    // seed a second user's record — should not appear
    await seedAttendanceRecord(db, {
      userId: MANAGER_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(),
    })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await getMyAttendance({ fromDate: today, toDate: today }) as any
    expect(result.success).toBe(true)
    expect(result.records.length).toBe(1)
    expect(result.records[0].user_id).toBe(STAFF_ID)
  })
})

// ── correctAttendance ─────────────────────────────────────────────────────────

describe('correctAttendance', () => {
  it('updates clock times and computes new duration', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]
    const record = await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date('2026-01-01T08:00:00'),
      clockOut: new Date('2026-01-01T17:00:00'),
    })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })
    const result = await correctAttendance({
      attendanceId: record.id,
      newClockIn: '2026-01-01T09:00:00',
      newClockOut: '2026-01-01T18:00:00',
      reason: 'System recorded wrong time',
    }) as any
    expect(result.success).toBe(true)
    expect(result.record.duration_minutes).toBe(540) // 9 hours
  })

  it('rejects correction without a reason', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]
    const record = await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(),
    })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })
    const result = await correctAttendance({
      attendanceId: record.id,
      newClockIn: new Date().toISOString(),
      reason: '',
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/reason/i)
  })

  it('rejects correction by staff — manager required', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]
    const record = await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(),
    })
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })
    const result = await correctAttendance({
      attendanceId: record.id,
      newClockIn: new Date().toISOString(),
      reason: 'Test',
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/manager/i)
  })
})

// ── getActivityLog ────────────────────────────────────────────────────────────

describe('getActivityLog', () => {
  it('returns activities from multiple sources', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]

    await seedAttendanceRecord(db, {
      userId: MANAGER_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(),
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })

    const result = await getActivityLog({ fromDate: today, toDate: today }) as any
    expect(result.success).toBe(true)
    expect(result.activities.length).toBeGreaterThanOrEqual(1)
    const hrActivity = result.activities.find(
      (a: any) => a.module === 'HR' && a.actionType === 'clock_in'
    )
    expect(hrActivity).toBeDefined()
    expect(hrActivity?.userId).toBe(MANAGER_ID)
  })

  it('staff can only see their own activity', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]

    await seedAttendanceRecord(db, {
      userId: MANAGER_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(Date.now() - 2 * 60 * 60 * 1000),
    })
    await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(Date.now() - 60 * 60 * 1000),
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, branchId: branch.id, role: 'staff' },
    })

    const result = await getActivityLog({ fromDate: today, toDate: today }) as any
    expect(result.success).toBe(true)
    const otherUserActivity = result.activities.filter(
      (a: any) => a.userId === MANAGER_ID
    )
    expect(otherUserActivity.length).toBe(0)
  })

  it('manager can filter by specific staff member', async () => {
    const branch = await seedBranch(db)
    const today = new Date().toISOString().split('T')[0]

    await seedAttendanceRecord(db, {
      userId: MANAGER_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(Date.now() - 2 * 60 * 60 * 1000),
    })
    await seedAttendanceRecord(db, {
      userId: STAFF_ID,
      branchId: branch.id,
      date: today,
      clockIn: new Date(Date.now() - 60 * 60 * 1000),
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })

    const result = await getActivityLog({ userId: STAFF_ID, fromDate: today, toDate: today }) as any
    expect(result.success).toBe(true)
    const nonStaffActivity = result.activities.filter(
      (a: any) => a.userId !== STAFF_ID
    )
    expect(nonStaffActivity.length).toBe(0)
  })

  it('returns empty array when no activity in date range', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, branchId: branch.id, role: 'manager' },
    })
    const result = await getActivityLog({ fromDate: '2020-01-01', toDate: '2020-01-02' }) as any
    expect(result.success).toBe(true)
    expect(result.activities.length).toBe(0)
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    const result = await getActivityLog({})
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })
})
