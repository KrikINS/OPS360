"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { ModuleLaunchpad } from "@/components/dashboard/ModuleLaunchpad"
import { Loader2 } from "lucide-react"

export default function LaunchpadPage() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('permissions')
          .eq('id', user.id)
          .single()
        
        setPermissions(profile?.permissions || {})
      }
      setLoading(false)
    }

    fetchPermissions()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#001529]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7FD1E3]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#001529] p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7FD1E3]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00AEEF]/5 rounded-full blur-[100px]" />
      
      <ModuleLaunchpad permissions={permissions} isVisible={true} />
    </div>
  )
}
