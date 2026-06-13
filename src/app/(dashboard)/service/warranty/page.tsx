"use client"
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollableTable } from '@/components/ui/scrollable-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ShieldCheck, Search, Plus, Loader2, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'
import { getWarrantyRegistrations, registerWarranty } from '@/actions/service'
import { fmtINR } from '@/lib/utils'

type WarrantyReg = {
  id: string
  serial_number: string
  product_id: string
  customer_id: string | null
  invoice_id: string | null
  purchase_date: string
  warranty_months: number
  warranty_expires_at: string
  notes: string | null
  is_active: boolean
  created_at: Date | string | null
  model_name: string | null
  brand: string | null
  customer_name: string | null
  customer_phone: string | null
  invoice_number: string | null
  warranty_status: 'active' | 'expired'
}

export default function WarrantyManagementPage() {
  const [registrations, setRegistrations] = useState<WarrantyReg[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Manual registration form state
  const [form, setForm] = useState({
    serialNumber: '', productSearch: '', productId: '', productName: '',
    customerSearch: '', customerId: '', customerName: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    warrantyMonths: '12', notes: ''
  })
  const [productResults, setProductResults] = useState<any[]>([])
  const [customerResults, setCustomerResults] = useState<any[]>([])

  const loadRegistrations = useCallback(async () => {
    setLoading(true)
    const result = await getWarrantyRegistrations({ status: filter, search: search || undefined })
    if (result.success) setRegistrations(result.registrations as unknown as WarrantyReg[])
    setLoading(false)
  }, [filter, search])

  useEffect(() => {
    const t = setTimeout(() => loadRegistrations(), 300)
    return () => clearTimeout(t)
  }, [loadRegistrations])

  // Product search for manual form
  useEffect(() => {
    if (form.productSearch.length < 2) { setProductResults([]); return }
    const t = setTimeout(async () => {
      const mod = await import('@/app/actions/service')
      const result = await mod.searchProductsAction(form.productSearch)
      if (result.data) setProductResults(result.data as any[])
    }, 300)
    return () => clearTimeout(t)
  }, [form.productSearch])

  // Customer search for manual form
  useEffect(() => {
    if (form.customerSearch.length < 2) { setCustomerResults([]); return }
    const t = setTimeout(async () => {
      const mod = await import('@/app/actions/service')
      const result = await mod.searchPosCustomersAction(form.customerSearch)
      if (result.data) setCustomerResults(result.data as any[])
    }, 300)
    return () => clearTimeout(t)
  }, [form.customerSearch])

  const handleManualRegister = async () => {
    if (!form.serialNumber.trim() || !form.productId || !form.purchaseDate) {
      setToast({ type: 'error', message: 'Serial number, product, and purchase date are required' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    setSubmitting(true)
    const result = await registerWarranty({
      serialNumber:   form.serialNumber.trim(),
      productId:      form.productId,
      customerId:     form.customerId || undefined,
      purchaseDate:   form.purchaseDate,
      warrantyMonths: parseInt(form.warrantyMonths) || 12,
      notes:          form.notes || undefined,
    })
    setSubmitting(false)
    if (result.success) {
      setToast({ type: 'success', message: `Warranty registered for ${form.serialNumber}` })
      setShowForm(false)
      setForm({ serialNumber: '', productSearch: '', productId: '', productName: '', customerSearch: '', customerId: '', customerName: '', purchaseDate: new Date().toISOString().slice(0, 10), warrantyMonths: '12', notes: '' })
      loadRegistrations()
    } else {
      setToast({ type: 'error', message: result.error ?? 'Registration failed' })
    }
    setTimeout(() => setToast(null), 4000)
  }

  const activeCount  = registrations.filter(r => r.warranty_status === 'active').length
  const expiredCount = registrations.filter(r => r.warranty_status === 'expired').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/20">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Warranty Management</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Product Warranty Registry — All Branches</p>
          </div>
        </div>
        <Button className="bg-[#001529] hover:bg-[#002545] text-white font-bold gap-2 px-6 h-12 rounded-xl shadow-lg" onClick={() => setShowForm(true)}>
          <Plus className="h-5 w-5" /> Register Warranty
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('all')}>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-slate-400" />
            <div><p className="text-2xl font-black">{registrations.length}</p><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Total Registered</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-emerald-100" onClick={() => setFilter('active')}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div><p className="text-2xl font-black text-emerald-700">{activeCount}</p><p className="text-xs text-emerald-600 uppercase font-bold tracking-wide">Active Warranties</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-100" onClick={() => setFilter('expired')}>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-400" />
            <div><p className="text-2xl font-black text-red-600">{expiredCount}</p><p className="text-xs text-red-500 uppercase font-bold tracking-wide">Expired</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by serial, product, or customer..." className="pl-10 h-11" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'expired'] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} className={`h-11 capitalize ${filter === f ? 'bg-[#001529]' : ''}`} onClick={() => setFilter(f)}>{f}</Button>
          ))}
        </div>
      </div>

      {/* Registrations Table */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30 border-b py-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Warranty Registrations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
          ) : registrations.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShieldCheck className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-slate-500 font-medium">No warranty registrations found</p>
              <p className="text-slate-400 text-sm">Warranties are auto-registered on sale, or add one manually</p>
            </div>
          ) : (
            <ScrollableTable minWidth="900px">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold text-xs">Serial No.</TableHead>
                    <TableHead className="font-bold text-xs">Product</TableHead>
                    <TableHead className="font-bold text-xs">Customer</TableHead>
                    <TableHead className="font-bold text-xs">Invoice</TableHead>
                    <TableHead className="font-bold text-xs">Purchase Date</TableHead>
                    <TableHead className="font-bold text-xs">Warranty</TableHead>
                    <TableHead className="font-bold text-xs">Expires</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map(reg => (
                    <TableRow key={reg.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs font-bold">{reg.serial_number}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{reg.model_name ?? '—'}</div>
                        <div className="text-slate-400">{reg.brand ?? ''}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{reg.customer_name ?? 'Walk-in'}</div>
                        <div className="text-slate-400">{reg.customer_phone ?? ''}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">{reg.invoice_number ?? '—'}</TableCell>
                      <TableCell className="text-xs">{reg.purchase_date ? new Date(reg.purchase_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell className="text-xs">{reg.warranty_months} months</TableCell>
                      <TableCell className="text-xs">{reg.warranty_expires_at ? new Date(reg.warranty_expires_at).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-bold uppercase border ${reg.warranty_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {reg.warranty_status === 'active' ? '✅ Active' : '❌ Expired'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}
        </CardContent>
      </Card>

      {/* Manual Registration Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Register Warranty</h2>
                <p className="text-sm text-slate-500">Manual warranty registration</p>
              </div>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Serial Number *</Label>
              <Input placeholder="e.g. MO1" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} className="h-9" />
            </div>

            {/* Product search */}
            <div className="space-y-1.5 relative">
              <Label className="text-xs font-bold uppercase tracking-wide">Product *</Label>
              {form.productId ? (
                <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                  <span className="font-semibold">{form.productName}</span>
                  <button onClick={() => setForm(f => ({ ...f, productId: '', productName: '', productSearch: '' }))} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <>
                  <Input placeholder="Search product..." value={form.productSearch} onChange={e => setForm(f => ({ ...f, productSearch: e.target.value }))} className="h-9" />
                  {productResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                      {productResults.map((p: any) => (
                        <button key={p.id} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-0"
                          onClick={() => { setForm(f => ({ ...f, productId: p.id, productName: `${p.brand} ${p.model_name}`, productSearch: '', })); setProductResults([]) }}>
                          <div className="font-semibold">{p.model_name}</div>
                          <div className="text-xs text-slate-400">{p.brand}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Customer search */}
            <div className="space-y-1.5 relative">
              <Label className="text-xs font-bold uppercase tracking-wide">Customer (optional)</Label>
              {form.customerId ? (
                <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
                  <span className="font-semibold">{form.customerName}</span>
                  <button onClick={() => setForm(f => ({ ...f, customerId: '', customerName: '', customerSearch: '' }))} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <>
                  <Input placeholder="Search customer..." value={form.customerSearch} onChange={e => setForm(f => ({ ...f, customerSearch: e.target.value }))} className="h-9" />
                  {customerResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                      {customerResults.map((c: any) => (
                        <button key={c.id} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-0"
                          onClick={() => { setForm(f => ({ ...f, customerId: c.id, customerName: c.full_name, customerSearch: '' })); setCustomerResults([]) }}>
                          <div className="font-semibold">{c.full_name}</div>
                          <div className="text-xs text-slate-400">{c.phone_number}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide">Purchase Date *</Label>
                <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide">Warranty (months)</Label>
                <Input type="number" min={1} max={120} value={form.warrantyMonths} onChange={e => setForm(f => ({ ...f, warrantyMonths: e.target.value }))} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Notes</Label>
              <Input placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-9" />
            </div>

            {/* Expiry preview */}
            {form.purchaseDate && form.warrantyMonths && (
              <div className="rounded-lg bg-slate-50 border px-3 py-2 text-xs text-slate-600">
                Warranty expires: <strong>
                  {(() => {
                    const d = new Date(form.purchaseDate)
                    d.setMonth(d.getMonth() + parseInt(form.warrantyMonths || '0'))
                    return d.toLocaleDateString('en-IN')
                  })()}
                </strong>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#001529] hover:bg-[#002545] text-white" onClick={handleManualRegister} disabled={submitting || !form.serialNumber || !form.productId}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registering...</> : 'Register Warranty'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
