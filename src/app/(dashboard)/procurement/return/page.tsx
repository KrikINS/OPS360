"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  Search, 
  RotateCcw, 
  ArrowLeft,
  Settings2,
  AlertCircle,
  Package,
  Truck,
  FileText,
  Calendar,
  ShieldCheck
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function PurchaseReturn() {
  const [serial, setSerial] = useState("")
  const [loading, setLoading] = useState(false)
  const [item, setItem] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [returnLoading, setReturnLoading] = useState(false)
  const [reason, setReason] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  async function handleSearch() {
    if (!serial) return
    setLoading(true)
    setError(null)
    setItem(null)

    try {
      const { data, error: fetchError } = await supabase
        .from("inventory")
        .select(`
          *,
          po:source_po_id (
            po_number,
            created_at,
            vendor:vendor_id (
              name,
              vendor_code
            )
          )
        `)
        .eq("serial_number", serial.trim())
        .single()

      if (fetchError || !data) {
        setError("Serialized unit not found in active inventory.")
      } else {
        setItem(data)
      }
    } catch (err) {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  async function processReturn() {
    if (!reason) {
      setError("Please provide a reason for the return.")
      return
    }

    setReturnLoading(true)
    try {
      const res = await fetch("/api/procurement/returns", {
        method: "POST",
        body: JSON.stringify({
          serial_number: item.serial_number,
          reason: reason
        }),
        headers: { "Content-Type": "application/json" }
      })

      const data = await res.json()
      if (data.success) {
        alert(data.message)
        setItem(null)
        setSerial("")
        setReason("")
      } else {
        setError(data.error || "Failed to process return.")
      }
    } catch (err) {
      setError("Failed to reach return engine.")
    } finally {
      setReturnLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-8 mt-0">
      <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none overflow-hidden py-0">
        <CardHeader className="bg-[#001529] text-white pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <RotateCcw className="h-5 w-5 text-orange-400" />
              Stock Return Portal
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "gap-2 border-white/20 h-8 shadow-sm transition-all text-xs bg-white/5 text-white hover:bg-orange-400 hover:text-[#001529] hover:border-orange-400 font-bold group",
                  showFilters && "bg-orange-400 text-[#001529] border-orange-400"
                )}
              >
                <Settings2 className={cn("h-3.5 w-3.5 transition-colors", showFilters ? "text-[#001529]" : "text-white group-hover:text-[#001529]")} />
                {showFilters ? "Hide Search" : "Advance Probe"}
              </Button>

              <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest text-white/40 border-white/10">
                Reverse Logistics
              </Badge>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input 
                  placeholder="PROBE SERIAL NUMBER (e.g. WH-XXXXX)..." 
                  className="pl-9 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 font-mono text-xs rounded-lg focus-visible:ring-[#7FD1E3]"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                className="bg-[#7FD1E3] text-[#001529] font-black hover:bg-[#68C0D1] h-10 text-xs px-6"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? "SEARCHING..." : "PULL PEDIGREE"}
              </Button>
            </div>
          )}
        </CardHeader>

        {error && (
          <div className="p-4 bg-red-50 border-y border-red-100 flex items-center gap-3 text-red-600 font-bold text-xs uppercase tracking-tight">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <CardContent className="p-0">
          {!item ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-300 gap-4">
              <Package className="h-16 w-16 opacity-20" />
              <p className="font-black uppercase tracking-tighter text-sm opacity-50">Awaiting Serialized Unit Verification</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* ── UNIT PEDIGREE ── */}
              <div className="grid md:grid-cols-2 divide-x divide-slate-100">
                <div className="p-8 space-y-6">
                   <div className="flex items-center justify-between">
                     <Badge className="bg-[#001529] text-[#7FD1E3] font-black uppercase text-[10px] tracking-widest px-3">ACTIVE STOCK</Badge>
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight italic">SERIAL: {item.serial_number}</span>
                   </div>
                   
                   <div className="space-y-4">
                     <div>
                       <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Investment Value</label>
                       <div className="text-4xl font-black text-[#001529] tracking-tighter">
                         <span className="text-lg mr-1 opacity-50">₹</span>
                         {item.landed_cost?.toLocaleString()}
                         <span className="text-xs ml-2 text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 italic">NET LANDED COST</span>
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                         <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                           <Truck className="h-3 w-3" /> Origin Vendor
                         </label>
                         <p className="font-bold text-slate-700 text-sm truncate">{item.po?.vendor?.name}</p>
                         <p className="text-[10px] text-slate-400 font-mono tracking-tighter">UID: {item.po?.vendor?.vendor_code}</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                         <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                           <FileText className="h-3 w-3" /> Source PO
                         </label>
                         <p className="font-black text-[#001529] text-sm">{item.po?.po_number}</p>
                         <p className="text-[10px] text-slate-400 font-bold tracking-tighter flex items-center gap-1">
                           <Calendar className="h-2.5 w-2.5" /> {new Date(item.po?.created_at).toLocaleDateString()}
                         </p>
                       </div>
                     </div>
                   </div>
                </div>

                <div className="p-8 bg-slate-50/50 flex flex-col justify-center gap-6">
                   <div className="space-y-4">
                     <div className="space-y-2">
                       <label className="text-xs font-black text-[#001529] uppercase tracking-tight flex items-center gap-2">
                         <AlertCircle className="h-4 w-4 text-amber-500" /> 
                         Statement of Reason
                       </label>
                       <textarea 
                         placeholder="Describe defect, mis-shipment, or damage rationale for Debit Note issuance..."
                         className="w-full min-h-[120px] p-4 rounded-xl border-2 border-slate-200 bg-white shadow-sm focus:border-[#7FD1E3] focus:ring-4 focus:ring-[#7FD1E3]/10 transition-all text-sm font-medium"
                         value={reason}
                         onChange={(e) => setReason(e.target.value)}
                       />
                     </div>

                     <Button 
                       className="w-full py-8 text-lg font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 group"
                       onClick={processReturn}
                       disabled={returnLoading}
                     >
                       {returnLoading ? "EXECUTING REVERSAL..." : "GENERATE DEBIT NOTE & RETURN"}
                       <RotateCcw className="ml-2 h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                     </Button>

                     <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tight">
                       WARNING: This action is irreversible. Inventory status will be flagged as RETURNED.
                     </p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── COMPLIANCE FOOTER ── */}
      <div className="flex items-center justify-center gap-6 opacity-40 grayscale">
         <div className="flex items-center gap-2">
           <ShieldCheck className="h-5 w-5" />
           <span className="text-[10px] font-black uppercase tracking-widest">Fiscal Compliance Engine v2.1</span>
         </div>
         <div className="h-4 w-px bg-slate-300" />
         <div className="flex items-center gap-2">
           <FileText className="h-5 w-5" />
           <span className="text-[10px] font-black uppercase tracking-widest">Automatic Debit Note Posting</span>
         </div>
      </div>
    </div>
  )
}
