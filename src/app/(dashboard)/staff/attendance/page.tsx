import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAttendanceByBranch } from '@/actions/hr'
import { getBranchesAction } from '@/app/actions/admin-users'
import AttendanceClient from './client'

export default async function AttendancePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const isManager = isAdmin || role === 'manager'

  if (!isManager) redirect('/unauthorized')

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const [attendanceResult, branchesResult] = await Promise.all([
    getAttendanceByBranch({ fromDate: sevenDaysAgo, toDate: today }),
    isAdmin ? getBranchesAction() : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  return (
    <AttendanceClient
      records={attendanceResult.success ? attendanceResult.records : []}
      branches={isAdmin ? (branchesResult.data ?? []) : []}
      isAdmin={isAdmin}
      currentBranchId={session.user.branchId ?? ''}
    />
  )
}
