"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Users, Clock, Activity, Plus, Wallet, Trash2, Eye, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useSearchParams, useRouter } from "next/navigation"
import type { StaffRow } from "@/actions/hr"
import { processPayrollRun, getPayrollRuns, getPayslips } from "@/actions/hr"
import { fmtINR } from "@/lib/utils"

import ClockWidget from "@/components/hr/ClockWidget"
import ActivityClient from "./activity/client"
import { AddOfflineStaffModal } from "@/components/hr/AddOfflineStaffModal"

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

type AttendanceRecord = {
  id: string
  date: string
  fullName?: string | null
  clockIn?: string | Date | null
  clockOut?: string | Date | null
  durationMinutes?: number | null
  clock_in?: string | Date | null
  clock_out?: string | Date | null
  duration_minutes?: number | null
}

type PayslipRow = { staffName: string; staffId?: string; gross: number; tds: number }

type PayrollRun = {
  id: string
  payPeriod: string
  paymentDate: string
  paymentMethod: string
  grossTotal: string
  tdsTotal: string
  netTotal: string
  notes: string | null
  status: string
  createdAt: Date | null
  branchId: string
  branchName: string | null
}

type Payslip = {
  id: string
  payroll_run_id: string
  staff_name: string
  staff_id: string | null
  gross: string
  tds: string
  net: string
  notes: string | null
}

const TAB_CLASS = "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md rounded-t-lg rounded-b-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider gap-2"

export default function StaffClient({
  isAdmin = false,
  isManager = false,
  staff = [],
  activities = [],
  attendance = [],
  currentUserId,
  branchId,
}: {
  isAdmin?: boolean
  isManager?: boolean
  staff: StaffRow[]
  activities: ActivityRow[]
  attendance: AttendanceRecord[]
  currentUserId: string
  branchId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "registry"

  const [modalOpen, setModalOpen] = useState(false)

  // ── Payroll form state ────────────────────────────
  const [payPeriod, setPayPeriod]           = useState('')
  const [paymentDate, setPaymentDate]       = useState('')
  const [paymentMethod, setPaymentMethod]   = useState<'cash' | 'bank'>('cash')
  const [payNotes, setPayNotes]             = useState('')
  const [payslipRows, setPayslipRows]       = useState<PayslipRow[]>([
    { staffName: '', gross: 0, tds: 0 },
  ])
  const [submitting, setSubmitting]         = useState(false)
  const [toast, setToast]                   = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── Payroll history state ─────────────────────────
  const [runs, setRuns]                     = useState<PayrollRun[]>([])
  const [runsLoaded, setRunsLoaded]         = useState(false)
  const [expandedRunId, setExpandedRunId]   = useState<string | null>(null)
  const [runPayslips, setRunPayslips]       = useState<Record<string, Payslip[]>>({})
  const [loadingSlips, setLoadingSlips]     = useState<string | null>(null)

  const loadRuns = useCallback(async () => {
    const result = await getPayrollRuns()
    if (result.success) setRuns(result.runs as unknown as PayrollRun[])
    setRunsLoaded(true)
  }, [])

  const toggleRunExpand = async (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null)
      return
    }
    setExpandedRunId(runId)
    if (!runPayslips[runId]) {
      setLoadingSlips(runId)
      const res = await getPayslips({ payrollRunId: runId })
      if (res.success) setRunPayslips(prev => ({ ...prev, [runId]: res.payslips as unknown as Payslip[] }))
      setLoadingSlips(null)
    }
  }

  const addRow = () => setPayslipRows(r => [...r, { staffName: '', gross: 0, tds: 0 }])
  const removeRow = (i: number) => setPayslipRows(r => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof PayslipRow, value: string | number) =>
    setPayslipRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  const grossTotal = payslipRows.reduce((s, r) => s + (r.gross || 0), 0)
  const tdsTotal   = payslipRows.reduce((s, r) => s + (r.tds || 0), 0)
  const netTotal   = grossTotal - tdsTotal

  const canSubmit = (
    payPeriod.trim().length > 0 &&
    paymentDate.trim().length > 0 &&
    payslipRows.some(r => r.staffName.trim() && r.gross > 0) &&
    !submitting
  )

  const handleSubmitPayroll = async () => {
    if (!canSubmit || !branchId) return
    setSubmitting(true)
    setToast(null)

    const validRows = payslipRows.filter(r => r.staffName.trim() && r.gross > 0)
    const result = await processPayrollRun({
      branchId,
      payPeriod,
      paymentDate,
      paymentMethod,
      notes: payNotes.trim() || undefined,
      payslips: validRows.map(r => ({
        staffName: r.staffName.trim(),
        gross: r.gross,
        tds: r.tds || 0,
      })),
    })

    setSubmitting(false)

    if (result.success) {
      setToast({ type: 'success', message: `Payroll processed — Net ${fmtINR(result.netTotal)} posted` })
      setPayPeriod('')
      setPaymentDate('')
      setPayNotes('')
      setPayslipRows([{ staffName: '', gross: 0, tds: 0 }])
      setPaymentMethod('cash')
      await loadRuns()
    } else {
      setToast({ type: 'error', message: result.error ?? 'Failed to process payroll' })
    }

    setTimeout(() => setToast(null), 5000)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Human Resources
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage personnel, attendance, and activity logs across all branches.' : 'Manage personnel in your branch.'}
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          router.push(`/staff?tab=${v}`)
          if (v === 'payroll' && !runsLoaded) loadRuns()
        }}
        className="w-full space-y-6"
      >
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-2">
          <TabsTrigger value="registry" className={TAB_CLASS}>
            <Users className="h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="attendance" className={TAB_CLASS}>
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="activity" className={TAB_CLASS}>
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="payroll" className={TAB_CLASS}>
              <Wallet className="h-4 w-4" />
              Payroll
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Directory ─────────────────────────────── */}
        <TabsContent value="registry" className="mt-0 outline-none">
          <Card className="shadow-md">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5" />
                Staff Members
              </CardTitle>
              {isAdmin && (
                <Button onClick={() => setModalOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Offline Staff
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {staff.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No staff members found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Branch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow key={`${member.userId}-${member.branchId ?? 'none'}`}>
                        <TableCell className="font-medium">
                          {member.fullName ?? <span className="text-muted-foreground italic">No name</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{member.role ?? '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{member.email ?? '—'}</TableCell>
                        <TableCell>
                          {member.branchName ?? <span className="text-muted-foreground italic">Unassigned</span>}
                          {member.isPrimary && (
                            <span className="ml-1 text-[10px] text-primary font-semibold uppercase">Primary</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Attendance ────────────────────────────── */}
        <TabsContent value="attendance" className="mt-0 outline-none space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <ClockWidget />
            </div>
            <div className="md:col-span-2">
              <Card className="shadow-md h-full">
                <CardHeader className="bg-muted/30 border-b py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    Historic Attendance Logs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {attendance.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No attendance records found.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Date</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((rec: AttendanceRecord) => (
                          <TableRow key={rec.id}>
                            <TableCell className="text-xs">{rec.date}</TableCell>
                            <TableCell className="font-medium text-xs">{rec.fullName ?? 'You'}</TableCell>
                            <TableCell className="text-xs">
                              {rec.clockIn || rec.clock_in
                                ? new Date((rec.clockIn ?? rec.clock_in) as string | Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {rec.clockOut || rec.clock_out
                                ? new Date((rec.clockOut ?? rec.clock_out) as string | Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {(rec.durationMinutes ?? rec.duration_minutes) != null
                                ? `${Math.floor(((rec.durationMinutes ?? rec.duration_minutes) as number) / 60)}h ${((rec.durationMinutes ?? rec.duration_minutes) as number) % 60}m`
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Activity Log ──────────────────────────── */}
        <TabsContent value="activity" className="mt-0 outline-none">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <ActivityClient
              activities={activities}
              staff={staff}
              isAdmin={isAdmin}
              isManager={isManager}
              currentUserId={currentUserId}
            />
          </div>
        </TabsContent>

        {/* ── Payroll ───────────────────────────────── */}
        {isManager && (
          <TabsContent value="payroll" className="mt-0 outline-none space-y-6">

            {/* Section A — Run Payroll form */}
            <Card className="shadow-md">
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4" />
                  Process Payroll Run
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">

                {/* Toast */}
                {toast && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${
                    toast.type === 'success'
                      ? 'bg-green-50 text-green-800 border-green-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}>
                    {toast.type === 'success'
                      ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                      : <AlertTriangle className="h-4 w-4 shrink-0" />}
                    {toast.message}
                  </div>
                )}

                {/* Header fields */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide">
                      Pay Period <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="month"
                      value={payPeriod}
                      onChange={e => setPayPeriod(e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide">
                      Payment Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide">Payment Method</Label>
                    <div className="flex gap-2">
                      {(['cash', 'bank'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`flex-1 h-9 rounded-lg border text-xs font-semibold capitalize transition-colors ${
                            paymentMethod === m
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide">Notes</Label>
                    <Textarea
                      value={payNotes}
                      onChange={e => setPayNotes(e.target.value)}
                      placeholder="Optional notes…"
                      className="h-9 text-sm resize-none min-h-[36px]"
                      rows={1}
                    />
                  </div>
                </div>

                <Separator />

                {/* Payslip rows */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-1">
                    <span className="col-span-5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Staff Name</span>
                    <span className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross (₹)</span>
                    <span className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">TDS (₹)</span>
                    <span className="col-span-1" />
                  </div>

                  {payslipRows.map((row, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-5 h-9 text-sm"
                        placeholder="e.g. Rajan Sharma"
                        value={row.staffName}
                        onChange={e => updateRow(i, 'staffName', e.target.value)}
                      />
                      <Input
                        className="col-span-3 h-9 text-sm tabular-nums"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.gross || ''}
                        onChange={e => updateRow(i, 'gross', parseFloat(e.target.value) || 0)}
                      />
                      <Input
                        className="col-span-3 h-9 text-sm tabular-nums"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.tds || ''}
                        onChange={e => updateRow(i, 'tds', parseFloat(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={payslipRows.length === 1}
                        className="col-span-1 flex items-center justify-center h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 text-xs mt-1">
                    <Plus className="h-3.5 w-3.5" />
                    Add Staff
                  </Button>
                </div>

                <Separator />

                {/* Summary + submit */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wide">Total Gross</span>
                      <p className="font-bold tabular-nums">{fmtINR(grossTotal)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wide">TDS</span>
                      <p className="font-bold tabular-nums text-amber-700">{fmtINR(tdsTotal)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wide">Net Payable</span>
                      <p className="font-bold tabular-nums text-green-700">{fmtINR(netTotal)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleSubmitPayroll}
                    disabled={!canSubmit || !branchId}
                    className="gap-2 px-6"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                    ) : (
                      <><Wallet className="h-4 w-4" /> Process Payroll</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Section B — Payroll history */}
            <Card className="shadow-md">
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Payroll History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {runs.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">
                    No payroll runs yet. Process your first payroll above.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8" />
                        <TableHead>Pay Period</TableHead>
                        <TableHead>Date</TableHead>
                        {isAdmin && <TableHead>Branch</TableHead>}
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">TDS</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map(run => (
                        <>
                          <TableRow
                            key={run.id}
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleRunExpand(run.id)}
                          >
                            <TableCell className="w-8">
                              {expandedRunId === run.id
                                ? <ChevronDown className="h-4 w-4 text-slate-400" />
                                : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            </TableCell>
                            <TableCell className="font-mono font-semibold text-sm">{run.payPeriod}</TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {new Date(run.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </TableCell>
                            {isAdmin && <TableCell className="text-sm">{run.branchName ?? '—'}</TableCell>}
                            <TableCell className="text-right font-semibold tabular-nums">{fmtINR(Number(run.grossTotal))}</TableCell>
                            <TableCell className="text-right tabular-nums text-amber-700">{fmtINR(Number(run.tdsTotal))}</TableCell>
                            <TableCell className="text-right font-bold tabular-nums text-green-700">{fmtINR(Number(run.netTotal))}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-[10px]">{run.paymentMethod}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] capitalize ${
                                  run.status === 'posted'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {run.status}
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {expandedRunId === run.id && (
                            <TableRow key={`${run.id}-expand`} className="bg-slate-50/60">
                              <TableCell colSpan={isAdmin ? 9 : 8} className="px-8 py-4">
                                {loadingSlips === run.id ? (
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading payslips…
                                  </div>
                                ) : (runPayslips[run.id] ?? []).length === 0 ? (
                                  <p className="text-sm text-slate-400">No payslips found.</p>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="grid grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 pb-1 border-b">
                                      <span>Staff Name</span>
                                      <span className="text-right">Gross</span>
                                      <span className="text-right">TDS</span>
                                      <span className="text-right">Net</span>
                                    </div>
                                    {(runPayslips[run.id] ?? []).map(slip => (
                                      <div key={slip.id} className="grid grid-cols-4 gap-2 text-sm py-1">
                                        <span className="font-medium">{slip.staff_name}</span>
                                        <span className="text-right tabular-nums">{fmtINR(Number(slip.gross))}</span>
                                        <span className="text-right tabular-nums text-amber-700">{fmtINR(Number(slip.tds))}</span>
                                        <span className="text-right tabular-nums font-semibold text-green-700">{fmtINR(Number(slip.net))}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {isAdmin && <AddOfflineStaffModal open={modalOpen} onOpenChange={setModalOpen} />}
    </div>
  )
}
