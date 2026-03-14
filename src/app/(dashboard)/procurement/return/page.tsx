"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  Search, 
  RotateCcw, 
  Package, 
  FileText, 
  Truck, 
  Calendar, 
  AlertCircle,
  ShieldCheck,
  ArrowLeft
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

export default function PurchaseReturn() {
  const [serial, setSerial] = useState("")
  const [loading, setLoading] = useState(false)
  const [item, setItem] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [returnLoading, setReturnLoading] = useState(false)
  const [reason, setReason] = useState("")
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
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/procurement" className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#001529] uppercase">Purchase Returns</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            Inventory-Vendor Reversal & Debit Note Issuance
          </p>
        </div>
      </div>

      <Card className="border-2 border-slate-100 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="bg-[#001529] text-white py-10">
          <CardTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter uppercase italic">
            <RotateCcw className="h-8 w-8 text-[#7FD1E3]" />
            Stock Return Portal
          </CardTitle>
          <CardDescription className="text-[#7FD1E3] font-bold uppercase text-[11px] tracking-[0.2em] opacity-80">
            Scanning units back to vendor pedigree
          </CardDescription>
          <div className="pt-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="PROBE SERIAL NUMBER (e.g. WH-XXXXX)..." 
                className="pl-12 py-7 bg-white/10 border-white/20 text-white placeholder:text-white/40 font-mono text-lg rounded-xl focus-visible:ring-[#7FD1E3]"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#7FD1E3] text-[#001529] font-black hover:bg-[#68C0D1]"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? "SEARCHING..." : "PULL PEDIGREE"}
              </Button>
            </div>
          </div>
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
