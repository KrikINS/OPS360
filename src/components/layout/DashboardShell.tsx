"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UserNav } from "@/components/user-nav"
import { PosProvider } from "@/context/PosContext"
import { GlobalProvider } from "@/context/GlobalContext"
import Link from "next/link"
import { HelpCircle, Receipt, ShoppingCart, ShieldCheck } from "lucide-react"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { Button } from "@/components/ui/button"

interface DashboardShellProps {
  children: React.ReactNode
  profile: {
    id: string
    full_name: string
    email: string
    role: string
    branch_id: string
    branch_name?: string
  }
  permissions: Record<string, boolean>
}

export function DashboardShell({ children, profile, permissions }: DashboardShellProps) {
  const pathname = usePathname()
  const isPos = pathname === '/pos'
  const isAdmin = ['admin/owner', 'admin', 'owner', 'super_admin'].includes(
    (profile.role ?? '').toLowerCase().trim()
  )

  if (isPos) {
    return (
      <PosProvider initialBranchId={profile.branch_id}>
        <div className="flex-1 overflow-hidden h-screen flex flex-col bg-slate-900">
          {children}
        </div>
      </PosProvider>
    )
  }

  return (
    <GlobalProvider initialBranch={{ id: profile.branch_id, name: profile.branch_name || "Unknown Branch" }}>
      <SidebarProvider>
        <AppSidebar permissions={permissions} profile={profile} />
        <SidebarInset className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out">
          <header className="h-14 flex items-center justify-between px-5 border-b border-white/10 bg-[#001529] text-white gap-4 shrink-0 z-50">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-white/70 hover:text-white transition-colors" />
              <div className="h-5 w-[1px] bg-white/20" />
              <div className="font-bold text-sm tracking-tight text-[#7FD1E3]">
                OPS360 ERP{' '}
                <span className="text-white/60 font-normal">
                  - {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* System Administration link */}
              {isAdmin && (
                <Button
                  render={<Link href="/admin" />}
                  size="sm"
                  className="bg-[#7FD1E3] hover:bg-[#6BC1D3] text-[#001529] gap-1.5 shadow-sm font-semibold"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    System Administration
                  </span>
                </Button>
              )}
              {/* Finance Dashboard link */}
              {(isAdmin || permissions?.finance === true) && (
                <Button
                  render={<Link href="/accounting?tab=dashboard" />}
                  size="sm"
                  className="bg-[#7FD1E3] hover:bg-[#6BC1D3] text-[#001529] gap-1.5 shadow-sm font-semibold"
                >
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Finance
                  </span>
                </Button>
              )}
              {(isAdmin || permissions?.pos === true) && (
                <Button
                  render={<Link href="/pos" />}
                  size="sm"
                  className="bg-[#7FD1E3] hover:bg-[#6BC1D3] text-[#001529] gap-2 shadow-sm font-semibold"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">POS Terminal</span>
                </Button>
              )}
              <NotificationBell />
              <Link
                href="/docs"
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all"
                title="Help & Documentation"
              >
                <HelpCircle className="h-5 w-5" />
              </Link>
              <UserNav profile={profile} />
            </div>
          </header>
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            <main className="flex-1 overflow-y-auto pb-6 scrollbar-thin scrollbar-thumb-slate-200">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </GlobalProvider>
  )
}
