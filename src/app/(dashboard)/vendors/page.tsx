import VendorsClient from './client'

export const metadata = {
  title: 'Vendor Management | Ops360 ERP',
  description: 'Manage suppliers, track compliance, and handle approvals.'
}

export default async function VendorsPage() {
  let role = 'sales'
  
  const { data: { user } } = await import("@/app/actions/user").then(m => m.getUserAction())
  
  if (user) {
    // We must pass user.id to get the profile
    const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction())
      
    if (profile) {
      role = profile.role || 'sales'
    }
  }

  // Pre-fetch vendors on the server for faster initial load
  const { data: initialVendors } = await import("@/app/actions/generics").then(m => m.fetchData("vendors"))

  return <VendorsClient userRole={role} initialVendors={(initialVendors as any[]) || []} />
}
