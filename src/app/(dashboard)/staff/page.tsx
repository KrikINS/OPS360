import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStaffDirectory, getActivityLog, getAttendanceByBranch, getMyAttendance } from '@/actions/hr'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
import { getBranchesAction } from '@/app/actions/admin-users'
import StaffClient from './client'

export default async function StaffPayrollPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user?.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const isManager = isAdmin || role === 'manager'

  const branchId = session ? (await getEffectiveBranchId(session)) ?? undefined : undefined

  // Default to last 30 days for attendance
  const today = new Date()
  const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const toDate = today.toISOString().split('T')[0]

  const [staffResult, activityResult, attendanceResult, branchesResult] = await Promise.all([
    getStaffDirectory(),
    getActivityLog({}),
    isManager
      ? getAttendanceByBranch({ fromDate, toDate })
      : getMyAttendance({ fromDate, toDate }),
    getBranchesAction(),
  ])

  const staff = staffResult.success ? staffResult.staff : []
  const activities = activityResult.success ? activityResult.activities.map(a => ({
    ...a,
    timestamp: a.timestamp ?? new Date().toISOString(),
  })) : []

  const attendance = attendanceResult.success ? attendanceResult.records : []
  const branches = branchesResult.data ?? []

  return (
    <StaffClient
      isAdmin={isAdmin}
      isManager={isManager}
      staff={staff}
      activities={activities}
      attendance={attendance}
      currentUserId={session?.user?.id ?? ''}
      branchId={branchId}
      branches={branches}
    />
  )
}
