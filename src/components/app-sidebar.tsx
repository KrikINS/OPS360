"use client"

import { usePathname, useSearchParams } from "next/navigation"
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
  Database,
  Laptop,
  List,
  UserSquare,
  Star,
  Banknote,
  Receipt,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  FileText,
  CreditCard,
  ChevronRight,
  Package as PackageIcon,
  Archive,
  ArrowRightLeft,
  ShoppingCart,
  Users,
  BarChart3,
  Wrench,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  BookOpen
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

const navigationGroups = [
  {
    title: "Inventory Management",
    icon: Database,
    items: [
      { title: "Inventory Registry", url: "/", icon: PackageIcon },
      { title: "Product Master", url: "/products", icon: Archive },
      { title: "Transfer Control Center", url: "/transfer", icon: ArrowRightLeft },
    ]
  },
  {
    title: "Procurement Management",
    icon: ShoppingCart,
    items: [
      { title: "PO Registry", url: "/procurement", icon: FileText },
      { title: "GRN Registry", url: "/procurement?tab=pending", icon: CheckCircle2 },
      { title: "3-WAY Match Audit", url: "/procurement?tab=audit", icon: ShieldCheck },
      { title: "Purchase Returns", url: "/procurement?tab=returns", icon: RotateCcw },
      { title: "Discrepancy Report Registry", url: "/procurement?tab=discrepancies", icon: AlertCircle },
      { title: "Vendor Management", url: "/vendors", icon: Users },
    ]
  },
  {
    title: "Sales Management",
    icon: CreditCard,
    items: [
      { title: "POS", url: "/pos", icon: Laptop },
      { title: "Sales Registry", url: "/admin/sales-registry", icon: List },
      { title: "Sales Return", url: "/sales/returns", icon: RotateCcw },
      { title: "Customer Registry", url: "/admin/customers", icon: UserSquare },
      { title: "Loyalty Points", url: "/sales/loyalty", icon: Star },
    ]
  },
  {
    title: "Finance Management",
    icon: Banknote,
    items: [
      { title: "Branch-Wise P&L", url: "/finance/pl", icon: BarChart3 },
      { title: "Expense Tracker", url: "/finance/expenses", icon: Receipt },
    ]
  },
  {
    title: "Service and Maintenance",
    icon: Wrench,
    items: [
      { title: "Job Card / Work Orders", url: "/service", icon: FileText },
      { title: "Warranty Management", url: "/service/warranty", icon: ShieldCheck },
    ]
  },
  {
    title: "Admin Center",
    url: "/admin",
    icon: ShieldAlert,
    items: []
  },
  {
    title: "HR Management",
    icon: Users,
    items: [
      { title: "Personnel Registry", url: "/hr", icon: Users },
    ]
  }
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [logoUrl, setLogoUrl] = useState("/ethan-logo.png")
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
  
  if (navigatingTo && currentUrl === navigatingTo) {
    setNavigatingTo(null);
  }

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "logo_url")
      .single()
      .then((res: { data: { value: string } | null }) => {
        if (res.data?.value) setLogoUrl(res.data.value)
      })
  }, [])

  const isAdminMode = pathname.startsWith("/admin")

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
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-white font-semibold text-[14px] tracking-tight truncate">Ethan</span>
            <span className="text-[#7FD1E3] text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-80">Ops360 ERP</span>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 mb-1 truncate whitespace-nowrap">
            Enterprise Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationGroups.map((group) => {
                const isGroupActive = group.items.some(item => 
                  item.url === "/" ? pathname === "/" : pathname.startsWith(item.url.split('?')[0])
                )
                
                const hasItems = group.items && group.items.length > 0;
                
                if (!hasItems) {
                  const isActive = currentUrl === group.url || pathname === group.url?.split('?')[0];
                  return (
                    <SidebarMenuItem key={group.title}>
                      <Link
                        href={group.url || "#"}
                        onClick={() => setNavigatingTo(group.url || "#")}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 relative",
                          isActive ? "text-white bg-[#002a52]/50" : "text-slate-400 hover:text-white hover:bg-[#002244]"
                        )}
                      >
                        <group.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-500")} />
                        <span className="flex-1 text-left whitespace-nowrap tracking-tight leading-none">{group.title}</span>
                      </Link>
                    </SidebarMenuItem>
                  )
                }

                return (
                  <Collapsible
                    key={`${group.title}-${isGroupActive}`}
                    defaultOpen={isGroupActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all duration-150",
                        isGroupActive ? "text-white bg-[#002a52]/50" : "text-slate-400 hover:text-white hover:bg-[#002244]"
                      )}>
                        <group.icon className={cn("h-4 w-4 shrink-0", isGroupActive ? "text-[#7FD1E3]" : "text-slate-500")} />
                        <span className="flex-1 text-left whitespace-nowrap tracking-tight leading-none">{group.title}</span>
                        <ChevronRight className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-slate-600" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenu className="mt-1 ml-4 border-l border-slate-800 space-y-0.5">
                          {group.items.map((item) => {
                            const isActive = currentUrl === item.url || pathname === item.url.split('?')[0];

                            return (
                              <SidebarMenuItem key={item.title}>
                                <Link
                                  href={item.url}
                                  onClick={() => setNavigatingTo(item.url)}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-1 rounded-md text-[13px] font-medium transition-all duration-150 relative",
                                    isActive
                                      ? "text-white bg-[#002a52] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-4 before:bg-[#7FD1E3]"
                                      : "text-slate-500 hover:text-slate-300"
                                  )}
                                >
                                  {navigatingTo === item.url ? (
                                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#7FD1E3]" />
                                  ) : (
                                    <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-600")} />
                                  )}
                                  <span className={cn(navigatingTo === item.url && "animate-pulse")}>{item.title}</span>
                                </Link>
                              </SidebarMenuItem>
                            )
                          })}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
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
