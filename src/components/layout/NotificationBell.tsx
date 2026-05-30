"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import Link from "next/link"
import { getPendingApprovalsAction } from "@/app/actions/notifications"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NotificationBell() {
  const [approvals, setApprovals] = useState<Array<{ id: string, name: string, status: string | null }>>([])

  useEffect(() => {
    const fetchApprovals = async () => {
      const data = await getPendingApprovalsAction()
      setApprovals(data)
    }
    fetchApprovals()
    
    // Optional: Set up an interval to poll for new approvals
    const interval = setInterval(fetchApprovals, 60000) // Every minute
    return () => clearInterval(interval)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#001529] transition-all outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <Bell className="h-5 w-5" />
        {approvals.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {approvals.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="font-bold flex items-center justify-between">
          <span>Notifications</span>
          {approvals.length > 0 && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {approvals.length} new
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
          {approvals.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No pending approvals. You're all caught up!
            </div>
          ) : (
            approvals.map(vendor => (
              <DropdownMenuItem key={vendor.id} className="cursor-pointer p-0 focus:bg-slate-50 border-b last:border-0">
                <Link href="/vendors" className="flex flex-col gap-1 w-full p-3 outline-none">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-semibold text-sm">Vendor Approval Required</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-4 truncate w-full">
                    {vendor.name} is awaiting approval.
                  </span>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
