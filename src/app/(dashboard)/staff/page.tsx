
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStaffDirectory } from '@/actions/hr'
import StaffClient from './client'
import ClockWidget from '@/components/hr/ClockWidget'

export default async function StaffPayrollPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user?.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  const result = await getStaffDirectory()
  const staff = result.success ? result.staff : []

  return (
    <div className="space-y-6">
      <ClockWidget />
      <StaffClient isAdmin={isAdmin} staff={staff} />
    </div>
  )
}
