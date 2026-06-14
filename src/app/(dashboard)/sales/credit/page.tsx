'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollableTable } from '@/components/ui/scrollable-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreditCard, AlertTriangle, CheckCircle2, Loader2, X, DollarSign } from 'lucide-react'
import { getAROutstanding, recordCreditPayment } from '@/actions/finance'
import { fmtINR } from '@/lib/utils'
import { printCustomerStatement } from '@/lib/printCustomerStatement'
import { FileText } from 'lucide-react'

type ARInvoice = {
  id: string; invoice_number: string; created_at: string; due_date: string | null
  total_amount: string; amount_paid: string; payment_status: string
  customer_id: string; customer_name: string; customer_phone: string | null
  days_overdue: string
}

export default function ARManagementPage() {
  const [invoices, setInvoices]       = useState<ARInvoice[]>([])
  const [loading, setLoading]         = useState(true)
  const [totalOutstanding, setTotal]  = useState(0)
  const [overdueCount, setOverdue]    = useState(0)
  const [payingInvoice, setPayingInvoice] = useState<ARInvoice | null>(null)
  const [payAmount, setPayAmount]     = useState('')
  const [payMode, setPayMode]         = useState<'cash' | 'bank'>('cash')
  const [payNotes, setPayNotes]       = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [toast, setToast]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [branchId, setBranchId]       = useState<string>('')

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message }); setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    import('next-auth/react').then(({ getSession }) =>
      getSession().then(s => { if (s?.user?.branchId) setBranchId(s.user.branchId) })
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getAROutstanding()
    if (result.success) {
      setInvoices(result.invoices as ARInvoice[])
      setTotal(result.totalOutstanding)
      setOverdue(result.overdueCount)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleRecordPayment = async () => {
    if (!payingInvoice || !payAmount) return
    setSubmitting(true)
    const result = await recordCreditPayment({
      invoiceId:   payingInvoice.id,
      customerId:  payingInvoice.customer_id,
      amount:      parseFloat(payAmount),
      paymentMode: payMode,
      notes:       payNotes || undefined,
      branchId,
    })
    setSubmitting(false)
    if (result.success) {
      showToast('success', `Payment of ${fmtINR(result.paymentAmount!)} recorded`)
      setPayingInvoice(null); setPayAmount(''); setPayNotes('')
      load()
    } else {
      showToast('error', result.error ?? 'Failed to record payment')
    }
  }

  const outstanding = (inv: ARInvoice) => Number(inv.total_amount) - Number(inv.amount_paid)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-50 rounded-xl text-purple-600 border border-purple-100">
          <CreditCard className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Accounts Receivable</h1>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">
            Credit Sales Outstanding — All Branches
          </p>
        </div>
      </div>

      {toast && (
        <div className={`px-4 py-3 rounded-lg text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-black text-purple-700">{fmtINR(totalOutstanding)}</p>
              <p className="text-xs font-bold uppercase text-slate-400">Total Outstanding</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-black text-red-600">{overdueCount}</p>
              <p className="text-xs font-bold uppercase text-slate-400">Overdue Invoices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-slate-400" />
            <div>
              <p className="text-2xl font-black">{invoices.length}</p>
              <p className="text-xs font-bold uppercase text-slate-400">Open Invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AR Table */}
      <Card>
        <CardHeader className="bg-muted/30 border-b py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4" /> Outstanding Credit Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-300" />
              <p className="font-semibold text-emerald-600">All cleared!</p>
              <p className="text-slate-400 text-sm">No outstanding credit invoices.</p>
            </div>
          ) : (
            <ScrollableTable minWidth="900px">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => {
                    const daysOverdue = Number(inv.days_overdue)
                    const outstandingAmt = outstanding(inv)
                    return (
                      <TableRow key={inv.id} className={daysOverdue > 0 ? 'bg-red-50/30' : ''}>
                        <TableCell className="font-mono text-xs font-bold">{inv.invoice_number}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{inv.customer_name}</div>
                          <div className="text-xs text-slate-400">{inv.customer_phone ?? ''}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{fmtINR(Number(inv.total_amount))}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-emerald-600">{fmtINR(Number(inv.amount_paid))}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-bold text-purple-700">{fmtINR(outstandingAmt)}</TableCell>
                        <TableCell className="text-sm">
                          {inv.due_date ? (
                            <span className={daysOverdue > 0 ? 'text-red-600 font-bold' : 'text-slate-600'}>
                              {new Date(inv.due_date).toLocaleDateString('en-IN')}
                              {daysOverdue > 0 && <span className="ml-1 text-xs">({daysOverdue}d overdue)</span>}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] font-bold border ${inv.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {inv.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => { setPayingInvoice(inv); setPayAmount(String(outstandingAmt)) }}>
                              <DollarSign className="h-3 w-3" /> Record Payment
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => printCustomerStatement(inv.customer_id)}>
                              <FileText className="h-3 w-3" /> Statement
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPayingInvoice(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Record Payment</h2>
                <p className="text-sm text-slate-500">{payingInvoice.customer_name} · {payingInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 flex justify-between text-sm">
              <span className="text-slate-500">Outstanding</span>
              <span className="font-black text-purple-700">{fmtINR(outstanding(payingInvoice))}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Payment Amount (₹) *</Label>
              <Input type="number" min={0.01} max={outstanding(payingInvoice)}
                value={payAmount} onChange={e => setPayAmount(e.target.value)} className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Payment Method</Label>
              <div className="flex gap-2">
                {(['cash', 'bank'] as const).map(m => (
                  <button key={m} type="button"
                    className={`flex-1 h-9 rounded-lg border text-xs font-bold capitalize transition-colors ${payMode === m ? 'bg-[#001529] text-white border-[#001529]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    onClick={() => setPayMode(m)}>
                    {m === 'cash' ? '💵 Cash' : '🏦 Bank Transfer'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Notes (optional)</Label>
              <Input placeholder="e.g. Cheque no. 123456" value={payNotes}
                onChange={e => setPayNotes(e.target.value)} className="h-9" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayingInvoice(null)}>Cancel</Button>
              <Button className="flex-1 bg-[#001529] hover:bg-[#002545] text-white"
                onClick={handleRecordPayment} disabled={submitting || !payAmount || parseFloat(payAmount) <= 0}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : 'Record Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
