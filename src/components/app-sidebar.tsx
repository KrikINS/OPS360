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
  BookOpen,
  Archive,
  Building2,
  FolderTree,
  Palette,
  UserCog,
  ArrowLeft,
  Loader2
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

const erpItems = [
  { title: "Product Master",        url: "/products",      icon: Archive },
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

const adminItems = [
  { title: "Admin Dashboard",       url: "/admin",         icon: ShieldAlert },
  { title: "User Management",       url: "/admin/users",   icon: UserCog },
  { title: "Organization",          url: "/admin/organization", icon: Building2 },
  { title: "Global Masters",        url: "/admin/masters",      icon: FolderTree },
  { title: "Branding",              url: "/admin/branding",     icon: Palette },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [logoUrl, setLogoUrl] = useState("/ethan-logo.png")
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [prevPathname, setPrevPathname] = useState(pathname)

  // Reset loading state when navigation completes
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setNavigatingTo(null)
  }

  // Check if we are in admin section
  const isAdminMode = pathname.startsWith("/admin")


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

  const currentItems = isAdminMode ? adminItems : erpItems
  const groupLabel = isAdminMode ? "Admin Functions" : "Core Modules"

  return (
    <Sidebar className="border-r-0">
      {/* ── Logo Header ── */}
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
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
            {groupLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {currentItems.map((item) => {
                const isActive =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname === item.url || (item.url !== "/admin" && pathname.startsWith(item.url))

                return (
                  <SidebarMenuItem key={item.title}>
                    <Link
                      href={item.url}
                      onClick={() => setNavigatingTo(item.url)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                        "sidebar-item",
                        isActive
                          ? "bg-[#002a52] text-white border-l-[3px] border-l-[#7FD1E3] pl-[9px]"
                          : "text-slate-400 hover:text-white hover:bg-[#002244] border-l-[3px] border-l-transparent",
                        navigatingTo === item.url && "opacity-70"
                      )}
                    >
                      {navigatingTo === item.url ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#7FD1E3]" />
                      ) : (
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-[#7FD1E3]" : "text-slate-500"
                          )}
                        />
                      )}
                      <span className={cn(navigatingTo === item.url && "animate-pulse")}>{item.title}</span>
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Context Specific Footer ── */}
      <div className="px-2 pb-2 space-y-1">
        {isAdminMode && (
          <Link
            href="/"
            onClick={() => setNavigatingTo("/")}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-bold transition-all duration-150",
              "bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-600/20",
              navigatingTo === "/" && "opacity-70"
            )}
          >
            {navigatingTo === "/" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" />
            ) : (
              <ArrowLeft className="h-4 w-4 shrink-0" />
            )}
            <span className={cn(navigatingTo === "/" && "animate-pulse")}>Return to ERP</span>
          </Link>
        )}
        
        <Link
          href="/docs"
          onClick={() => setNavigatingTo("/docs")}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
            "text-slate-400 hover:text-white hover:bg-[#002244] border-l-[3px] border-l-transparent",
            navigatingTo === "/docs" && "opacity-70"
          )}
        >
          {navigatingTo === "/docs" ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
          ) : (
            <BookOpen className="h-4 w-4 shrink-0 text-slate-500" />
          )}
          <span className={cn(navigatingTo === "/docs" && "animate-pulse")}>OPS360 Knowledge Base</span>
        </Link>
      </div>

      {/* ── Footer branding ── */}
      <div className="mt-auto px-4 py-3 border-t border-sidebar-border">
        <p className="text-[10px] text-slate-600 text-center">
          © {new Date().getFullYear()} Ethan Home Appliances
        </p>
      </div>
    </Sidebar>
  )
}
