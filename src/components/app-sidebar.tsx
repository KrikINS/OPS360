"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutGrid,
  List,
  UserSquare,
  Star,
  Receipt,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  FileText,
  ChevronRight,
  Package as PackageIcon,
  Archive,
  ArrowRightLeft,
  ShoppingCart,
  Users,
  BarChart3,
  Wrench,
  Wallet,
  Loader2,
  ArrowLeft,
  BookOpen,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navigationGroups = [
  {
    id: "inventory",
    title: "Inventory Management",
    icon: PackageIcon,
    items: [
      { title: "Inventory Registry", url: "/inventory/registry", icon: PackageIcon },
      { title: "Product Master", url: "/products", icon: Archive },
      { title: "Transfer Control Center", url: "/transfer", icon: ArrowRightLeft },
    ]
  },
  {
    id: "procurement",
    title: "Procurement Portal",
    icon: ShoppingCart,
    items: [
      { title: "PO Registry", url: "/procurement/po-registry", icon: FileText },
      { title: "GRN Registry", url: "/procurement/po-registry?tab=pending", icon: CheckCircle2 },
      { title: "3-WAY Match Audit", url: "/procurement/po-registry?tab=audit", icon: ShieldCheck },
      { title: "Purchase Returns", url: "/procurement/po-registry?tab=returns", icon: RotateCcw },
      { title: "Discrepancy Report Registry", url: "/procurement/po-registry?tab=discrepancies", icon: AlertCircle },
      { title: "Vendor Management", url: "/vendors", icon: Users },
    ]
  },
  {
    id: "pos",
    title: "Sales Hub",
    icon: BarChart3,
    items: [
      { title: "Sales Registry", url: "/sales/hub", icon: List },
      { title: "Sales Return", url: "/sales/hub?tab=returns", icon: RotateCcw },
      { title: "Customer Registry", url: "/admin/customers", icon: UserSquare },
      { title: "Loyalty Points", url: "/sales/loyalty", icon: Star },
    ]
  },
  {
    id: "pos",
    title: "Retail POS",
    icon: Receipt,
    url: "/pos",
    items: []
  },
  {
    id: "accounting",
    title: "Finance & Accounts",
    icon: Wallet,
    items: [
      { title: "Branch-Wise P&L", url: "/accounting", icon: BarChart3 },
      { title: "Expense Tracker", url: "/accounting", icon: Receipt },
    ]
  },
  {
    id: "service",
    title: "Service & Support",
    icon: Wrench,
    items: [
      { title: "Job Card / Work Orders", url: "/service", icon: FileText },
      { title: "Warranty Management", url: "/service/warranty", icon: ShieldCheck },
    ]
  },
  {
    id: "admin",
    title: "System Administration",
    url: "/admin",
    icon: ShieldCheck,
    items: []
  },
  {
    id: "staff",
    title: "Human Resources",
    icon: Users,
    items: [
      { title: "Personnel Registry", url: "/staff", icon: Users },
    ]
  }
]

interface AppSidebarProps {
  permissions: Record<string, boolean>
  profile: {
    role: string
  }
}

export function AppSidebar({ permissions, profile }: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [logoUrl, setLogoUrl] = useState("/ethan-logo.png")
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
  
  const [openGroupId, setOpenGroupId] = useState<string | null>(() => {
    const activeGroup = navigationGroups.find(group => 
      group.items.some(item => 
        item.url === "/" ? pathname === "/" : pathname.startsWith(item.url.split('?')[0])
      )
    );
    return activeGroup ? activeGroup.id : null;
  });

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    const activeGroup = navigationGroups.find(group => 
      group.items.some(item => 
        item.url === "/" ? pathname === "/" : pathname.startsWith(item.url.split('?')[0])
      )
    );
    setOpenGroupId(activeGroup ? activeGroup.id : null);
  }

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
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#0F172A] transition-all duration-300 group-data-[state=collapsed]:w-[80px] group-data-[state=collapsed]:max-w-[80px]">
      {/* ── Logo Header ── */}
      <SidebarHeader className={cn("px-4 py-5 border-b border-white/5", isCollapsed && "px-[5px]")}>
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="relative h-[70px] w-[70px] shrink-0 overflow-hidden">
            <Image
              src={logoUrl}
              alt="Ethan Home Appliances"
              fill
              priority
              className="object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-white font-semibold text-[14px] tracking-tight truncate">Ethan</span>
              <span className="text-[#7FD1E3] text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-80">Ops360 ERP</span>
            </div>
          )}
        </div>

        <div className={cn("mt-6 px-4", isCollapsed && "px-0")}>
          <Link
            href="/launchpad"
            onClick={() => setNavigatingTo("/launchpad")}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-[#7FD1E3]/30 hover:border-[#7FD1E3] transition-all duration-300 group/nav relative z-50 font-bold",
              pathname === "/launchpad" 
                ? "bg-[#7FD1E3]/05 border-[#7FD1E3] shadow-[0_0_15px_rgba(127,209,227,0.1)]" 
                : "bg-transparent",
              isCollapsed && "px-0 border-none"
            )}
            title={isCollapsed ? "Command Center" : undefined}
          >
            {navigatingTo === "/launchpad" ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#7FD1E3]" />
            ) : (
              <LayoutGrid className={cn(
                "h-4 w-4 transition-colors duration-300",
                pathname === "/launchpad" ? "text-[#7FD1E3]" : "text-slate-400 group-hover/nav:text-[#7FD1E3]"
              )} />
            )}
            {!isCollapsed && (
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-wider transition-colors duration-300",
                pathname === "/launchpad" ? "text-[#7FD1E3]" : "text-slate-300 group-hover/nav:text-white"
              )}>
                Command Center
              </span>
            )}
          </Link>
        </div>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className={cn("px-2 pt-2 pb-3", isCollapsed && "px-0")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
            {navigationGroups
              .filter(group => {
                // Admins see everything
                if (profile.role === 'Admin/Owner') return true
                // Special case for System Admin group - restrict to role check usually, 
                // but if tied to a permission, check it.
                if (group.id === 'admin') return profile.role === 'Admin/Owner'
                
                return permissions[group.id] === true
              })
              .map((group) => {
                const isGroupActive = group.items.some(item => 
                  item.url === "/" ? pathname === "/" : pathname.startsWith(item.url.split('?')[0])
                )
                
                const hasItems = group.items && group.items.length > 0;
                
                if (!hasItems) {
                  const isActive = currentUrl === group.url || pathname === group.url?.split('?')[0];
                  return (
                    <SidebarMenuItem key={group.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={group.title}
                        nativeButton={false}
                        className={cn(
                          "h-12 w-full transition-all duration-150 relative tracking-tight",
                          isActive 
                            ? "text-white bg-[#7FD1E3]/05" 
                            : "text-slate-300 hover:text-white hover:bg-white/5",
                          isCollapsed && "w-full flex justify-center"
                        )}
                        render={(props) => (
                          <Link
                            {...props}
                            href={group.url || "#"}
                            onClick={() => {
                              setNavigatingTo(group.url || "#");
                              setOpenGroupId(null);
                            }}
                            className={cn(
                              "flex items-center w-full h-full", 
                              isCollapsed ? "justify-center" : "gap-3 px-3",
                              props.className
                            )}
                          >
                            <group.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-400")} />
                            {!isCollapsed && <span className="flex-1 text-left whitespace-nowrap tracking-tight leading-none">{group.title}</span>}
                          </Link>
                        )}
                      />
                    </SidebarMenuItem>
                  )
                }

                if (isCollapsed && hasItems) {
                  return (
                    <SidebarMenuItem key={group.id}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={(props) => (
                            <SidebarMenuButton
                              {...props}
                              isActive={isGroupActive}
                              tooltip={group.title}
                              className={cn(
                                "h-12 w-full flex items-center justify-center px-0 transition-all duration-150 relative tracking-tight group-data-[state=collapsed]:justify-center",
                                isGroupActive ? "text-white bg-[#7FD1E3]/05" : "text-slate-300 hover:text-white hover:bg-white/5",
                                props.className
                              )}
                            >
                              <group.icon className={cn("h-4 w-4 shrink-0", isGroupActive ? "text-[#7FD1E3]" : "text-slate-400")} />
                            </SidebarMenuButton>
                          )}
                        />
                        <DropdownMenuContent 
                          side="right" 
                          align="start" 
                          sideOffset={12}
                          className="w-64 bg-[#0F172A] border border-white/10 text-slate-300 z-[100] p-1 shadow-2xl backdrop-blur-xl"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[#7FD1E3] font-bold text-[10px] uppercase tracking-widest px-3 py-3 border-b border-white/5 mb-1">
                              {group.title}
                            </DropdownMenuLabel>
                            {group.items.map((item) => {
                              const isActive = currentUrl === item.url || pathname === item.url.split('?')[0];
                              return (
                                <DropdownMenuItem
                                  key={item.title}
                                  render={(props) => (
                                    <Link
                                      {...props}
                                      href={item.url}
                                      onClick={() => {
                                        setNavigatingTo(item.url);
                                        setOpenGroupId(null);
                                      }}
                                      className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 cursor-pointer outline-none w-full",
                                        isActive 
                                          ? "text-white bg-[#7FD1E3]/10 font-bold" 
                                          : "hover:bg-white/5 hover:text-white",
                                        props.className
                                      )}
                                    >
                                      {navigatingTo === item.url ? (
                                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#7FD1E3]" />
                                      ) : (
                                        <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-400")} />
                                      )}
                                      <span className="flex-1 truncate">{item.title}</span>
                                    </Link>
                                  )}
                                />
                              );
                            })}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={group.id}
                    open={openGroupId === group.id}
                    onOpenChange={(isOpen) => setOpenGroupId(isOpen ? group.id : null)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isGroupActive}
                        tooltip={group.title}
                        nativeButton={false}
                        className={cn(
                          "h-12 w-full transition-all duration-150 relative tracking-tight",
                          isGroupActive 
                            ? "text-white bg-[#7FD1E3]/05" 
                            : "text-slate-300 hover:text-white hover:bg-white/5",
                          isCollapsed && "w-full flex justify-center"
                        )}
                        render={(props) => (
                          <CollapsibleTrigger {...props} nativeButton={false} render={(triggerProps) => (
                            <div {...triggerProps} className={cn("flex items-center w-full h-full", isCollapsed ? "justify-center" : "gap-3 px-3", triggerProps.className)}>
                              <group.icon className={cn("h-4 w-4 shrink-0", isGroupActive ? "text-[#7FD1E3]" : "text-slate-400")} />
                              {!isCollapsed && (
                                <>
                                  <span className="flex-1 text-left whitespace-nowrap tracking-tight leading-none">{group.title}</span>
                                  <ChevronRight className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-slate-600" />
                                </>
                              )}
                            </div>
                          )} />
                        )}
                      />
                      {!isCollapsed && (
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                          <SidebarMenu className="mt-1 ml-4 border-l border-white/5 space-y-1">
                            {group.items.map((item) => {
                              const isActive = currentUrl === item.url || pathname === item.url.split('?')[0];

                              return (
                                <SidebarMenuItem key={item.title}>
                                  <Link
                                    href={item.url}
                                    onClick={() => {
                                      setNavigatingTo(item.url);
                                      setOpenGroupId(null);
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] transition-all duration-150 relative",
                                      isActive
                                        ? "text-white bg-[#7FD1E3]/05 backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(127,209,227,0.1)] font-bold"
                                        : "text-slate-300 hover:text-slate-100 font-medium"
                                    )}
                                  >
                                    {navigatingTo === item.url ? (
                                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#7FD1E3]" />
                                    ) : (
                                      <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-400")} />
                                    )}
                                    <span className={cn(navigatingTo === item.url && "animate-pulse", "tracking-tight")}>{item.title}</span>
                                  </Link>
                                </SidebarMenuItem>
                              )
                            })}
                          </SidebarMenu>
                        </CollapsibleContent>
                      )}
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
            onClick={() => {
              setNavigatingTo("/");
              setOpenGroupId(null);
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-bold transition-all duration-150",
              "bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-600/20",
              navigatingTo === "/" && "opacity-70",
              isCollapsed && "justify-center px-0"
            )}
            title={isCollapsed ? "Return to ERP" : undefined}
          >
            {navigatingTo === "/" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" />
            ) : (
              <ArrowLeft className="h-4 w-4 shrink-0" />
            )}
            {!isCollapsed && <span className={cn(navigatingTo === "/" && "animate-pulse")}>Return to ERP</span>}
          </Link>
        )}
        
        <Link
          href="/docs"
          onClick={() => setNavigatingTo("/docs")}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
            "text-slate-300 hover:text-white hover:bg-white/5 border-l-[3px] border-l-transparent",
            navigatingTo === "/docs" && "opacity-70",
            isCollapsed && "justify-center px-0"
          )}
          title={isCollapsed ? "OPS360 Knowledge Base" : undefined}
        >
          {navigatingTo === "/docs" ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-300" />
          ) : (
            <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          {!isCollapsed && <span className={cn(navigatingTo === "/docs" && "animate-pulse")}>OPS360 Knowledge Base</span>}
        </Link>
      </div>

      {/* ── Footer branding ── */}
      <SidebarFooter className={cn("border-t border-white/5 p-2", isCollapsed && "px-0")}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="w-full justify-center text-slate-300 hover:text-[#7FD1E3] hover:bg-white/5"
            >
              {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : (
                <div className="flex items-center gap-3 w-full px-1">
                  <ChevronsLeft className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Minimize Sidebar</span>
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className={cn("mt-2 text-[10px] text-slate-500 text-center uppercase tracking-tighter opacity-50 px-2 leading-tight", isCollapsed && "sr-only")}>
          {`© ${new Date().getFullYear()} Ethan Home Appliances`}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
