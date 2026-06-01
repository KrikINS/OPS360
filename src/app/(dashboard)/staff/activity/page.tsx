import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActivityLog, getStaffDirectory } from '@/actions/hr'
import ActivityClient from './client'

export default async function ActivityPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const isManager = isAdmin || role === 'manager'

  const [activityResult, staffResult] = await Promise.all([
    getActivityLog({}),
    isManager
      ? getStaffDirectory()
      : Promise.resolve({ success: true as const, staff: [] }),
  ])

  return (
    <ActivityClient
      activities={activityResult.success ? activityResult.activities : []}
      staff={staffResult.success ? staffResult.staff : []}
      isAdmin={isAdmin}
      isManager={isManager}
      currentUserId={session.user.id}
    />
  )
}
