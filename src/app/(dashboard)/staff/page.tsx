
import StaffClient from './client'

export default async function StaffPayrollPage() {
  
  const { data: { user } } = await import("@/app/actions/user").then(m => m.getUserAction())
  
  let role = 'sales'
  if (user) {
    const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))
      
    if (profile) {
      role = profile.role || 'sales'
    }
  }

  const isAdmin = role === 'admin'

  return <StaffClient isAdmin={isAdmin} />
}
