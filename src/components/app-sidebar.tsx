"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Package,
  Truck,
  Calculator,
  Users,
  Wrench,
  ShoppingCart,
  ArrowRightLeft,
  ShieldAlert,
  BarChart3,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

const items = [
  { title: "Inventory",             url: "/",              icon: Package },
  { title: "Procurement",           url: "/procurement",   icon: Truck },
  { title: "POS",                   url: "/pos",           icon: ShoppingCart },
  { title: "Inter-Branch Transfer", url: "/transfer",      icon: ArrowRightLeft },
  { title: "Accounting",            url: "/accounting",    icon: Calculator },
  { title: "Staff",                 url: "/staff",         icon: Users },
  { title: "Service",               url: "/service",       icon: Wrench },
  { title: "Vendors",               url: "/vendors",       icon: ShoppingCart },
  { title: "Analytics",             url: "/analytics",     icon: BarChart3 },
  { title: "Admin Center",          url: "/admin",         icon: ShieldAlert },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [logoUrl, setLogoUrl] = useState("/ethan-logo.png")

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "logo_url")
      .single()
      .then(({ data }) => {
        if (data?.value) setLogoUrl(data.value)
      })
  }, [])

  return (
    <Sidebar className="border-r-0">
      {/* ── Logo Header ── */}
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {/* Logo frame — fixed 40x40, scales to fit any logo */}
          <div className="relative h-10 w-10 bg-white rounded-lg shadow-sm shrink-0 overflow-hidden">
            <Image
              src={logoUrl}
              alt="Ethan Home Appliances"
              fill
              priority
              className="object-contain p-0.5"
            />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-white font-semibold text-[13px] tracking-wide truncate">Ethan Home Appliances</span>
            <span className="text-[#7FD1E3] text-[10px] font-medium uppercase tracking-widest">Ops360 ERP</span>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 mb-1">
            Core Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {items.map((item) => {
                const isActive =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url)

                return (
                  <SidebarMenuItem key={item.title}>
                    <Link
                      href={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                        "sidebar-item",
                        isActive
                          ? "bg-[#002a52] text-white border-l-[3px] border-l-[#7FD1E3] pl-[9px]"
                          : "text-slate-400 hover:text-white hover:bg-[#002244] border-l-[3px] border-l-transparent"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-[#7FD1E3]" : "text-slate-500"
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer branding ── */}
      <div className="mt-auto px-4 py-3 border-t border-sidebar-border">
        <p className="text-[10px] text-slate-600 text-center">
          © 2025 Ethan Home Appliances
        </p>
      </div>
    </Sidebar>
  )
}
