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
import { ShieldAlert, User, Loader2, Search, Settings2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export default function DiscrepancyReportPage() {
  const [discrepancies, setDiscrepancies] = useState<any[]>([])
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [authorizerFilter, setAuthorizerFilter] = useState("all")

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

  const filteredDiscrepancies = discrepancies.filter(item => {
    const searchMatch = !searchTerm || item.po?.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) || item.product?.model_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const authorizerMatch = authorizerFilter === "all" || item.po?.approved_by === authorizerFilter;
    return searchMatch && authorizerMatch;
  });

  const uniqueAuthorizers = Array.from(new Set(discrepancies.map(d => d.po?.approved_by).filter(Boolean)));

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-[#001529]" /></div>

  return (
    <div className="flex-1 space-y-8 mt-0">
      <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none overflow-hidden text-xs py-0">
        <CardHeader className="bg-[#001529] text-white pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              Procurement Exception Log
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "gap-2 border-white/20 h-8 shadow-sm transition-all text-xs bg-white/5 text-white hover:bg-red-400 hover:text-[#001529] hover:border-red-400 font-bold group",
                  showFilters && "bg-red-400 text-[#001529] border-red-400"
                )}
              >
                <Settings2 className={cn("h-3.5 w-3.5 transition-colors", showFilters ? "text-[#001529]" : "text-white group-hover:text-[#001529]")} />
                {showFilters ? "Hide Filters" : "Advance Filters"}
              </Button>

              <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-white/40 border-white/10">
                Audit Registry
              </Badge>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search PO or Product..."
                  className="pl-9 h-8 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/30 rounded-lg text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Authorizer</span>
                <Select value={authorizerFilter} onValueChange={(v) => setAuthorizerFilter(v || "all")}>
                  <SelectTrigger className="w-[150px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                    <SelectValue placeholder="All Authority" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001529] border-white/10 text-white">
                    <SelectItem value="all">All Authority</SelectItem>
                    {uniqueAuthorizers.map(id => (
                      <SelectItem key={id} value={id} className="focus:bg-white/10 focus:text-[#7FD1E3]">
                        {profileMap.get(id as string) || 'System'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || authorizerFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setAuthorizerFilter("all")
                  }}
                  className="h-7 text-white/40 hover:text-white hover:bg-white/5 text-[9px] font-bold uppercase tracking-widest ml-auto gap-2"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </Button>
              )}
            </div>
          )}
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
              {filteredDiscrepancies.map((item: any) => (
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
              {filteredDiscrepancies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24">
                     <div className="flex flex-col items-center gap-4 opacity-30 grayscale">
                        <ShieldAlert className="h-16 w-16" />
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
