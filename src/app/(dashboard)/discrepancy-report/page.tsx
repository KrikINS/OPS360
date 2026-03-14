"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, User, FileText, Scale, Loader2 } from "lucide-react"

export default function DiscrepancyReportPage() {
  const [discrepancies, setDiscrepancies] = useState<any[]>([])
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      // Fetch PO items where override_reason is not null
      const { data: discrepanciesData } = await supabase
        .from('purchase_order_items')
        .select(`
          id,
          tax_rate,
          override_reason,
          product:products(model_name),
          po:purchase_orders(
            po_number,
            created_at,
            approved_by
          )
        `)
        .not('override_reason', 'is', null)

      if (discrepanciesData) {
        setDiscrepancies(discrepanciesData)
      }

      // Fetch profiles to map approved_by
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email')
      if (profiles) {
        setProfileMap(new Map(profiles.map(p => [p.id, p.full_name || p.email])))
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* ── Header ── */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Scale className="h-6 w-6 text-[#001529]" />
             <h1 className="text-3xl font-extrabold text-[#001529] tracking-tight">Financial Oversight</h1>
          </div>
          <p className="text-slate-500 font-medium">Monitoring manual GST overrides and procurement discrepancies</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="h-7 border-amber-200 text-amber-700 bg-amber-50 gap-1.5 px-3 font-bold uppercase tracking-wider text-[10px]">
            <ShieldAlert className="h-3.5 w-3.5" />
            Audit Protocol 1.0
          </Badge>
          <div className="text-[10px] text-slate-400 font-mono">
            SECURE LOG: {new Date().toISOString()}
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-2">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Flags</p>
               <CardTitle className="text-3xl font-black text-slate-900">{discrepancies?.length || 0}</CardTitle>
            </CardHeader>
         </Card>
         <Card className="border-l-4 border-l-[#001529] shadow-sm">
            <CardHeader className="pb-2">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Type</p>
               <CardTitle className="text-xl font-black text-slate-900">GST Manual Refactor</CardTitle>
            </CardHeader>
         </Card>
         <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</p>
               <CardTitle className="text-xl font-black text-slate-900">Manager Verified</CardTitle>
            </CardHeader>
         </Card>
      </div>

      {/* ── Discrepancy Table ── */}
      <Card className="border-slate-200 shadow-xl overflow-hidden rounded-xl">
        <CardHeader className="bg-[#001529] text-white py-5 px-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-3 font-bold">
               <FileText className="h-5 w-5 text-[#7FD1E3]" />
               Procurement Exception Log
            </CardTitle>
            <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium backdrop-blur-sm">
              Confidential Oversight
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-100/50">
              <TableRow className="border-b border-slate-200">
                <TableHead className="font-black text-[#001529] uppercase text-[11px] px-6">PO Reference</TableHead>
                <TableHead className="font-black text-[#001529] uppercase text-[11px]">Affected Line Item</TableHead>
                <TableHead className="font-black text-[#001529] uppercase text-[11px]">Applied GST</TableHead>
                <TableHead className="font-black text-[#001529] uppercase text-[11px] w-[400px]">Audit Justification</TableHead>
                <TableHead className="font-black text-[#001529] uppercase text-[11px]">Authorized By</TableHead>
                <TableHead className="font-black text-[#001529] uppercase text-[11px] text-right px-6">Audit Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discrepancies?.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                  <TableCell className="font-black text-[#001529] font-mono px-6 py-5">{item.po?.po_number}</TableCell>
                  <TableCell>
                    <div className="text-sm font-bold text-slate-700">{item.product?.model_name || item.product?.[0]?.model_name}</div>
                    <div className="text-[10px] text-slate-400 font-medium tracking-tight">SYSTEM ID: {item.id.slice(0,8)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 font-black text-[11px] px-2.5">
                      {item.tax_rate}% MAN_OVR
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="p-4 bg-slate-50 border-l-4 border-amber-400 rounded-r-lg text-sm font-medium text-slate-600 leading-relaxed italic animate-in fade-in slide-in-from-left-2 transition-all">
                      &quot;{item.override_reason}&quot;
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                       <div className="h-9 w-9 rounded-xl bg-[#001529] flex items-center justify-center text-[#7FD1E3] shadow-md border border-white/10">
                         <User className="h-4.5 w-4.5" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-sm font-black text-slate-800 tracking-tight">
                           {profileMap.get(item.po?.approved_by) || 'Administrative System'}
                         </span>
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verified Auth</span>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-black text-right px-6">
                     {new Date(item.po?.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                     })}
                  </TableCell>
                </TableRow>
              ))}
              {(!discrepancies || discrepancies.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24">
                     <div className="flex flex-col items-center gap-4 opacity-30 grayscale">
                        <Scale className="h-16 w-16" />
                        <div className="space-y-1">
                          <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">Negative Audit Variance</p>
                          <p className="text-sm font-bold text-slate-500">No manual overrides or fiscal discrepancies detected.</p>
                        </div>
                     </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Footer ── */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-8 border-t border-slate-200">
        <div>Logistics Compliance Framework v4.2</div>
        <div>Generated by Ops360 Audit Engine</div>
      </div>
    </div>
  )
}
