"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { ModuleLaunchpad } from "@/components/dashboard/ModuleLaunchpad"
import { Loader2 } from "lucide-react"
import Image from "next/image"

const BrandIdentity = () => {
  return (
    <div className="flex flex-col items-center scale-75">
      <div className="relative">
        <Image 
          src="/ethan-logo-final.png" 
          alt="Ethan Logo" 
          width={400} 
          height={400} 
          priority 
          className="drop-shadow-[0_0_20px_rgba(127,209,227,0.15)] bg-transparent object-contain"
        />
      </div>
      <div className="text-center space-y-2 mt-2">
        <div className="relative inline-block group">
          <h1 className="font-bold uppercase font-[family-name:var(--font-outfit)] text-xl text-white/40 tracking-[0.2em]">
            Ops360 ERP
          </h1>
        </div>
      </div>
    </div>
  )
}

export default function LaunchpadPage() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [role, setRole] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('permissions, role')
          .eq('id', user.id)
          .single()
        
        setPermissions(profile?.permissions || {})
        setRole(profile?.role || "")
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
    <div className="min-h-screen bg-[#001529] relative overflow-hidden flex flex-col">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7FD1E3]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00AEEF]/5 rounded-full blur-[100px]" />
      
      {/* Logo Section */}
      <div className="flex-none pt-12 pb-2 w-full flex justify-center z-10">
        <BrandIdentity />
      </div>
      
      {/* Card Grid Section */}
      <div className="flex-grow flex items-start justify-center px-6 pb-20 z-10 mt-2">
        <div className="w-full max-w-7xl relative">
          <ModuleLaunchpad permissions={permissions} role={role} isVisible={true} />
        </div>
      </div>

      {/* Developer Watermark */}
      <div className="flex-none pb-10 w-full flex flex-col items-center justify-center z-10 pointer-events-none select-none">
        <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Powered By</p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-white/40 text-2xl font-black tracking-tighter">Krik</span>
          <div className="relative">
            <span className="text-[#00AEEF] text-2xl font-black tracking-tighter">INS</span>
            <div className="absolute -inset-1 border border-[#00AEEF]/0 border-t-[#00AEEF] rounded-md animate-spin duration-[2000ms]" />
          </div>
        </div>
      </div>
    </div>
  )
}
