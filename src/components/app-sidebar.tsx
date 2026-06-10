"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useBranding } from "@/providers/GlobalBrandingProvider"
import { useState } from "react"

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
  ArrowLeft,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  Wallet,
  LayoutDashboard,
  Scale,
  TrendingUp,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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

const ModernOrbitSpinner = ({ size = "sm" }: { size?: "sm" | "md" }) => {
  const isMd = size === "md";
  return (
    <div className={cn("relative flex items-center justify-center", isMd ? "h-6 w-6" : "h-4 w-4")}>
      {/* Outer Scanning Ring */}
      <div className={cn("absolute inset-0 rounded-full border-2 border-white/5 border-t-[#7FD1E3]/40 animate-[spin_1.5s_linear_infinite]", isMd ? "border-2" : "border-[1.5px]")} />
      
      {/* Inner Pulsing Core */}
      <div className={cn("rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse", isMd ? "h-1.5 w-1.5" : "h-1 w-1")} />
      
      {/* Orbiting Satellite Dot */}
      <div className={cn("absolute animate-[spin_0.8s_linear_infinite]", isMd ? "inset-[-4px]" : "inset-[-2px]")}>
        <div className={cn("rounded-full bg-[#7FD1E3] shadow-[0_0_6px_#7FD1E3]", isMd ? "h-1 w-1" : "h-0.5 w-0.5")} />
      </div>
    </div>
  );
};

type NavigationGroup = {
  id: string;
  title: string;
  url?: string;
  icon: React.ElementType;
  items: {
    title: string;
    url: string;
    icon: React.ElementType;
  }[];
};

const navigationGroups: NavigationGroup[] = [
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
    title: "Procurement",
    icon: ShoppingCart,
    items: [
      { title: "PO Registry", url: "/procurement/po-registry", icon: FileText },
      { title: "GRN Registry", url: "/procurement/po-registry?tab=pending", icon: CheckCircle2 },
      { title: "3-WAY Match Audit", url: "/procurement/po-registry?tab=audit", icon: ShieldCheck },
      { title: "Invoice & Billing", url: "/procurement/po-registry?tab=invoices", icon: Receipt },
      { title: "Discrepancy Report", url: "/procurement/po-registry?tab=discrepancies", icon: AlertCircle },
      { title: "Vendor Management", url: "/vendors", icon: Users },
    ]
  },
  {
    id: "sales",
    title: "Sales Hub",
    icon: BarChart3,
    items: [
      { title: "Sales Registry", url: "/sales/hub", icon: List },
      { title: "Sales Return", url: "/sales/hub?tab=returns", icon: RotateCcw },
      { title: "Customer Management", url: "/sales/customers", icon: UserSquare },
    ]
  },

  {
    id: "accounting",
    title: "Finance & Accounts",
    icon: Wallet,
    items: [
      { title: "Dashboard",      url: "/accounting",                    icon: LayoutDashboard },
      { title: "Balance Sheet",  url: "/accounting?tab=balance-sheet",  icon: Scale           },
      { title: "Journal Ledger", url: "/accounting?tab=journal",        icon: BookOpen        },
      { title: "Expenses",       url: "/accounting?tab=expenses",       icon: Receipt         },
      { title: "Margin Report",  url: "/accounting?tab=margin",         icon: TrendingUp      },
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
    id: "staff",
    title: "Human Resources",
    url: "/staff",
    icon: Users,
    items: []
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
  const { logoUrl, companyName, supportEmail } = useBranding()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
  
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navigationGroups.forEach(g => {
      initialState[g.id] = true;
    });
    return initialState;
  });

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
  }

  if (navigatingTo && currentUrl === navigatingTo) {
    setNavigatingTo(null);
  }


  const isAdminMode = pathname.startsWith("/admin")

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#0F172A] transition-all duration-300 group-data-[state=collapsed]:w-[80px] group-data-[state=collapsed]:max-w-[80px]">
      {/* ── Logo Header ── */}
      <SidebarHeader className={cn("px-4 pt-4 pb-2 border-b border-white/5 transition-all duration-300 flex flex-col items-center", isCollapsed && "px-0 pt-4 pb-2")}>
        <div className="flex justify-center w-full">
          <div className={cn(
            "relative shrink-0 transition-all duration-300 flex items-center justify-center",
            isCollapsed ? "h-16 w-16 rounded-xl shadow-[0_0_15px_rgba(127,209,227,0.2)] border border-white/10 overflow-hidden" : "w-full px-2"
          )}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/ethan-logo-final.png"}
              alt={companyName}
              className={cn("object-contain transition-transform duration-300", isCollapsed ? "scale-110 p-1 w-full h-full" : "max-h-[80px] w-auto max-w-full")}
            />
          </div>
        </div>

        <div className={cn("mt-0 px-4", isCollapsed && "px-0")}>
          <Link
            href="/launchpad"
            onClick={() => setNavigatingTo("/launchpad")}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-[#7FD1E3]/30 hover:border-[#7FD1E3] transition-all duration-300 group/nav relative z-50 font-bold",
              pathname === "/launchpad"
                ? "bg-[#7FD1E3]/05 border-[#7FD1E3] shadow-[0_0_15px_rgba(127,209,227,0.1)]"
                : "bg-transparent",
              isCollapsed && "px-0 border-none"
            )}
            title={isCollapsed ? "Command Center" : undefined}
          >
            {navigatingTo === "/launchpad" ? (
              <ModernOrbitSpinner />
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
                const normalizedRole = (profile.role || "").toLowerCase().trim();
                const isAdmin = normalizedRole === 'admin/owner' || normalizedRole === 'admin' || normalizedRole === 'owner' || normalizedRole === 'super_admin';

                // Admins see everything
                if (isAdmin) return true
                // Special case for System Admin group - restrict to role check usually, 
                // but if tied to a permission, check it.
                if (group.id === 'admin') return isAdmin
                
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
                          "h-7 w-full transition-all duration-150 relative tracking-tight text-xs",
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
                                "h-7 w-full flex items-center justify-center px-0 transition-all duration-150 relative tracking-tight group-data-[state=collapsed]:justify-center text-xs",
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
                                        
                                      }}
                                      className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-[9px] uppercase tracking-wider transition-all duration-150 cursor-pointer outline-none w-full",
                                        isActive 
                                          ? "text-white bg-[#7FD1E3]/10 font-bold" 
                                          : "hover:bg-white/5 hover:text-white",
                                        props.className
                                      )}
                                    >
                                      {navigatingTo === item.url ? (
                                        <ModernOrbitSpinner />
                                      ) : (
                                        <item.icon className={cn("h-3 w-3 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-400")} />
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
                    open={openGroupIds[group.id] ?? true}
                    onOpenChange={(isOpen) => setOpenGroupIds(prev => ({ ...prev, [group.id]: isOpen }))}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isGroupActive}
                        tooltip={group.title}
                        nativeButton={false}
                        className={cn(
                          "h-7 w-full transition-all duration-150 relative tracking-tight text-xs",
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
                          <SidebarMenu className="mt-1 ml-4 space-y-1">
                            {group.items.map((item) => {
                              const isActive = currentUrl === item.url || pathname === item.url.split('?')[0];

                              return (
                                <SidebarMenuItem key={item.title}>
                                  <Link
                                    href={item.url}
                                    onClick={() => {
                                      setNavigatingTo(item.url);
                                      
                                    }}
                                    className={cn(
                                      "flex items-center gap-2 px-2 py-1 rounded-md text-[9px] transition-all duration-150 relative uppercase tracking-wider",
                                      isActive
                                        ? "text-white bg-[#7FD1E3]/05 backdrop-blur-md font-bold"
                                        : "text-slate-300 hover:text-slate-100 font-medium"
                                    )}
                                  >
                                    {navigatingTo === item.url ? (
                                      <ModernOrbitSpinner />
                                    ) : (
                                      <item.icon className={cn("h-3 w-3 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-400")} />
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
      <div className="px-1 pb-1 space-y-0.5">
        {isAdminMode && (
          <Link
            href="/launchpad"
            onClick={() => {
              setNavigatingTo("/launchpad");
              
            }}
            className={cn(
              "flex items-center gap-2 px-2 h-7 rounded-md text-xs tracking-tight transition-all duration-150",
              "bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-600/20",
              navigatingTo === "/" && "opacity-70",
              isCollapsed && "justify-center px-0"
            )}
            title={isCollapsed ? "Return to ERP" : undefined}
          >
            {navigatingTo === "/" ? (
              <ModernOrbitSpinner />
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
            "flex items-center gap-2 px-2 h-7 rounded-md text-xs tracking-tight transition-all duration-150",
            "text-slate-300 hover:text-white hover:bg-white/5 border-l-[3px] border-l-transparent",
            navigatingTo === "/docs" && "opacity-70",
            isCollapsed && "justify-center px-0"
          )}
          title={isCollapsed ? "OPS360 Knowledge Base" : undefined}
        >
          {navigatingTo === "/docs" ? (
            <ModernOrbitSpinner />
          ) : (
            <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          {!isCollapsed && <span className={cn(navigatingTo === "/docs" && "animate-pulse")}>Knowledge Base</span>}
        </Link>
        
        <a
          href={`mailto:${supportEmail}?subject=OPS360%20Issue%20Report`}
          className={cn(
            "flex items-center gap-2 px-2 h-7 rounded-md text-xs tracking-tight transition-all duration-150",
            "text-slate-300 hover:text-white hover:bg-white/5 border-l-[3px] border-l-transparent",
            isCollapsed && "justify-center px-0"
          )}
          title={isCollapsed ? "Report an Issue" : undefined}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500/80" />
          {!isCollapsed && <span>Report an Issue</span>}
        </a>
      </div>

      {/* ── Footer branding ── */}
      <SidebarFooter className={cn("border-t border-white/5 p-1", isCollapsed && "p-0 py-1")}>
        <SidebarMenu>
          <SidebarMenuItem className="flex justify-center">
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className={cn(
                "w-full transition-all duration-200 text-slate-300 hover:text-[#7FD1E3] hover:bg-white/5",
                isCollapsed ? "h-7 w-7 p-0 justify-center flex" : "h-7 px-2"
              )}
            >
              {isCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <ChevronsLeft className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Minimize Sidebar</span>
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className={cn("mt-1 text-[6px] text-slate-500 text-center uppercase tracking-tighter px-1 leading-tight flex flex-col gap-0.5 items-center justify-center", isCollapsed && "sr-only")}>
          <div className="flex items-center gap-1.5 opacity-60">
            <span>System v1.2</span>
            <span>•</span>
            <span className="text-[#7FD1E3] font-bold tracking-widest">Active</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
