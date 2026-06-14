'use client'
import { useRef, useMemo } from 'react'

import { useReactToPrint } from 'react-to-print'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollableTable } from '@/components/ui/scrollable-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart3, FileText, Package, Printer, TrendingUp, Users, ShoppingBag } from 'lucide-react'
import { fmtINR } from '@/lib/utils'

interface ReportsClientProps {
  activeTab: string
  fromDate: string
  toDate: string
  branchId: string | null
  salesData: any
  gstData: any
  stockData: any
  role: string
}

export default function ReportsClient({
  activeTab, fromDate, toDate, branchId, salesData, gstData, stockData, role,
}: ReportsClientProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({ contentRef: printRef })

  const navigate = (tab: string, from?: string, to?: string) => {
    const params = new URLSearchParams({
      tab,
      fromDate: from ?? fromDate,
      toDate:   to   ?? toDate,
    })
    window.location.assign(`/reports?${params.toString()}`)
  }

  const TABS = [
    { id: 'sales', label: 'Sales Report',      icon: BarChart3 },
    { id: 'gst',   label: 'GST Summary',       icon: FileText  },
    { id: 'stock', label: 'Stock Valuation',   icon: Package   },
  ]

  const datePresets = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const today = now.toISOString().slice(0, 10)
    const thisMonthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastMonthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10)
    const lastMonthEnd   = new Date(year, month, 0).toISOString().slice(0, 10)
    const fyStart = month >= 3 ? `${year}-04-01` : `${year - 1}-04-01`
    return [
      { label: 'This Month', from: thisMonthStart, to: today },
      { label: 'Last Month', from: lastMonthStart, to: lastMonthEnd },
      { label: 'This FY',    from: fyStart,        to: today },
    ]
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/20">
            <BarChart3 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Reports</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">
              Business Intelligence & Filing Reports
            </p>
          </div>
        </div>
        <Button onClick={() => handlePrint()} className="bg-[#001529] hover:bg-[#002545] text-white gap-2 h-10">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => navigate(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-[#001529] text-[#001529]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Date Range Filter — hidden for stock tab */}
      {activeTab !== 'stock' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">From</span>
            <Input type="date" value={fromDate} className="h-9 w-36"
              onChange={e => navigate(activeTab, e.target.value, toDate)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">To</span>
            <Input type="date" value={toDate} className="h-9 w-36"
              onChange={e => navigate(activeTab, fromDate, e.target.value)} />
          </div>
          {datePresets.map(p => (
            <Button key={p.label} variant="outline" size="sm" className="h-9 text-xs"
              onClick={() => navigate(activeTab, p.from, p.to)}>
              {p.label}
            </Button>
          ))}
        </div>
      )}

      {/* Printable content */}
      <div ref={printRef}>
        <style>{`
          @media print {
            table { width: 100% !important; table-layout: auto !important; }
            td, th { white-space: normal !important; font-size: 10px !important; padding: 3px 6px !important; }
            .print\\:overflow-visible { overflow: visible !important; }
          }
        `}</style>
        {/* Print header — only shows when printing */}
        <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900">OPS360 ERP</h1>
              <p className="text-sm text-slate-500">Ethan Home Appliances</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-slate-900">
                {activeTab === 'sales' ? 'Sales Report' : activeTab === 'gst' ? 'GST Summary' : 'Stock Valuation'}
              </p>
              {activeTab !== 'stock' && (
                <p className="text-sm text-slate-500">{fromDate} to {toDate}</p>
              )}
              <p className="text-xs text-slate-400">Generated: {typeof window !== 'undefined' ? new Date().toLocaleString('en-IN') : ''}</p>
            </div>
          </div>
        </div>

        {/* ── SALES REPORT ── */}
        {activeTab === 'sales' && salesData?.success && (
          <div className="space-y-6">
            {/* Summary KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Revenue</p>
                <p className="text-2xl font-black text-emerald-700">{fmtINR(Number(salesData.summary.total_revenue ?? 0))}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Invoices</p>
                <p className="text-2xl font-black">{Number(salesData.summary.total_invoices ?? 0)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">GST Collected</p>
                <p className="text-2xl font-black text-amber-700">{fmtINR(Number(salesData.summary.total_cgst ?? 0) + Number(salesData.summary.total_sgst ?? 0) + Number(salesData.summary.total_igst ?? 0))}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Customers</p>
                <p className="text-2xl font-black">{Number(salesData.summary.unique_customers ?? 0)}</p>
              </CardContent></Card>
            </div>

            {/* Sales by product */}
            <Card>
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="flex items-center gap-2 text-sm"><ShoppingBag className="h-4 w-4" /> Sales by Product</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="print:overflow-visible overflow-x-auto">
                  <div className="print:min-w-0 min-w-[700px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Product</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead className="text-right">Units</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.products.map((p: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{p.model_name}</TableCell>
                            <TableCell className="text-sm text-slate-500">{p.brand}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{Number(p.units_sold)}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-semibold">{fmtINR(Number(p.total_revenue))}</TableCell>
                          </TableRow>
                        ))}
                        {salesData.products.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No sales in this period</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales by staff */}
            <Card>
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Sales by Staff</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Staff Member</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.staff.map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{s.staff_name}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{Number(s.invoice_count)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-semibold">{fmtINR(Number(s.total_revenue))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Daily trend */}
            <Card>
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4" /> Daily Sales Trend</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="print:overflow-visible overflow-x-auto">
                  <div className="print:min-w-0 min-w-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Invoices</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.daily.map((d: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{new Date(d.sale_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{Number(d.invoice_count)}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-semibold">{fmtINR(Number(d.revenue))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── GST SUMMARY ── */}
        {activeTab === 'gst' && gstData?.success && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> GST Position — {fromDate} to {toDate}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="print:overflow-visible overflow-x-auto">
                  <div className="print:min-w-0 min-w-[600px]">
                    <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Collected (Output)</TableHead>
                      <TableHead className="text-right">Paid (Input Credit)</TableHead>
                      <TableHead className="text-right">Net Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstData.gst.map((g: any, i: number) => {
                      const net = Number(g.collected) - Number(g.paid)
                      return (
                        <TableRow key={i}>
                          <TableCell><Badge variant="outline" className="font-mono text-xs">{g.code}</Badge></TableCell>
                          <TableCell className="font-medium text-sm">{g.name}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-emerald-700">{fmtINR(Number(g.collected))}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-blue-700">{fmtINR(Number(g.paid))}</TableCell>
                          <TableCell className={`text-right tabular-nums text-sm font-bold ${net > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmtINR(net)}</TableCell>
                        </TableRow>
                      )
                    })}
                    {gstData.gst.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No GST data in this period</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {gstData.gst.length > 0 && (
                  <div className="border-t p-4 flex justify-end">
                    <div className="text-right space-y-1">
                      <div className="flex gap-8 text-sm">
                        <span className="text-slate-500">Total Output GST</span>
                        <span className="font-bold text-emerald-700 tabular-nums">{fmtINR(gstData.gst.reduce((s: number, g: { collected: string | number }) => s + Number(g.collected), 0))}</span>
                      </div>
                      <div className="flex gap-8 text-sm">
                        <span className="text-slate-500">Total Input Credit</span>
                        <span className="font-bold text-blue-700 tabular-nums">{fmtINR(gstData.gst.reduce((s: number, g: { paid: string | number }) => s + Number(g.paid), 0))}</span>
                      </div>
                      <div className="flex gap-8 text-sm border-t pt-1 mt-1">
                        <span className="font-bold">Net GST Payable</span>
                        <span className="font-black text-red-700 tabular-nums">{fmtINR(gstData.gst.reduce((s: number, g: { collected: string | number; paid: string | number }) => s + Number(g.collected) - Number(g.paid), 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STOCK VALUATION ── */}
        {activeTab === 'stock' && stockData?.success && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Units</p>
                <p className="text-2xl font-black">{stockData.totalUnits}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Cost Value</p>
                <p className="text-2xl font-black text-blue-700">{fmtINR(stockData.totalCostValue)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">MRP Value</p>
                <p className="text-2xl font-black text-emerald-700">{fmtINR(stockData.totalMrpValue)}</p>
              </CardContent></Card>
            </div>
            <Card>
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Package className="h-4 w-4" /> Stock Valuation by Product</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="print:overflow-visible overflow-x-auto">
                  <div className="print:min-w-0 min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Product</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">Units</TableHead>
                          <TableHead className="text-right">Avg Cost</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                          <TableHead className="text-right">MRP</TableHead>
                          <TableHead className="text-right">MRP Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockData.products.map((p: { model_name: string; brand: string; product_code: string | null; available_units: string | number; avg_landed_cost: string | number; total_landed_cost: string | number; mrp: string | number; total_mrp_value: string | number }, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{p.model_name}</TableCell>
                            <TableCell className="text-sm text-slate-500">{p.brand}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-400">{p.product_code ?? '—'}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{Number(p.available_units)}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{fmtINR(Number(p.avg_landed_cost))}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-semibold text-blue-700">{fmtINR(Number(p.total_landed_cost))}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{fmtINR(Number(p.mrp))}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-semibold text-emerald-700">{fmtINR(Number(p.total_mrp_value))}</TableCell>
                          </TableRow>
                        ))}
                        {stockData.products.length === 0 && (
                          <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-8">No stock available</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
