import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import LaunchpadClient from './LaunchpadClient'
import { redirect } from 'next/navigation'
import { getAdminKPIs, getManagerKPIs, getStaffKPIs } from '@/app/actions/dashboard'

export const dynamic = 'force-dynamic'

export default async function LaunchpadPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const profileList = await db.select().from(profiles).where(eq(profiles.id, session.user.id))
  const profile = profileList[0]
  const permissions = ((profile as Record<string, unknown>)?.permissions as Record<string, boolean>) || {}
  const role = profile?.role || ''
  const normalizedRole = role.toLowerCase().trim()
  const branchId = session.user.branchId ?? null
  const userId = session.user.id

  // Fetch role-appropriate KPIs server-side
  const isAdmin = ['admin/owner', 'admin', 'owner', 'super_admin'].includes(normalizedRole)
  const isManager = normalizedRole === 'manager'

  const kpis = isAdmin
    ? await getAdminKPIs(branchId)
    : isManager && branchId
    ? await getManagerKPIs(branchId)
    : await getStaffKPIs(userId, branchId)

  return (
    <LaunchpadClient
      initialPermissions={permissions}
      initialRole={role}
      kpis={kpis}
    />
  )
}
