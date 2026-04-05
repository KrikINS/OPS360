"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UserNav } from "@/components/user-nav"
import { PosProvider } from "@/context/PosContext"
import { GlobalProvider } from "@/context/GlobalContext"
import Link from "next/link"
import { HelpCircle } from "lucide-react"

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
      <SidebarProvider defaultOpen={false}>
        <AppSidebar permissions={permissions} profile={profile} />
        <SidebarInset className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out">
        <header className="h-14 flex items-center justify-between px-5 border-b bg-white shadow-sm gap-4 shrink-0 z-50">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-slate-500 hover:text-primary transition-colors" />
            <div className="h-5 w-[1px] bg-border" />
            <div className="font-semibold text-sm text-foreground tracking-tight">
              Ops360 <span className="text-muted-foreground font-normal">- {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/docs" 
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#001529] transition-all"
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
