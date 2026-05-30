"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  ImageIcon,
  ArrowLeftCircle,
  ChevronRight,
  FolderTree,
  AlertCircle
} from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"


const adminNavItems = [
  {
    title: "Admin Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    description: "Overview & system health",
  },
  {
    title: "Global Masters",
    url: "/admin/masters",
    icon: FolderTree,
    description: "Brands, Branches, Categories",
    module: "inventory"
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
    description: "Accounts & permissions",
    module: "staff"
  },
  {
    title: "Company Branding",
    url: "/admin/branding",
    icon: ImageIcon,
    description: "Logo & identity settings",
  },
]

interface AdminSidebarProps {
  profile: {
    role: string
  }
  permissions: Record<string, boolean>
}

export function AdminSidebar({ profile, permissions }: AdminSidebarProps) {
  const pathname = usePathname()
  const [logoUrl, setLogoUrl] = useState("/ethan-logo.png")

  useEffect(() => {
    import("@/app/actions/generics").then(m => m.fetchData("app_settings"))
      .then((res: { data: typeof import("@/db/schema").app_settings.$inferSelect[] | null | undefined | unknown }) => { 
        if (res.data && Array.isArray(res.data)) {
          const logo = res.data.find((s: typeof import("@/db/schema").app_settings.$inferSelect) => s.key === "logo_url")
          if (logo?.value) setLogoUrl(logo.value)
        }
      })
  }, [])

  return (
    <aside className="w-64 h-screen flex flex-col shrink-0 bg-[#001529] border-r border-[#002244] overflow-hidden">
      {/* Logo Header */}
      <div className="px-4 py-5 border-b border-[#002244]">
        <div className="flex items-center gap-3">
          <div className="relative h-[70px] w-[70px] shrink-0 overflow-hidden">
            <Image src={logoUrl} alt="Ethan Home Appliances" fill priority className="object-contain" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-white font-semibold text-[13px] tracking-wide truncate">Ethan Home Appliances</span>
            <span className="text-[#7FD1E3] text-[10px] font-medium uppercase tracking-widest">Admin Center</span>
          </div>
        </div>
      </div>

      {/* Admin Nav */}
      <div className="flex-1 px-2 py-4 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 mb-2">
          Admin Functions
        </p>
        <nav className="space-y-0.5">
          {adminNavItems
            .filter(item => !item.module || permissions[item.module] === true || profile.role === 'Admin/Owner' || profile.role === 'SUPER_ADMIN')
            .map((item) => {
            const isActive = item.url === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.url)

            return (
              <Link
                key={item.title}
                href={item.url}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group",
                  "border-l-[3px]",
                  isActive
                    ? "bg-[#002a52] text-white border-l-[#7FD1E3] pl-[9px]"
                    : "text-slate-400 hover:text-white hover:bg-[#002244] border-l-transparent"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-500 group-hover:text-slate-300")} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-none">{item.title}</p>
                  <p className={cn("text-[10px] mt-0.5 leading-none truncate", isActive ? "text-slate-300" : "text-slate-600 group-hover:text-slate-500")}>
                    {item.description}
                  </p>
                </div>
                {isActive && <ChevronRight className="h-3 w-3 text-[#7FD1E3] shrink-0" />}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Divider + Back to ERP */}
      <div className="px-2 pb-4 border-t border-[#002244] pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-[#002244] border-l-[3px] border-l-transparent transition-all duration-150 group"
        >
          <ArrowLeftCircle className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-[#7FD1E3]" />
          <div>
            <p className="font-medium leading-none">Back to ERP</p>
            <p className="text-[10px] text-slate-600 group-hover:text-slate-500 mt-0.5">Return to main dashboard</p>
          </div>
        </Link>
        <a
          href="mailto:ethanops360@gmail.com?subject=OPS360%20Issue%20Report"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-[#002244] border-l-[3px] border-l-transparent transition-all duration-150 group mt-1"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500/80 group-hover:text-amber-400" />
          <div>
            <p className="font-medium leading-none">Report an Issue</p>
            <p className="text-[10px] text-slate-600 group-hover:text-slate-500 mt-0.5">Contact Support Team</p>
          </div>
        </a>
        <div className="flex flex-col gap-1.5 items-center justify-center mt-4">
          <p className="text-[10px] text-slate-700 text-center uppercase tracking-widest font-bold">
            © {new Date().getFullYear()} Ethan Home Appliances
          </p>
          <div className="flex items-center gap-1.5 opacity-60 text-slate-500 text-[10px]">
            <span>System v1.2</span>
            <span>•</span>
            <span className="text-[#7FD1E3] font-bold tracking-widest">Active</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
