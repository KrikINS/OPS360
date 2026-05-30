
import VendorsClient from './client'

export const metadata = {
  title: 'Vendor Management | Ops360 ERP',
  description: 'Manage suppliers, track compliance, and handle approvals.'
}

export default async function VendorsPage() {
  const { getServerSession } = await import("next-auth/next")
  const session = await getServerSession()
  const user = session?.user
  
  let role = 'sales'
  if (user) {
    const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))
      
    if (profile) {
      role = profile.role || 'sales'
    }
  }

  // Pre-fetch vendors on the server for faster initial load
  const { data: initialVendors } = await import("@/app/actions/generics").then(m => m.fetchData("vendors"))

  return <VendorsClient userRole={role} initialVendors={(initialVendors as any[]) || []} />
}
