"use client"
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Printer, CheckCircle2, Clock, Wrench, AlertTriangle } from 'lucide-react'
import { updateJobStatus, completeServiceJob } from '@/actions/service'
import { fmtINR } from '@/lib/utils'
import type { ServiceJob } from '@/context/ServiceContext'

interface JobDetailDrawerProps {
  job: ServiceJob | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

const STATUS_FLOW: ServiceJob['status'][] = ['Pending', 'In-Progress', 'Awaiting-Spares', 'Completed', 'Cancelled']

const STATUS_COLORS: Record<string, string> = {
  'Pending':        'bg-slate-100 text-slate-700 border-slate-200',
  'In-Progress':    'bg-blue-50 text-blue-700 border-blue-200',
  'Awaiting-Spares': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completed':      'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Cancelled':      'bg-red-50 text-red-700 border-red-200',
}

const WARRANTY_COLORS: Record<string, string> = {
  'in_warranty':     'bg-emerald-50 text-emerald-700 border-emerald-200',
  'out_of_warranty': 'bg-red-50 text-red-700 border-red-200',
  'unknown':         'bg-amber-50 text-amber-700 border-amber-200',
}

export function JobDetailDrawer({ job, open, onClose, onUpdated }: JobDetailDrawerProps) {
  const [updating, setUpdating] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [actualCost, setActualCost] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  if (!job) return null

  const handleStatusUpdate = async (newStatus: ServiceJob['status']) => {
    setUpdating(true)
    if (newStatus === 'Completed') {
      const result = await completeServiceJob({
        jobId: job.id,
        actualCost: actualCost ? parseFloat(actualCost) : undefined,
        resolutionNotes: resolutionNotes.trim() || undefined,
      })
      if (result.success) { setToast('Job marked as Completed'); onUpdated() }
      else setToast(result.error ?? 'Update failed')
    } else {
      const result = await updateJobStatus({ jobId: job.id, newStatus })
      if (result.success) { setToast(`Status updated to ${newStatus}`); onUpdated() }
      else setToast(result.error ?? 'Update failed')
    }
    setUpdating(false)
    setTimeout(() => setToast(null), 3000)
  }

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) { alert('Please allow popups'); return }
    const warrantyLabel = (job as any).warrantyStatus === 'in_warranty' ? '✅ IN WARRANTY'
      : (job as any).warrantyStatus === 'out_of_warranty' ? '❌ WARRANTY EXPIRED'
      : '⚠️ WARRANTY UNKNOWN'
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Work Order — ${(job as any).jobId || job.jobId}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; font-size: 12px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #001529; padding-bottom: 12px; margin-bottom: 16px; }
        .company { font-size: 20px; font-weight: 900; color: #001529; }
        .title { font-size: 16px; font-weight: 900; text-align: right; text-transform: uppercase; letter-spacing: 2px; }
        .job-id { font-size: 11px; color: #64748b; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        td { padding: 6px 8px; border: 1px solid #e2e8f0; }
        .label { background: #f8fafc; font-weight: 700; width: 35%; color: #475569; font-size: 10px; text-transform: uppercase; }
        .warranty-box { padding: 8px 12px; border-radius: 6px; font-weight: 700; margin-bottom: 16px; border: 1px solid #e2e8f0; }
        .desc-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; min-height: 60px; margin-bottom: 16px; }
        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
        .sig-line { border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 9px; color: #94a3b8; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header">
        <div><div class="company">OPS360 ERP</div><div style="font-size:9px;color:#64748b">Service Hub — Work Order</div></div>
        <div><div class="title">Work Order</div><div class="job-id">${job.jobId}</div><div class="job-id">Date: ${new Date().toLocaleDateString('en-IN')}</div></div>
      </div>
      <table>
        <tr><td class="label">Customer</td><td>${job.customerName ?? 'Walk-in'}</td><td class="label">Status</td><td>${job.status}</td></tr>
        <tr><td class="label">Product</td><td>${job.productName ?? '—'}</td><td class="label">Priority</td><td>${job.priority}</td></tr>
        <tr><td class="label">Serial No.</td><td>${(job as any).serialNumber ?? '—'}</td><td class="label">Technician</td><td>${job.technicianName ?? '—'}</td></tr>
        <tr><td class="label">Est. Cost</td><td>${job.estimatedCost ? '₹' + Number(job.estimatedCost).toLocaleString('en-IN') : '—'}</td><td class="label">Branch</td><td>${job.branchId}</td></tr>
      </table>
      <div class="warranty-box">${warrantyLabel}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:4px">Issue Description</div>
      <div class="desc-box">${job.description ?? 'No description provided.'}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:4px">Resolution Notes</div>
      <div class="desc-box" style="min-height:80px"></div>
      <div class="sig-grid">
        <div><div class="sig-line">Customer Signature / Acknowledgment</div></div>
        <div><div class="sig-line">Technician / Authorized Signatory</div></div>
      </div>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`)
    win.document.close()
  }

  const nextStatuses = STATUS_FLOW.filter(s => s !== job.status && s !== 'Cancelled')

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-black">{job.jobId}</SheetTitle>
            <Button size="sm" variant="outline" className="gap-2 h-8 text-xs" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> Print Work Order
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] font-bold uppercase border ${STATUS_COLORS[job.status] ?? ''}`}>{job.status}</Badge>
            <Badge variant="outline" className={`text-[10px] font-bold uppercase border ${job.priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-200' : job.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}`}>{job.priority}</Badge>
            {(job as any).warrantyStatus && (
              <Badge className={`text-[10px] font-bold uppercase border ${WARRANTY_COLORS[(job as any).warrantyStatus] ?? ''}`}>
                {(job as any).warrantyStatus === 'in_warranty' ? '✅ In Warranty' : (job as any).warrantyStatus === 'out_of_warranty' ? '❌ Expired' : '⚠️ Unknown'}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {toast && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">{toast}</div>
        )}

        <div className="p-4 space-y-5">
          {/* Job Details */}
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Customer</p><p className="font-semibold">{job.customerName ?? 'Walk-in'}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Technician</p><p className="font-semibold">{job.technicianName ?? '—'}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Product</p><p className="font-semibold">{job.productName ?? '—'}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Serial No.</p><p className="font-mono font-semibold">{(job as any).serialNumber ?? '—'}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Est. Cost</p><p className="font-semibold">{job.estimatedCost ? fmtINR(Number(job.estimatedCost)) : '—'}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Actual Cost</p><p className="font-semibold text-green-700">{job.actualCost ? fmtINR(Number(job.actualCost)) : '—'}</p></div>
            </div>
            {job.description && (
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Description</p><p className="text-slate-600 text-sm leading-relaxed bg-slate-50 rounded-lg p-3">{job.description}</p></div>
            )}
          </div>

          <Separator />

          {/* Status Updates */}
          {job.status !== 'Completed' && job.status !== 'Cancelled' && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(s => (
                  <Button key={s} size="sm" variant="outline" className="h-8 text-xs gap-1.5" disabled={updating} onClick={() => handleStatusUpdate(s)}>
                    {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {s === 'In-Progress' ? '▶ Start Work' : s === 'Awaiting-Spares' ? '📦 Awaiting Spares' : s === 'Completed' ? '✅ Complete' : s === 'Cancelled' ? '✕ Cancel' : s}
                  </Button>
                ))}
                <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={updating} onClick={() => handleStatusUpdate('Cancelled')}>
                  ✕ Cancel Job
                </Button>
              </div>

              {/* Completion form — show when Completed is next */}
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Actual Cost (₹)</Label>
                  <Input type="number" min={0} placeholder="0.00" value={actualCost} onChange={e => setActualCost(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Resolution Notes</Label>
                  <Textarea placeholder="What was done to fix the issue..." value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} className="min-h-[80px] resize-none text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Completed state */}
          {job.status === 'Completed' && (job as any).resolutionNotes && (
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Resolution</p>
              <p className="text-sm text-slate-600 bg-emerald-50 rounded-lg p-3 border border-emerald-100">{(job as any).resolutionNotes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
