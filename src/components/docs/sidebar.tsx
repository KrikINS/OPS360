"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  BookOpen, 
  Package, 
  Truck, 
  ShoppingCart, 
  ArrowRightLeft, 
  Calculator, 
  Users, 
  Wrench, 
  BarChart3, 
  ShieldAlert, 
  ChevronRight,
  ShieldCheck,
} from "lucide-react"

const docsNavigation = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs", icon: BookOpen },
    ],
  },
  {
    title: "Inventory",
    items: [
      { title: "Dashboard Overview", href: "/docs/inventory", icon: Package },
    ],
  },
  {
    title: "Procurement",
    items: [
      { title: "Purchase Orders", href: "/docs/procurement", icon: Truck },
      { title: "Landed Costs & Performance", href: "/docs/procurement/landed-costs", icon: Calculator },
      { title: "Discrepancy Handling", href: "/docs/procurement/discrepancies", icon:ShieldAlert },
      { title: "Document Retention & Returns", href: "/docs/procurement/returns", icon: Truck },
    ],
  },
  {
    title: "Vendors",
    items: [
      { title: "Vendor Management", href: "/docs/vendor-management", icon: ShoppingCart },
      { title: "Compliance Status", href: "/docs/compliance", icon: ShieldCheck },
    ],
  },
  {
    title: "POS",
    items: [
      { title: "Sales & Billing", href: "/docs/pos", icon: ShoppingCart },
    ],
  },
  {
    title: "Inter-Branch Transfer",
    items: [
      { title: "Branch Operations", href: "/docs/branch-management", icon: ArrowRightLeft },
    ],
  },
  {
    title: "Accounting",
    items: [
      { title: "Payments & Invoicing", href: "/docs/accounting", icon: Calculator },
    ],
  },
  {
    title: "Staff",
    items: [
      { title: "Staff Roles", href: "/docs/staff", icon: Users },
    ],
  },
  {
    title: "Service",
    items: [
      { title: "Service Module", href: "/docs/service", icon: Wrench },
    ],
  },
  {
    title: "Analytics",
    items: [
      { title: "Reports Overview", href: "/docs/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Admin Center", href: "/docs/admin", icon: ShieldAlert },
    ],
  },
]

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-slate-50/50 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14">
      <div className="flex-1 overflow-y-auto p-6">
        <nav className="space-y-8">
          {docsNavigation.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                        isActive 
                          ? "bg-white text-[#7FD1E3] shadow-sm border font-semibold" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-[#001529]"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-[#7FD1E3]" : "text-slate-400 group-hover:text-[#001529]"
                      )} />
                      <span className="flex-1">{item.title}</span>
                      {isActive && <ChevronRight className="h-3 w-3 text-[#7FD1E3]" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t bg-slate-50/80">
        <div className="bg-[#001529] rounded-lg p-3 text-white text-xs">
          <p className="font-semibold opacity-80">Ops360 Technical Docs</p>
          <p className="mt-1 text-[10px] opacity-60">Version 1.0.4 • Stable</p>
        </div>
      </div>
    </aside>
  )
}
