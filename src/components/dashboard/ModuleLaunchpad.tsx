"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Wallet, 
  Wrench, 
  ShieldCheck, 
  Users,
  ArrowRight,
  Receipt
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Module {
  id: string
  name: string
  description: string
  icon: React.ElementType
  path: string
  color: string
}

const MODULES: Module[] = [
  {
    id: "inventory",
    name: "Inventory Management",
    description: "Active Stock & Registry",
    icon: Package,
    path: "/inventory/registry",
    color: "from-blue-500/20 to-blue-600/5",
  },
  {
    id: "procurement",
    name: "Procurement Portal",
    description: "Orders, GRN & Vendors",
    icon: ShoppingCart,
    path: "/procurement/po-registry",
    color: "from-amber-500/20 to-amber-600/5",
  },
  {
    id: "sales",
    name: "Sales Hub",
    description: "Invoice & Customers",
    icon: BarChart3,
    path: "/sales/hub",
    color: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    id: "pos",
    name: "Retail POS",
    description: "Quick Checkout & Sales",
    icon: Receipt,
    path: "/pos",
    color: "from-cyan-500/30 to-cyan-600/10",
  },
  {
    id: "finance",
    name: "Finance & Accounts",
    description: "Ledger, Tax & Expense",
    icon: Wallet,
    path: "/accounting",
    color: "from-indigo-500/20 to-indigo-600/5",
  },
  {
    id: "service",
    name: "Service & Support",
    description: "Tickets, Spares & Tech",
    icon: Wrench,
    path: "/service",
    color: "from-rose-500/20 to-rose-600/5",
  },
  {
    id: "admin",
    name: "System Administration",
    description: "Users, Org & Audit Logs",
    icon: ShieldCheck,
    path: "/admin",
    color: "from-slate-500/20 to-slate-600/5",
  },
  {
    id: "hr",
    name: "Human Resources",
    description: "Personnel, Payroll & Att.",
    icon: Users,
    path: "/staff",
    color: "from-purple-500/20 to-purple-600/5",
  },
]

const ModernOrbitSpinner = () => (
  <div className="relative h-6 w-6 flex items-center justify-center">
    {/* Outer Scanning Ring */}
    <div className="absolute inset-0 rounded-full border-2 border-white/5 border-t-white/40 animate-[spin_1.5s_linear_infinite]" />
    
    {/* Inner Pulsing Core */}
    <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
    
    {/* Orbiting Satellite Dot */}
    <div className="absolute inset-[-4px] animate-[spin_0.8s_linear_infinite]">
      <div className="h-1 w-1 rounded-full bg-[#7FD1E3] shadow-[0_0_8px_#7FD1E3]" />
    </div>

    {/* Holographic Subtle Scan Line */}
    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent h-[1px] w-full animate-[bounce_2s_ease-in-out_infinite] opacity-20" />
  </div>
)

interface ModuleLaunchpadProps {
  permissions: Record<string, boolean>
  role?: string
  isVisible: boolean
}

export function ModuleLaunchpad({ permissions, role, isVisible }: ModuleLaunchpadProps) {
  const [mounted, setMounted] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [loadingModuleId, setLoadingModuleId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: count, error } = await supabase.rpc('get_unique_low_stock_count')
      
      if (!error && count !== null) {
        setLowStockCount(Number(count))
      }
    }

    fetchAlerts()
  }, [supabase])

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setMounted(true), 100)
    }
  }, [isVisible])

  // Admins always see all modules; others filter by permissions
  const allowedModules = role === "Admin/Owner" 
    ? MODULES 
    : MODULES.filter(m => permissions?.[m.id])

  if (!isVisible) return null

  return (
    <div className="w-full flex-none flex flex-col items-center justify-center px-6 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full">
        {allowedModules.map((module, index) => (
          <div 
            key={module.id} 
            onClick={() => {
              setLoadingModuleId(module.id)
              router.push(module.path)
            }}
            className={cn(
              "group relative block cursor-pointer transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) hover:-translate-y-1 hover:scale-[1.03]",
              mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-90",
              `[transition-delay:${index * 80}ms]`
            )}
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
              module.color
            )} />
            
            <div className="relative h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col items-start hover:border-white/30 transition-all duration-500 shadow-2xl group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.3),0_0_30px_rgba(255,255,255,0.05)]">
              {/* Icon at the Top */}
              <div className={cn(
                "p-2.5 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/10 group-hover:scale-110 transition-transform duration-500 mb-auto",
                module.color
              )}>
                {loadingModuleId === module.id ? (
                  <ModernOrbitSpinner />
                ) : (
                  <module.icon className="h-5 w-5 text-white" />
                )}
                {module.id === 'inventory' && lowStockCount > 0 && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ring-2 ring-black/20 animate-bounce">
                    {lowStockCount}
                  </div>
                )}
              </div>
              
              {/* Typography block re-aligned to the bottom-left */}
              <div className="mt-6 space-y-1 w-full text-left">
                <h3 className="text-white font-bold text-[13px] tracking-tight">{module.name}</h3>
                <p className="text-white/40 text-[10px] leading-relaxed font-medium line-clamp-2">
                  {module.description}
                </p>
              </div>

              <div className="pt-3 flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-[#7FD1E3] opacity-0 group-hover:opacity-100 translate-x-[-8px] group-hover:translate-x-0 transition-all duration-500">
                Initialize Module <ArrowRight className="h-2.5 w-2.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
