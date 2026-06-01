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
} from '@/db/schema'
import { and, desc, eq, gte, lte } from 'drizzle-orm'

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
