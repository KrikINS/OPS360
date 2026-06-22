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
} from "@/components/ui/sidebar"
import {
  LayoutGrid,
  List,
  UserSquare,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
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
  Receipt,
  PieChart,
  CreditCard,
  Truck,
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
import { can, type Module } from "@/lib/rbac"

const GROUP_TO_MODULE: Record<string, Module> = {
  inventory: "inventory",
  procurement: "procurement",
  vendors: "procurement",
  sales: "sales",
  reports: "finance",
  service: "service",
  staff: "hr",
  admin: "admin",
}

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
      { title: "Stock Alerts", url: "/inventory/alerts", icon: AlertTriangle },
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
      { title: "Discrepancy Report", url: "/procurement/po-registry?tab=discrepancies", icon: AlertCircle },
      { title: "Payments", url: "/procurement/po-registry?tab=payments", icon: Receipt },
    ]
  },
  {
    id: "vendors",
    title: "Vendor Management",
    url: "/vendors",
    icon: Truck,
    items: []
  },
  {
    id: "sales",
    title: "Sales Hub",
    icon: BarChart3,
    items: [
      { title: "Sales Registry", url: "/sales/hub", icon: List },
      { title: "Customer Management", url: "/sales/customers", icon: UserSquare },
      { title: "Accounts Receivable", url: "/sales/credit", icon: CreditCard },
    ]
  },
  {
    title: "Reports",
    url: "/reports",
    icon: PieChart,
    id: "reports",
    items: []
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

interface NavigationContentProps {
  showLabels: boolean;
  pathname: string;
  currentUrl: string;
  navigatingTo: string | null;
  setNavigatingTo: (url: string | null) => void;
  permissions: Record<string, boolean>;
  profile: { role: string };
  openGroupIds: Record<string, boolean>;
  setOpenGroupIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

function NavigationContent({
  showLabels,
  pathname,
  currentUrl,
  navigatingTo,
  setNavigatingTo,
  permissions,
  profile,
  openGroupIds,
  setOpenGroupIds
}: NavigationContentProps) {
  return (
    <SidebarContent className={cn("px-2 pt-2 pb-3", !showLabels && "px-0")}>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu className="space-y-3">
          {navigationGroups
            .filter(group => {
              const moduleKey = GROUP_TO_MODULE[group.id]
              // Unmapped groups (if any) fall back to the legacy permission flag.
              if (!moduleKey) return permissions[group.id] === true

              // Baseline: role matrix decides visibility (view capability).
              const allowedByRole = can(profile.role, moduleKey, "view")

              // Optional per-user override layer: an explicit permission flag can GRANT
              // a module the role wouldn't otherwise show (never used to REVOKE here).
              const grantedByOverride = permissions[group.id] === true

              return allowedByRole || grantedByOverride
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
                      tooltip={!showLabels ? group.title : undefined}
                      nativeButton={false}
                      className={cn(
                        "h-7 w-full transition-all duration-150 relative tracking-tight text-xs",
                        isActive
                          ? "text-white bg-[#7FD1E3]/05"
                          : "text-slate-300 hover:text-white hover:bg-white/5",
                        !showLabels && "w-full flex justify-center"
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
                            !showLabels ? "justify-center" : "gap-3 px-3",
                            props.className
                          )}
                        >
                          <group.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#7FD1E3]" : "text-slate-400")} />
                          {showLabels && <span className="flex-1 text-left whitespace-nowrap tracking-tight leading-none">{group.title}</span>}
                        </Link>
                      )}
                    />
                  </SidebarMenuItem>
                )
              }

              if (!showLabels && hasItems) {
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
                      suppressHydrationWarning
                      isActive={isGroupActive}
                      tooltip={!showLabels ? group.title : undefined}
                      nativeButton={false}
                      className={cn(
                        "h-7 w-full transition-all duration-150 relative tracking-tight text-xs",
                        isGroupActive 
                          ? "text-white bg-[#7FD1E3]/05" 
                          : "text-slate-300 hover:text-white hover:bg-white/5",
                        !showLabels && "w-full flex justify-center"
                      )}
                      render={(props) => (
                        <CollapsibleTrigger {...props} suppressHydrationWarning nativeButton={false} render={(triggerProps) => (
                          <div {...triggerProps} suppressHydrationWarning className={cn("flex items-center w-full h-full", !showLabels ? "justify-center" : "gap-3 px-3", triggerProps.className)}>
                            <group.icon className={cn("h-4 w-4 shrink-0", isGroupActive ? "text-[#7FD1E3]" : "text-slate-400")} />
                            {showLabels && (
                              <>
                                <span className="flex-1 text-left whitespace-nowrap tracking-tight leading-none">{group.title}</span>
                                <ChevronRight className={cn(
                                  "h-3 w-3 shrink-0 transition-transform duration-200 text-slate-600",
                                  (openGroupIds[group.id] ?? true) && "rotate-90"
                                )} />
                              </>
                            )}
                          </div>
                        )} />
                      )}
                    />
                    {showLabels && (
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
  )
}

interface AppSidebarProps {
  permissions: Record<string, boolean>
  profile: {
    role: string
  }
}

export function AppSidebar({ permissions, profile }: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { logoUrl, companyName, supportEmail } = useBranding()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
  
  const [isHovering, setIsHovering] = useState(false)

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

  const renderContent = (showLabels: boolean) => (
    <>
      {/* ── Logo Header ── */}
      <SidebarHeader className={cn("px-4 pt-4 pb-2 border-b border-white/5 transition-all duration-300 flex flex-col items-center", !showLabels && "px-0 pt-4 pb-2")}>
        <div className="flex justify-center w-full">
          <div className={cn(
            "relative shrink-0 transition-all duration-300 flex items-center justify-center",
            !showLabels ? "h-10 w-10 rounded-xl shadow-[0_0_15px_rgba(127,209,227,0.2)] border border-white/10 overflow-hidden" : "w-full px-2"
          )}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/appterra-logo.png"}
              alt={companyName}
              className={cn("object-contain transition-transform duration-300", !showLabels ? "scale-110 p-1 w-full h-full" : "max-h-[64px] w-auto max-w-full")}
            />
          </div>
        </div>

        <div className={cn("mt-0 px-4", !showLabels && "px-0")}>
          <Link
            href="/launchpad"
            onClick={() => setNavigatingTo("/launchpad")}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-[#7FD1E3]/30 hover:border-[#7FD1E3] transition-all duration-300 group/nav relative font-bold",
              pathname === "/launchpad"
                ? "bg-[#7FD1E3]/05 border-[#7FD1E3] shadow-[0_0_15px_rgba(127,209,227,0.1)]"
                : "bg-transparent",
              !showLabels && "px-0 border-none"
            )}
            title={!showLabels ? "Command Center" : undefined}
          >
            {navigatingTo === "/launchpad" ? (
              <ModernOrbitSpinner />
            ) : (
              <LayoutGrid className={cn(
                "h-4 w-4 transition-colors duration-300",
                pathname === "/launchpad" ? "text-[#7FD1E3]" : "text-slate-400 group-hover/nav:text-[#7FD1E3]"
              )} />
            )}
            {showLabels && (
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
      <NavigationContent
        showLabels={showLabels}
        pathname={pathname}
        currentUrl={currentUrl}
        navigatingTo={navigatingTo}
        setNavigatingTo={setNavigatingTo}
        permissions={permissions}
        profile={profile}
        openGroupIds={openGroupIds}
        setOpenGroupIds={setOpenGroupIds}
      />

      {/* ── Context Specific Footer ── */}
      <div className="px-1 pb-1 space-y-0.5 mt-auto">
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
              !showLabels && "justify-center px-0"
            )}
            title={!showLabels ? "Return to ERP" : undefined}
          >
            {navigatingTo === "/" ? (
              <ModernOrbitSpinner />
            ) : (
              <ArrowLeft className="h-4 w-4 shrink-0" />
            )}
            {showLabels && <span className={cn(navigatingTo === "/" && "animate-pulse")}>Return to ERP</span>}
          </Link>
        )}
        
        <Link
          href="/docs"
          onClick={() => setNavigatingTo("/docs")}
          className={cn(
            "flex items-center gap-2 px-2 h-7 rounded-md text-xs tracking-tight transition-all duration-150",
            "text-slate-300 hover:text-white hover:bg-white/5 border-l-[3px] border-l-transparent",
            navigatingTo === "/docs" && "opacity-70",
            !showLabels && "justify-center px-0"
          )}
          title={!showLabels ? "OPS360 Knowledge Base" : undefined}
        >
          {navigatingTo === "/docs" ? (
            <ModernOrbitSpinner />
          ) : (
            <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          {showLabels && <span className={cn(navigatingTo === "/docs" && "animate-pulse")}>Knowledge Base</span>}
        </Link>
        
        <a
          href={`mailto:${supportEmail}?subject=OPS360%20Issue%20Report`}
          className={cn(
            "flex items-center gap-2 px-2 h-7 rounded-md text-xs tracking-tight transition-all duration-150",
            "text-slate-300 hover:text-white hover:bg-white/5 border-l-[3px] border-l-transparent",
            !showLabels && "justify-center px-0"
          )}
          title={!showLabels ? "Report an Issue" : undefined}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500/80" />
          {showLabels && <span>Report an Issue</span>}
        </a>
      </div>
    </>
  )

  return (
    <div 
      onMouseEnter={() => {
        setIsHovering(true);
        setTimeout(() => {
          const header = document.querySelector('header');
          const drawer = document.querySelector('.z-40.absolute.left-0');
          const btns = document.querySelectorAll('a[href="/launchpad"]');
          fetch('/api/debug', {
            method: 'POST',
            body: JSON.stringify({
              header: header ? { 
                zIndex: window.getComputedStyle(header).zIndex, 
                rect: header.getBoundingClientRect() 
              } : null,
              drawer: drawer ? { 
                zIndex: window.getComputedStyle(drawer).zIndex, 
                rect: drawer.getBoundingClientRect() 
              } : null,
              btns: Array.from(btns).map(b => ({ 
                rect: b.getBoundingClientRect(), 
                text: b.textContent, 
                parentClass: b.parentElement?.className,
                isDrawerElement: !!b.closest('.absolute.left-0')
              }))
            })
          }).catch(console.error);
        }, 1200);
      }}
      onMouseLeave={() => setIsHovering(false)}
      className="relative z-40 h-full"
    >
      {/* ── Base Pinned Sidebar ── */}
      <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#0F172A] transition-all duration-300 group-data-[state=collapsed]:w-[60px] group-data-[state=collapsed]:max-w-[60px]">
        {renderContent(false)}
      </Sidebar>

      {/* ── Hover Overlay Drawer ── */}
      <div 
        className={cn(
          "absolute left-0 top-0 h-svh bg-[#0F172A] border-r border-white/5 shadow-2xl z-40 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,1,0.2,1)] hidden md:flex flex-col",
          isHovering ? "w-64 opacity-100 pointer-events-auto" : "w-[60px] opacity-0 pointer-events-none"
        )}
      >
        {renderContent(true)}
      </div>
    </div>
  )
}
