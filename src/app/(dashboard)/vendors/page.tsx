import { createClient } from '@/utils/supabase/server'
import VendorsClient from './client'

export const metadata = {
  title: 'Vendor Management | Ops360 ERP',
  description: 'Manage suppliers, track compliance, and handle approvals.'
}

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let role = 'sales'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profile) {
      role = profile.role
    }
  }

  // Pre-fetch vendors on the server for faster initial load
  const { data: initialVendors } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })

  return <VendorsClient userRole={role} initialVendors={initialVendors || []} />
}
