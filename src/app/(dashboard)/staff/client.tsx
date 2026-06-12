"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollableTable } from "@/components/ui/scrollable-table"
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
import { processPayrollRun, getPayrollRuns, getPayslips, getEmployeesWithStructures, setSalaryStructure, upsertEmployeeDetails } from "@/actions/hr"
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

type PayslipRow = {
  staffName:        string
  staffId?:         string
  structureId?:     string
  basic:            number
  hra:              number
  gross:            number
  pf_employee:      number
  professional_tax: number
  tds:              number
  net:              number
}

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

const TAB_CLASS = "data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:shadow-md rounded-t-lg rounded-b-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider gap-2"

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
  const [payslipRows, setPayslipRows] = useState<PayslipRow[]>([
    { staffName: '', staffId: undefined, structureId: undefined, basic: 0, hra: 0, gross: 0, pf_employee: 0, professional_tax: 0, tds: 0, net: 0 },
  ])
  const [submitting, setSubmitting]         = useState(false)
  const [toast, setToast]                   = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── Payroll history state ─────────────────────────
  const [runs, setRuns]                     = useState<PayrollRun[]>([])
  const [runsLoaded, setRunsLoaded]         = useState(false)
  const [expandedRunId, setExpandedRunId]   = useState<string | null>(null)
  const [runPayslips, setRunPayslips]       = useState<Record<string, Payslip[]>>({})
  const [loadingSlips, setLoadingSlips]     = useState<string | null>(null)

  const [employees, setEmployees] = useState<any[]>([])
  const [salaryDrawerOpen, setSalaryDrawerOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [salaryForm, setSalaryForm] = useState({ 
    basic: '', hra: '', pfApplicable: false, tdsMonthly: '', effectiveFrom: '',
    designation: '', department: '', dateOfJoining: ''
  })
  const [salarySubmitting, setSalarySubmitting] = useState(false)
  const [salaryToast, setSalaryToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const loadEmployees = async () => {
    const result = await getEmployeesWithStructures()
    if (result.success) setEmployees(result.employees)
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const openSalaryDrawer = (emp: any) => {
    setSelectedEmployee(emp)
    setSalaryForm({
      basic:         emp.basic ? String(Number(emp.basic)) : '',
      hra:           emp.hra   ? String(Number(emp.hra))   : '',
      pfApplicable:  emp.pf_applicable ?? false,
      tdsMonthly:    emp.tds_monthly ? String(Number(emp.tds_monthly)) : '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      designation:   emp.designation || '',
      department:    emp.department || '',
      dateOfJoining: emp.date_of_joining || '',
    })
    setSalaryDrawerOpen(true)
  }

  const handleSalarySubmit = async () => {
    if (!selectedEmployee || !salaryForm.basic || !salaryForm.effectiveFrom) return
    setSalarySubmitting(true)

    await upsertEmployeeDetails({
      employeeId:    selectedEmployee.id,
      designation:   salaryForm.designation || undefined,
      department:    salaryForm.department || undefined,
      dateOfJoining: salaryForm.dateOfJoining || undefined,
    })

    const result = await setSalaryStructure({
      employeeId:    selectedEmployee.id,
      effectiveFrom: salaryForm.effectiveFrom,
      basic:         parseFloat(salaryForm.basic),
      hra:           parseFloat(salaryForm.hra || '0'),
      pfApplicable:  salaryForm.pfApplicable,
      tdsMonthly:    parseFloat(salaryForm.tdsMonthly || '0'),
    })
    setSalarySubmitting(false)
    if (result.success) {
      setSalaryToast({ type: 'success', message: 'Profile & Salary structure saved' })
      setSalaryDrawerOpen(false)
      await loadEmployees()
    } else {
      setSalaryToast({ type: 'error', message: result.error ?? 'Failed to save' })
    }
    setTimeout(() => setSalaryToast(null), 4000)
  }

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

  const [autoFilling, setAutoFilling] = useState(false)

  const handleAutoFill = async () => {
    setAutoFilling(true)
    const result = await getEmployeesWithStructures(branchId ? { branchId } : undefined)
    setAutoFilling(false)
    if (!result.success) return
    const withStructures = result.employees.filter((e: any) => e.basic)
    if (withStructures.length === 0) {
      alert('No employees have salary structures defined. Set them in the Salary Structures tab first.')
      return
    }
    setPayslipRows(withStructures.map((e: any) => ({
      staffName:        `${e.first_name} ${e.last_name}`.trim(),
      staffId:          e.id,
      structureId:      e.structure_id,
      basic:            Number(e.basic),
      hra:              Number(e.hra ?? 0),
      gross:            Number(e.gross),
      pf_employee:      Number(e.pf_employee ?? 0),
      professional_tax: Number(e.professional_tax ?? 0),
      tds:              Number(e.tds_monthly ?? 0),
      net:              Number(e.net),
    })))
  }

  const addRow = () => setPayslipRows(r => [...r, { staffName: '', staffId: undefined, structureId: undefined, basic: 0, hra: 0, gross: 0, pf_employee: 0, professional_tax: 0, tds: 0, net: 0 }])
  const removeRow = (i: number) => setPayslipRows(r => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof PayslipRow, value: string | number) =>
    setPayslipRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  const grossTotal = payslipRows.reduce((s, r) => s + (r.gross || 0), 0)
  const tdsTotal   = payslipRows.reduce((s, r) => s + (r.tds || 0), 0)
  const netTotal   = payslipRows.reduce((s, r) => s + (r.net || 0), 0)

  const canSubmit =
    !!payPeriod && !!paymentDate && !!branchId &&
    payslipRows.some(r => r.staffName.trim() && r.gross > 0) &&
    !submitting

  const handleSubmitPayroll = async () => {
    if (!canSubmit || !branchId) return
    setSubmitting(true)
    setToast(null)

    const validRows = payslipRows.filter(r => r.staffName.trim() && r.gross > 0)
    const result = await processPayrollRun({
      branchId:      branchId!,
      payPeriod,
      paymentDate,
      paymentMethod,
      notes:         payNotes.trim() || undefined,
      payslips:      validRows.map(r => ({
        staffName:        r.staffName.trim(),
        staffId:          r.staffId,
        structureId:      r.structureId,
        basic:            r.basic,
        hra:              r.hra,
        gross:            r.gross,
        pf_employee:      r.pf_employee,
        professional_tax: r.professional_tax,
        tds:              r.tds,
        net:              r.net,
      })),
    })

    setSubmitting(false)

    if (result.success) {
      setToast({ type: 'success', message: `Payroll processed — Net ${fmtINR(result.netTotal)} posted` })
      setPayPeriod('')
      setPaymentDate('')
      setPayNotes('')
      setPayslipRows([{ staffName: '', staffId: undefined, structureId: undefined, basic: 0, hra: 0, gross: 0, pf_employee: 0, professional_tax: 0, tds: 0, net: 0 }])
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
          {isManager && (
            <TabsTrigger value="salary" className={TAB_CLASS}>
              <Wallet className="h-4 w-4" />
              Salary Structures
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Directory ─────────────────────────────── */}
        <TabsContent value="registry" className="mt-0 outline-none">
          <Card className="shadow-md border-t-4 border-t-[#001529]">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Staff Members</CardTitle>
                <CardDescription>Browse and manage all registered employees and staff.</CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={() => setModalOpen(true)} size="sm" className="gap-2 bg-[#001529] hover:bg-[#002a52] text-white">
                  <Plus className="h-4 w-4" />
                  Add Offline Staff
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {staff.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No staff members found.</div>
              ) : (
                <ScrollableTable minWidth="1000px">
                  <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Role</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">Branch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow key={`${member.userId}-${member.branchId ?? 'none'}`} className="hover:bg-muted/20 transition-colors group">
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
              </ScrollableTable>
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
              <Card className="shadow-md h-full border-t-4 border-t-[#001529]">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Historic Attendance Logs</CardTitle>
                    <CardDescription>View past attendance records for all staff.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {attendance.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No attendance records found.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-bold">Date</TableHead>
                          <TableHead className="font-bold">Staff</TableHead>
                          <TableHead className="font-bold">Clock In</TableHead>
                          <TableHead className="font-bold">Clock Out</TableHead>
                          <TableHead className="font-bold">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((rec: AttendanceRecord) => (
                          <TableRow key={rec.id} className="hover:bg-muted/20 transition-colors group">
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff Payslips</span>
                    <Button variant="outline" size="sm" className="gap-2 text-xs h-8" onClick={handleAutoFill} disabled={autoFilling}>
                      {autoFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : '⚡'}
                      Auto-fill from Salary Structures
                    </Button>
                  </div>

                  {payslipRows.map((row, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Input className="flex-1 h-9 text-sm" placeholder="Staff name" value={row.staffName}
                          onChange={e => updateRow(i, 'staffName', e.target.value)} />
                        <button type="button" onClick={() => removeRow(i)} disabled={payslipRows.length === 1}
                          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 disabled:opacity-30">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {row.structureId ? (
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          <div className="text-center"><p className="text-slate-400 mb-0.5">Basic</p><p className="font-bold tabular-nums">{fmtINR(row.basic)}</p></div>
                          <div className="text-center"><p className="text-slate-400 mb-0.5">HRA</p><p className="font-bold tabular-nums">{fmtINR(row.hra)}</p></div>
                          <div className="text-center"><p className="text-slate-400 mb-0.5">PF</p><p className="font-bold tabular-nums text-amber-700">-{fmtINR(row.pf_employee)}</p></div>
                          <div className="text-center"><p className="text-slate-400 mb-0.5">Prof Tax</p><p className="font-bold tabular-nums text-amber-700">-{fmtINR(row.professional_tax)}</p></div>
                          <div className="text-center"><p className="text-slate-400 mb-0.5">Net Pay</p><p className="font-bold tabular-nums text-green-700">{fmtINR(row.net)}</p></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gross (₹)</label>
                            <Input type="number" min={0} className="h-8 text-sm" value={row.gross || ''}
                              onChange={e => { const g = parseFloat(e.target.value) || 0; setPayslipRows(r => r.map((x, idx) => idx === i ? { ...x, gross: g, net: g - x.tds } : x)) }} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TDS (₹)</label>
                            <Input type="number" min={0} className="h-8 text-sm" value={row.tds || ''}
                              onChange={e => { const t = parseFloat(e.target.value) || 0; setPayslipRows(r => r.map((x, idx) => idx === i ? { ...x, tds: t, net: x.gross - t } : x)) }} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Net Pay (₹)</label>
                            <Input type="number" readOnly className="h-8 text-sm bg-slate-100" value={row.net || ''} />
                          </div>
                        </div>
                      )}
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

        {isManager && (
          <TabsContent value="salary" className="mt-0 outline-none space-y-6">
            {salaryToast && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${salaryToast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                {salaryToast.message}
              </div>
            )}
            <Card className="shadow-md border-t-4 border-t-[#001529]">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Employee Salary Structures</CardTitle>
                  <CardDescription>Manage staff designations and fixed salary components.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {employees.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No active employees found. Add employees via Staff Directory first.</div>
                ) : (
                  <ScrollableTable minWidth="900px">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-bold">Employee</TableHead>
                          <TableHead className="font-bold">Designation</TableHead>
                          <TableHead className="text-right font-bold">Basic (₹)</TableHead>
                          <TableHead className="text-right font-bold">HRA (₹)</TableHead>
                          <TableHead className="text-right font-bold">Gross (₹)</TableHead>
                          <TableHead className="text-right font-bold">Deductions (₹)</TableHead>
                          <TableHead className="text-right font-bold">Net Pay (₹)</TableHead>
                          <TableHead className="text-right font-bold">Effective From</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp) => (
                          <TableRow key={emp.id} className="hover:bg-muted/20 transition-colors group">
                            <TableCell className="font-medium">{emp.first_name} {emp.last_name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{emp.designation ?? '—'}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{emp.basic ? fmtINR(Number(emp.basic)) : <span className="text-muted-foreground italic text-xs">Not set</span>}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{emp.hra ? fmtINR(Number(emp.hra)) : '—'}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-semibold">{emp.gross ? fmtINR(Number(emp.gross)) : '—'}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm text-amber-700">{emp.basic ? fmtINR(Number(emp.pf_employee ?? 0) + Number(emp.professional_tax ?? 0) + Number(emp.tds_monthly ?? 0)) : '—'}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-bold text-green-700">{emp.net ? fmtINR(Number(emp.net)) : '—'}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{emp.effective_from ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openSalaryDrawer(emp)}>
                                {emp.basic ? 'Edit' : 'Set Salary'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollableTable>
                )}
              </CardContent>
            </Card>

            {/* Salary structure drawer */}
            {salaryDrawerOpen && selectedEmployee && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSalaryDrawerOpen(false)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
                  <div>
                    <h2 className="text-lg font-bold">Edit Profile & Salary</h2>
                    <p className="text-sm text-muted-foreground">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                  </div>
                  
                  <div className="space-y-3 border-b pb-4">
                    <h3 className="text-sm font-semibold uppercase text-slate-500">Employee Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide">Designation</Label>
                        <Input placeholder="e.g. Manager" value={salaryForm.designation} onChange={e => setSalaryForm(f => ({ ...f, designation: e.target.value }))} className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide">Department</Label>
                        <Input placeholder="e.g. Sales" value={salaryForm.department} onChange={e => setSalaryForm(f => ({ ...f, department: e.target.value }))} className="h-9" />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide">Date of Joining</Label>
                        <Input type="date" value={salaryForm.dateOfJoining} onChange={e => setSalaryForm(f => ({ ...f, dateOfJoining: e.target.value }))} className="h-9" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase text-slate-500">Salary Structure</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide">Basic Salary (₹) *</Label>
                        <Input type="number" min={0} placeholder="e.g. 20000" value={salaryForm.basic} onChange={e => setSalaryForm(f => ({ ...f, basic: e.target.value }))} className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide">HRA (₹)</Label>
                        <Input type="number" min={0} placeholder="e.g. 8000" value={salaryForm.hra} onChange={e => setSalaryForm(f => ({ ...f, hra: e.target.value }))} className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide">TDS Monthly (₹)</Label>
                        <Input type="number" min={0} placeholder="0" value={salaryForm.tdsMonthly} onChange={e => setSalaryForm(f => ({ ...f, tdsMonthly: e.target.value }))} className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide">Effective From *</Label>
                        <Input type="date" value={salaryForm.effectiveFrom} onChange={e => setSalaryForm(f => ({ ...f, effectiveFrom: e.target.value }))} className="h-9" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="pf" checked={salaryForm.pfApplicable} onChange={e => setSalaryForm(f => ({ ...f, pfApplicable: e.target.checked }))} className="h-4 w-4 rounded" />
                    <Label htmlFor="pf" className="text-sm cursor-pointer">PF Applicable (12% of Basic, max ₹1,800/month)</Label>
                  </div>
                  {salaryForm.basic && (
                    <div className="rounded-lg bg-slate-50 border p-3 text-xs space-y-1.5">
                      <p className="font-semibold text-slate-600 uppercase tracking-wide mb-2">Preview</p>
                      {(() => {
                        const basic = parseFloat(salaryForm.basic || '0')
                        const hra   = parseFloat(salaryForm.hra || '0')
                        const gross = basic + hra
                        const pf    = salaryForm.pfApplicable ? Math.min(Math.round(basic * 0.12), 1800) : 0
                        const pt    = gross > 15000 ? 200 : 0
                        const tds   = parseFloat(salaryForm.tdsMonthly || '0')
                        const net   = gross - pf - pt - tds
                        return (
                          <>
                            <div className="flex justify-between"><span className="text-slate-500">Gross (Basic + HRA)</span><span className="font-bold">{fmtINR(gross)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">PF Employee</span><span className="text-amber-700">-{fmtINR(pf)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Professional Tax</span><span className="text-amber-700">-{fmtINR(pt)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">TDS</span><span className="text-amber-700">-{fmtINR(tds)}</span></div>
                            <div className="flex justify-between border-t pt-1.5 mt-1"><span className="font-semibold">Net Pay</span><span className="font-bold text-green-700">{fmtINR(net)}</span></div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setSalaryDrawerOpen(false)}>Cancel</Button>
                    <Button className="flex-1" onClick={handleSalarySubmit} disabled={salarySubmitting || !salaryForm.basic || !salaryForm.effectiveFrom}>
                      {salarySubmitting ? 'Saving…' : 'Save Structure'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {isAdmin && <AddOfflineStaffModal open={modalOpen} onOpenChange={setModalOpen} />}
    </div>
  )
}
