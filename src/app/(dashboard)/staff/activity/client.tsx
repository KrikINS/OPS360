"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, Activity, Users, BarChart2 } from "lucide-react"
import type { StaffRow } from "@/actions/hr"

type ActivityRow = {
  id: string
  timestamp: string
  userId: string | null
  userName: string
  userRole: string
  branchId: string | null
  module: string
  actionType: string
  description: string
  referenceId: string | null
}

const MODULE_COLORS: Record<string, string> = {
  POS:         'bg-blue-100 text-blue-800 border-blue-200',
  Inventory:   'bg-orange-100 text-orange-800 border-orange-200',
  Procurement: 'bg-purple-100 text-purple-800 border-purple-200',
  Transfers:   'bg-teal-100 text-teal-800 border-teal-200',
  Vendors:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  HR:          'bg-green-100 text-green-800 border-green-200',
}

const MODULES = ['All Modules', 'POS', 'Inventory', 'Procurement', 'Transfers', 'Vendors', 'HR']
const PAGE_SIZE = 25

function fmtTimestamp(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function ActivityClient({
  activities,
  staff,
  isAdmin,
  isManager,
  currentUserId,
}: {
  activities: ActivityRow[]
  staff: StaffRow[]
  isAdmin: boolean
  isManager: boolean
  currentUserId: string
}) {
  const today = new Date().toISOString().split('T')[0]

  const [selectedUser, setSelectedUser] = useState('')
  const [selectedModule, setSelectedModule] = useState('All Modules')
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [toDate, setToDate] = useState(today)
  const [page, setPage] = useState(0)

  // Client-side filtering (data already fetched server-side for last 30 days)
  const filtered = useMemo(() => {
    return activities.filter(a => {
      const aDate = a.timestamp ? a.timestamp.split('T')[0] : ''
      const inDate = aDate >= fromDate && aDate <= toDate
      const inModule = selectedModule === 'All Modules' || a.module === selectedModule
      const inUser = !selectedUser || a.userId === selectedUser
      return inDate && inModule && inUser
    })
  }, [activities, fromDate, toDate, selectedModule, selectedUser])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Summary stats
  const activeToday = useMemo(() => {
    const ids = new Set(
      activities
        .filter(a => a.timestamp?.startsWith(today))
        .map(a => a.userId)
        .filter(Boolean)
    )
    return ids.size
  }, [activities, today])

  const mostActiveModule = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(a => { counts[a.module] = (counts[a.module] ?? 0) + 1 })
    return Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] ?? '—'
  }, [filtered])

  const mostActiveStaff = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {}
    filtered.forEach(a => {
      if (!a.userId) return
      if (!counts[a.userId]) counts[a.userId] = { name: a.userName, count: 0 }
      counts[a.userId].count++
    })
    return Object.values(counts).sort((x, y) => y.count - x.count)[0]?.name ?? '—'
  }, [filtered])

  // Deduplicated staff list for dropdown (one entry per user)
  const staffOptions = useMemo(() => {
    const seen = new Set<string>()
    return staff.filter(s => {
      if (seen.has(s.userId)) return false
      seen.add(s.userId)
      return true
    })
  }, [staff])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Activity Log
        </h1>
        <p className="text-muted-foreground mt-1">
          All employee actions across every module
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Actions',      value: filtered.length,  icon: <Activity className="h-4 w-4" />,  color: 'text-primary' },
          { label: 'Active Today',        value: activeToday,      icon: <Users className="h-4 w-4" />,     color: 'text-green-600' },
          { label: 'Top Module',          value: mostActiveModule, icon: <BarChart2 className="h-4 w-4" />, color: 'text-purple-600' },
          { label: 'Most Active Staff',   value: mostActiveStaff,  icon: <Clock className="h-4 w-4" />,     color: 'text-orange-600' },
        ].map(card => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <span className={`mt-0.5 ${card.color}`}>{card.icon}</span>
              <div className="min-w-0">
                <div className={`text-xl font-bold truncate ${card.color}`}>{card.value}</div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end bg-muted/30 border rounded-lg p-4">
        {(isManager || isAdmin) && staffOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Staff Member</label>
            <select
              value={selectedUser}
              onChange={e => { setSelectedUser(e.target.value); setPage(0) }}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
            >
              <option value="">All Staff</option>
              {staffOptions.map(s => (
                <option key={s.userId} value={s.userId}>
                  {s.fullName ?? s.email ?? s.userId}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Module</label>
          <select
            value={selectedModule}
            onChange={e => { setSelectedModule(e.target.value); setPage(0) }}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            {MODULES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
          <Input type="date" value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(0) }}
            className="w-36 h-8 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
          <Input type="date" value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(0) }}
            className="w-36 h-8 text-sm" />
        </div>
      </div>

      {/* Activity table */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30 border-b py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} actions
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {paged.length === 0 ? (
            <div className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
              <Clock className="h-10 w-10 opacity-30" />
              <div className="text-base font-medium">No activity found</div>
              <div className="text-sm">Try adjusting your filters or date range</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-36">Timestamp</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="w-28">Module</TableHead>
                  <TableHead className="w-32">Action</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(activity => (
                  <TableRow key={`${activity.id}-${activity.actionType}`}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtTimestamp(activity.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{activity.userName}</div>
                      {activity.userRole && (
                        <div className="text-xs text-muted-foreground capitalize">{activity.userRole}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={MODULE_COLORS[activity.module] ?? 'bg-slate-100 text-slate-700'}
                      >
                        {activity.module}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {activity.actionType}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {activity.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
