import { createClient } from '@/utils/supabase/server'
import StaffClient from './client'

export default async function StaffPayrollPage() {
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

  const isAdmin = role === 'admin'

  return <StaffClient isAdmin={isAdmin} />
}
