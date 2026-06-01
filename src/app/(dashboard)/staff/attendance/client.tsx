"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Users, Clock, AlertTriangle, CheckCircle2 } from "lucide-react"
import { correctAttendance } from "@/actions/hr"

type AttendanceRecord = {
  id: string
  userId: string
  fullName: string | null
  email: string | null
  date: string
  clockIn: Date
  clockOut: Date | null
  durationMinutes: number | null
  notes: string | null
}

type Branch = { id: string; name: string }

function getStatus(record: AttendanceRecord, today: string) {
  if (!record.clockOut && record.date === today) return 'on-shift'
  if (!record.clockOut && record.date !== today) return 'missing-out'
  if ((record.durationMinutes ?? 0) > 720) return 'long-shift'
  return 'complete'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    'on-shift':    { label: 'On Shift',     className: 'bg-green-100 text-green-800 border-green-200' },
    'missing-out': { label: 'Missing Out',  className: 'bg-red-100 text-red-800 border-red-200' },
    'long-shift':  { label: 'Long Shift',   className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'complete':    { label: 'Complete',     className: 'bg-slate-100 text-slate-600 border-slate-200' },
  }
  const { label, className } = map[status] ?? map['complete']
  return <Badge variant="outline" className={className}>{label}</Badge>
}

function fmt(dt: Date | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDuration(mins: number | null) {
  if (mins == null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export default function AttendanceClient({
  records,
  branches,
  isAdmin,
  currentBranchId,
}: {
  records: AttendanceRecord[]
  branches: Branch[]
  isAdmin: boolean
  currentBranchId: string
}) {
  const today = new Date().toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [toDate, setToDate] = useState(today)
  const [selectedBranch, setSelectedBranch] = useState(currentBranchId)

  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null)
  const [newClockIn, setNewClockIn] = useState('')
  const [newClockOut, setNewClockOut] = useState('')
  const [reason, setReason] = useState('')
  const [correctionError, setCorrectionError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = records.filter(r => {
    const inRange = r.date >= fromDate && r.date <= toDate
    const inBranch = !selectedBranch || true // branch already filtered server-side; client filter is cosmetic
    return inRange && inBranch
  })

  const presentToday = filtered.filter(r => r.date === today).length
  const totalHours = Math.round(
    filtered.reduce((s, r) => s + (r.durationMinutes ?? 0), 0) / 60 * 10
  ) / 10
  const stillIn = filtered.filter(r => !r.clockOut).length
  const needsCorrection = filtered.filter(
    r => (r.durationMinutes ?? 0) > 720 || (!r.clockOut && r.date !== today)
  ).length

  function openCorrection(record: AttendanceRecord) {
    setCorrecting(record)
    setNewClockIn(new Date(record.clockIn).toISOString().slice(0, 16))
    setNewClockOut(record.clockOut ? new Date(record.clockOut).toISOString().slice(0, 16) : '')
    setReason('')
    setCorrectionError('')
  }

  function submitCorrection() {
    if (!correcting) return
    setCorrectionError('')
    startTransition(async () => {
      const result = await correctAttendance({
        attendanceId: correcting.id,
        newClockIn,
        newClockOut: newClockOut || undefined,
        reason,
      })
      if (!result.success) {
        setCorrectionError(result.error)
        return
      }
      setCorrecting(null)
    })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Attendance
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'All branches' : 'Your branch'} · Last 7 days
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present Today',     value: presentToday,   icon: <Users className="h-4 w-4" />,         color: 'text-green-600' },
          { label: 'Hours This Week',   value: `${totalHours}h`, icon: <Clock className="h-4 w-4" />,       color: 'text-blue-600' },
          { label: 'Still Clocked In',  value: stillIn,        icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-yellow-600' },
          { label: 'Needs Correction',  value: needsCorrection,icon: <AlertTriangle className="h-4 w-4" />,color: 'text-red-600' },
        ].map(card => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <span className={card.color}>{card.icon}</span>
              <div>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36 h-8 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36 h-8 text-sm" />
        </div>
        {isAdmin && branches.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Branch</label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30 border-b py-3">
          <CardTitle className="text-base font-semibold">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No records in this range.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(record => {
                  const status = getStatus(record, today)
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm font-medium">{record.date}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{record.fullName ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{record.email ?? ''}</div>
                      </TableCell>
                      <TableCell className="text-sm">{fmt(record.clockIn)}</TableCell>
                      <TableCell className="text-sm">{fmt(record.clockOut)}</TableCell>
                      <TableCell className="text-sm">{fmtDuration(record.durationMinutes)}</TableCell>
                      <TableCell><StatusBadge status={status} /></TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => openCorrection(record)}
                        >
                          Correct
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Correction modal */}
      <Dialog open={!!correcting} onOpenChange={open => { if (!open) setCorrecting(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Correct Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Clock-In</label>
              <Input
                type="datetime-local"
                value={newClockIn}
                onChange={e => setNewClockIn(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Clock-Out (optional)</label>
              <Input
                type="datetime-local"
                value={newClockOut}
                onChange={e => setNewClockOut(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason <span className="text-red-500">*</span></label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Why is this correction needed?"
                className="text-sm resize-none"
                rows={3}
              />
            </div>
            {correctionError && (
              <p className="text-sm text-red-600">{correctionError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrecting(null)}>Cancel</Button>
            <Button onClick={submitCorrection} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Correction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
