"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Loader2, CheckCircle2, AlertTriangle, XCircle, Plus } from "lucide-react"
import { getLeaveTypes, getMyLeaveBalance, submitLeaveRequest, getLeaveRequests, approveLeaveRequest } from "@/actions/hr"

export function LeaveManagementTab({ isAdmin, isManager, currentUserId }: { isAdmin: boolean; isManager: boolean; currentUserId: string }) {
  const [balances, setBalances] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [balRes, reqRes, typeRes] = await Promise.all([
      getMyLeaveBalance(),
      getLeaveRequests(),
      getLeaveTypes(),
    ])
    if (balRes.success) setBalances(balRes.balances)
    if (reqRes.success) setRequests(reqRes.requests)
    if (typeRes.success) setLeaveTypes(typeRes.types)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async () => {
    if (!form.leaveTypeId || !form.fromDate || !form.toDate) return
    setSubmitting(true)
    const res = await submitLeaveRequest(form)
    setSubmitting(false)
    if (res.success) {
      setToast({ type: 'success', message: 'Leave request submitted successfully.' })
      setFormOpen(false)
      setForm({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' })
      loadData()
    } else {
      setToast({ type: 'error', message: res.error ?? 'Failed to submit' })
    }
    setTimeout(() => setToast(null), 4000)
  }

  const handleApprove = async (id: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('Enter rejection reason:') : undefined
    if (action === 'reject' && reason === null) return
    
    const res = await approveLeaveRequest({ requestId: id, action, rejectionReason: reason ?? undefined })
    if (res.success) {
      setToast({ type: 'success', message: `Request ${action}d.` })
      loadData()
    } else {
      setToast({ type: 'error', message: res.error ?? 'Failed to process request.' })
    }
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.message}
        </div>
      )}

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : balances.length > 0 ? (
          balances.map(b => (
            <Card key={b.leave_type_id} className="shadow-sm border-t-4 border-t-[#001529]">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{b.name}</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black">{b.remaining}</p>
                  <p className="text-xs text-slate-400 font-medium pb-1">/ {b.allocated} remaining</p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-[#7FD1E3] h-full" style={{ width: `${Math.min(100, (b.used / (b.allocated || 1)) * 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-4 text-center text-sm text-slate-500">No leave balances found.</div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)} className="gap-2 bg-[#001529] hover:bg-[#002a52] text-white">
          <Plus className="h-4 w-4" />
          Apply for Leave
        </Button>
      </div>

      {formOpen && (
        <Card className="shadow-md">
          <CardHeader className="bg-slate-50 border-b py-3">
            <CardTitle className="text-sm">New Leave Request</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide">Leave Type</Label>
                <Select value={form.leaveTypeId} onValueChange={v => setForm({ ...form, leaveTypeId: v || '' })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide">From Date</Label>
                <Input type="date" value={form.fromDate} onChange={e => setForm({ ...form, fromDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide">To Date</Label>
                <Input type="date" value={form.toDate} onChange={e => setForm({ ...form, toDate: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide">Reason</Label>
                <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.leaveTypeId || !form.fromDate || !form.toDate}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md border-t-4 border-t-[#001529]">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{isAdmin || isManager ? 'All Leave Requests' : 'My Leave Requests'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Employee</TableHead>
                <TableHead className="font-bold">Leave Type</TableHead>
                <TableHead className="font-bold">Duration</TableHead>
                <TableHead className="font-bold">Reason</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                {(isAdmin || isManager) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => (
                <TableRow key={req.id} className="hover:bg-muted/20">
                  <TableCell className="text-xs">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium text-xs">{req.employee_name}</TableCell>
                  <TableCell className="text-xs">{req.leave_type_name}</TableCell>
                  <TableCell className="text-xs">{new Date(req.from_date).toLocaleDateString()} to {new Date(req.to_date).toLocaleDateString()} ({req.days} days)</TableCell>
                  <TableCell className="text-xs truncate max-w-[150px]" title={req.reason}>{req.reason || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] capitalize ${req.status === 'approved' ? 'bg-green-50 text-green-700' : req.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      {req.status}
                    </Badge>
                    {req.status === 'rejected' && req.rejection_reason && (
                      <p className="text-[9px] text-red-500 mt-1" title={req.rejection_reason}>Reason: {req.rejection_reason}</p>
                    )}
                  </TableCell>
                  {(isAdmin || isManager) && (
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(req.id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleApprove(req.id, 'reject')}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-slate-500 text-sm">No leave requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
