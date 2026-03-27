"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import NextImage from "next/image"
import { 
  Search, 
  RotateCcw, 
  AlertCircle,
  Package,
  Plus,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  ShieldAlert,
  Loader2,
  X,
  Download,
  FileText,
  Eye,
  ExternalLink,
  ChevronDown,
  Settings2,
  ShieldCheck,
  Building2,
  Truck,
  LayoutGrid
} from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { useRef, useMemo } from "react"
import { DebitNotePrintTemplate } from "@/components/procurement/DebitNotePrintTemplate"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/utils/format"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { numberToWords } from "@/lib/number-to-words"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ReturnReasonMaster {
  id: string
  reason_text: string
  is_active: boolean
}

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  vendor?: { name: string, vendor_code: string } | { name: string, vendor_code: string }[]
  branch?: { name: string } | { name: string }[]
}

interface SerialItem {
  id: string
  serial_number: string
  landed_cost: number
  product_id: string
  product?: { model_name: string } | { model_name: string }[]
}

interface DebitNoteData {
  id: string
  debit_note_number: string
  po_number: string
  reason: string
  amount: number
  created_at: string
  serial_numbers: string[]
  evidence_url?: string
  status: string
  vendor_name?: string
  item_names?: string[]
  vendor?: {
    name: string;
    gstin?: string;
    address?: string;
  };
  branch?: {
    name: string;
    full_address?: string;
    gstin?: string;
  };
  metadata?: {
    serial_numbers?: string[];
    item_names?: string[];
  };
  po?: {
    po_number: string;
    branch?: {
      name: string;
      full_address?: string;
      gstin?: string;
    };
    vendor?: {
      name: string;
      gstin?: string;
    };
  };
}

export default function PurchaseReturn() {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [availableSerials, setAvailableSerials] = useState<SerialItem[]>([])
  const [selectedSerials, setSelectedSerials] = useState<string[]>([])
  const [returnReason, setReturnReason] = useState("")
  const [damageProof, setDamageProof] = useState<File | null>(null)
  const [returnLoading, setReturnLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastDebitNote, setLastDebitNote] = useState<DebitNoteData | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [authorizingId, setAuthorizingId] = useState<string | null>(null)
  const [viewingDebitNote, setViewingDebitNote] = useState<DebitNoteData | null>(null)
  const [returns, setReturns] = useState<DebitNoteData[]>([])
  const [fetchingReturns, setFetchingReturns] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [reasonFilter, setReasonFilter] = useState("all")
  const [isOpenEditDN, setIsOpenEditDN] = useState(false)
  const [editingDN, setEditingDN] = useState<DebitNoteData | null>(null)
  const [returnReasons, setReturnReasons] = useState<ReturnReasonMaster[]>([])
  
  const debitNoteRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchReturnReasons = useCallback(async () => {
    const { data } = await supabase
      .from("return_reason_master")
      .select("*")
      .eq("is_active", true)
      .order("reason_text")
    if (data) setReturnReasons(data)
  }, [supabase])

  useEffect(() => {
    fetchReturnReasons()
  }, [fetchReturnReasons])

  const handlePrint = useReactToPrint({
    contentRef: debitNoteRef,
    documentTitle: `DebitNote_${lastDebitNote?.debit_note_number || 'Document'}`,
    onAfterPrint: () => setIsDownloading(null)
  })

  const fetchReturns = useCallback(async () => {
    setFetchingReturns(true)
    try {
      const { data, error } = await supabase
        .from("debit_notes")
        .select(`
          *,
          po:purchase_orders (
            po_number,
            branch:branches (name, full_address, gstin),
            vendor:vendors (name, gstin)
          ),
          vendor:vendors (name, gstin)
        `)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setReturns((data as unknown as DebitNoteData[]).map((item) => ({
          ...item,
          po_number: item.po_number || item.po?.po_number || 'UNKNOWN',
          vendor_name: item.vendor?.name || item.po?.vendor?.name || item.vendor_name || 'UNKNOWN',
          branch: item.po?.branch,
          vendor: item.vendor || item.po?.vendor,
          serial_numbers: item.metadata?.serial_numbers || item.serial_numbers || [],
          item_names: item.metadata?.item_names || []
        })))
      }
    } catch (err) {
      console.error("Failed to fetch returns", err)
    } finally {
      setFetchingReturns(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchReturnReasons()
  }, [fetchReturnReasons])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  const filteredReturns = useMemo(() => {
    return returns.filter(ret => {
      const matchesSearch = 
        ret.debit_note_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesVendor = vendorFilter === "all" || ret.vendor_name === vendorFilter
      const matchesReason = reasonFilter === "all" || ret.reason === reasonFilter
      return matchesSearch && matchesVendor && matchesReason
    })
  }, [returns, searchTerm, vendorFilter, reasonFilter])

  const uniqueVendors = useMemo(() => {
    return Array.from(new Set(returns.map(r => r.vendor_name).filter(Boolean)))
  }, [returns])

  async function handleSearch() {
    if (!searchQuery) return
    setLoading(true)
    setError(null)
    setSelectedPO(null)
    setAvailableSerials([])
    setSelectedSerials([])

    try {
      // Find PO by po_number
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select(`
          id,
          po_number,
          status,
          vendor:vendor_id (name, vendor_code),
          branch:branch_id (name)
        `)
        .eq("po_number", searchQuery.trim().toUpperCase())
        .single()

      if (poError || !po) {
        setError("Purchase Order not found.")
        setLoading(false)
        return
      }

      setSelectedPO(po)

      // Get available serial numbers for this PO
      const { data: serials, error: serialError } = await supabase
        .from("inventory")
        .select("id, serial_number, landed_cost, product_id, product:product_id(model_name)")
        .eq("source_po_id", po.id)
        .in("status", ["Available"])

      if (serialError) {
        setError("Failed to fetch serialized inventory.")
      } else if (!serials || (serials as SerialItem[]).length === 0) {
        setError("No available units found for this order. Units may be already sold or returned.")
      } else {
        setAvailableSerials(serials as SerialItem[])
      }
    } catch {
      setError("Search engine failure.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitReturn() {
    if (selectedSerials.length === 0 || !returnReason) {
      setError("Please select items and provide a return reason.")
      return
    }

    setReturnLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("po_id", selectedPO?.id || "")
      formData.append("serial_numbers", JSON.stringify(selectedSerials))
      formData.append("reason", returnReason)
      if (damageProof) formData.append("proof", damageProof)

      const res = await fetch("/api/procurement/returns", {
        method: "POST",
        body: formData
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage(data.message)
        
        // Fetch detailed debit note data for printing
        const { data: dnData } = await supabase
          .from("debit_notes")
          .select(`
            *,
            po:po_id(po_number)
          `)
          .eq("id", data.debit_note_id)
          .single();

        if (dnData) {
          setLastDebitNote({
            ...dnData,
            po_number: dnData.po?.po_number,
            serial_numbers: selectedSerials // These were the ones returned
          });
        }

        setIsReturnModalOpen(false)
        fetchReturns() // Refresh the registry
        // Reset states
        setSelectedPO(null)
        setAvailableSerials([])
        setSelectedSerials([])
        setReturnReason("")
        setDamageProof(null)
      } else {
        setError(data.error || "Failed to process return.")
      }
    } catch {
      setError("Critical logic failure in return engine.")
    } finally {
      setReturnLoading(false)
    }
  }

  const toggleSerialSelection = (serial: string) => {
    setSelectedSerials(prev => 
      prev.includes(serial) 
        ? prev.filter(s => s !== serial) 
        : [...prev, serial]
    )
  }

  async function handleAuthorize(id: string) {
    setAuthorizingId(id)
    try {
      // 1. Authorize the debit note
      const { data: dn, error } = await supabase
        .from("debit_notes")
        .update({ status: "Authorized" })
        .eq("id", id)
        .select("po_id, amount, debit_note_number")
        .single();

      if (error) throw error
      
      // 2. DISCREPANCY RECONCILIATION: Subtract return from gap
      if (dn && dn.po_id) {
        const { data: openMismatch, error: mismatchError } = await supabase
          .from('discrepancies')
          .select('id, detected_gap, admin_comment')
          .eq('po_id', dn.po_id)
          .eq('discrepancy_type', 'Price Mismatch')
          .neq('status', 'Resolved')
          .maybeSingle();

        if (mismatchError) {
          console.error("Failed to check for existing discrepancies:", mismatchError);
        } else if (openMismatch) {
          const newGap = Number(openMismatch.detected_gap) + Number(dn.amount);
          const timestamp = new Date().toLocaleString('en-IN');
          const isResolved = Math.abs(newGap) < 1;
          
          const newComment = `${openMismatch.admin_comment}\n\n[RESOLVE ${timestamp}]: Authorized Return (${dn.debit_note_number}) for ₹${Number(dn.amount).toLocaleString('en-IN')} applied. New Gap: ₹${newGap.toLocaleString('en-IN')}.${isResolved ? ' RESOLVED.' : ''}`;
          
          const { error: updateError } = await supabase
            .from('discrepancies')
            .update({ 
               detected_gap: newGap,
               admin_comment: newComment,
               status: isResolved ? 'Resolved' : 'Investigating'
            })
            .eq('id', openMismatch.id);

          if (updateError) {
            console.error("Discrepancy reconciliation failed:", updateError);
            throw new Error(`Reconciliation failure: ${updateError.message}`);
          }
        }
      }

      setSuccessMessage("Return transaction authorized and discrepancy reconciled.");
      fetchReturns() // Refresh list
    } catch (err: unknown) {
      console.error("Authorization failed", err)
      setError(`Failed to authorize return: ${err instanceof Error ? err.message : 'Internal logic failure'}`)
    } finally {
      setAuthorizingId(null)
    }
  }

  async function handleUpdateDN() {
    if (!editingDN) return;
    setReturnLoading(true);
    try {
      const { error } = await supabase
        .from("debit_notes")
        .update({
          reason: editingDN.reason,
          amount: editingDN.amount
        })
        .eq("id", editingDN.id);

      if (error) throw error;
      setSuccessMessage(`Debit Note ${editingDN.debit_note_number} updated successfully.`);
      setIsOpenEditDN(false);
      fetchReturns();
    } catch (err) {
      console.error("Failed to update debit note", err);
      setError("Failed to update debit note details.");
    } finally {
      setReturnLoading(false);
    }
  }

  return (
    <div className="flex-1 space-y-8 mt-0">
      <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none overflow-hidden py-0">
        <CardHeader className="bg-[#001529]/95 backdrop-blur-md sticky top-0 z-20 pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none shadow-[0_4px_12px_-4px_rgba(0,21,41,0.35)] text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <RotateCcw className="h-5 w-5 text-orange-400" />
              Returns Management
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "gap-2 border-white/20 h-8 shadow-sm transition-all text-xs bg-white/5 text-white hover:bg-[#7FD1E3] hover:text-[#001529] hover:border-[#7FD1E3] font-bold group",
                  showFilters && "bg-[#7FD1E3] text-[#001529] border-[#7FD1E3]"
                )}
              >
                <Settings2 className={cn("h-3.5 w-3.5 transition-colors", showFilters ? "text-[#001529]" : "text-white group-hover:text-[#001529]")} />
                {showFilters ? "Hide Filters" : "Advance Filters"}
              </Button>

              <Button
                onClick={() => setIsReturnModalOpen(true)}
                size="sm"
                className="bg-white text-[#001529] hover:bg-slate-100 gap-2 shadow-md h-8 text-xs px-4 font-bold border-none transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Initiate New Return
              </Button>

              <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest text-white/40 border-white/10">
                Reverse Logistics Hub
              </Badge>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search Return ID, PO or Vendor..."
                  className="pl-9 h-8 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/30 rounded-lg text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Vendor</span>
                <Select value={vendorFilter} onValueChange={(v) => setVendorFilter(v || "all")}>
                  <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001529] border-white/10 text-white">
                    <SelectItem value="all">All Vendors</SelectItem>
                    {uniqueVendors.map(v => (
                      <SelectItem key={v} value={v!} className="focus:bg-white/10 focus:text-[#7FD1E3]">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Reason</span>
                <Select value={reasonFilter} onValueChange={(v) => setReasonFilter(v || "all")}>
                  <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                    <SelectValue placeholder="All Reasons" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001529] border-white/10 text-white">
                    <SelectItem value="all">All Reasons</SelectItem>
                    {returnReasons.map(r => (
                      <SelectItem key={r.id} value={r.reason_text} className="focus:bg-white/10 focus:text-[#7FD1E3]">{r.reason_text}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || vendorFilter !== "all" || reasonFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setVendorFilter("all")
                    setReasonFilter("all")
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

        {successMessage && (
          <div className="p-6 bg-emerald-50 border-y border-emerald-100 space-y-4">
            <div className="flex items-center justify-between gap-3 text-emerald-700 font-bold text-sm uppercase tracking-tight">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5" />
                {successMessage}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSuccessMessage(null); setLastDebitNote(null); }} className="h-6 w-6 p-0 hover:bg-emerald-100">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {lastDebitNote && (
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-emerald-200">
                <div className="bg-emerald-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Document Generated</p>
                  <p className="text-lg font-black text-slate-900">{lastDebitNote.debit_note_number}</p>
                </div>
                <Button 
                  onClick={() => {
                    setIsDownloading(lastDebitNote.id);
                    setTimeout(() => handlePrint(), 500);
                  }}
                  disabled={!!isDownloading}
                  className="bg-[#001529] hover:bg-slate-800 text-white gap-2 font-black uppercase text-xs h-10 px-6"
                >
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download Debit Note PDF
                </Button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border-y border-red-100 flex items-center gap-3 text-red-600 font-bold text-xs uppercase tracking-tight">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <CardContent className="p-0">
          {returns.length === 0 && !fetchingReturns ? (
            <div className="py-32 flex flex-col items-center justify-center text-slate-300 gap-4">
              <Package className="h-24 w-24 opacity-10" />
              <div className="text-center">
                <p className="font-black uppercase tracking-tighter text-lg opacity-30 text-[#001529]">Corporate Return Protocol</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select &quot;Initiate New Return&quot; to begin the reverse logistics process</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-380px)] border-b scrollbar-thin scrollbar-thumb-slate-200">
              <Table>
                <TableHeader className="bg-slate-50 border-b sticky top-0 z-10 shadow-sm transition-all duration-300">
                  <TableRow>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Return ID</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase text-center">Execution Hub</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Original PO</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Vendor</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Return Logic</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Landed Cost / Debit Note</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Item Name</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Serials</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Status</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fetchingReturns ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Return Hub...</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredReturns.map((ret) => (
                    <TableRow key={ret.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0 text-[11px]">
                      <TableCell className="py-3 px-4 font-black text-[#001529] font-mono border-r border-slate-100/50">{ret.debit_note_number}</TableCell>
                      <TableCell className="py-3 px-4 text-slate-500 border-r border-slate-100/50 text-center">
                        <div className="font-bold flex flex-col items-center gap-0.5 text-slate-600">
                          <span className="text-[10px]">{new Date(ret.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className="text-[8px] font-black text-[#001529] bg-slate-100 px-1.5 py-0.5 rounded-full ring-1 ring-slate-200 uppercase tracking-tighter">
                            {new Date(ret.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[8px] font-black text-emerald-600 mt-1 uppercase tracking-widest flex items-center justify-center gap-1">
                          <ShieldCheck className="h-2 w-2" /> Serial Lock Engaged
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 font-bold text-slate-600 border-r border-slate-100/50">{ret.po_number}</TableCell>
                      <TableCell className="py-3 px-4 font-bold text-slate-600 border-r border-slate-100/50">{ret.vendor_name}</TableCell>
                      <TableCell className="py-3 px-4 border-r border-slate-100/50">
                        <Badge variant="secondary" className="bg-slate-100 text-[#001529] font-bold text-[9px] uppercase tracking-tight py-0">
                          {ret.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 border-r border-slate-100/50">
                        <div className="font-black text-[#001529]">{formatCurrency(ret.amount)}</div>
                        <div className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-tight flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> 100% Recovery Verified
                        </div>
                        <div className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                          <div className="h-1 w-1 rounded-full bg-slate-300" />
                          Landed Cost Sum: {formatCurrency(ret.amount)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-slate-100/50">
                        <div className="font-bold text-slate-900 line-clamp-1 max-w-[150px]">{ret.item_names?.join(", ") || "Multiple Items"}</div>
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-slate-100/50">
                        <div className="flex flex-wrap gap-1">
                          {ret.serial_numbers.map((sn) => (
                            <Badge key={sn} variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[9px] font-mono px-1.5 py-0 h-4">
                              {sn}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 border-r border-slate-100/50">
                        <Badge className={cn(
                          "text-[9px] px-2 py-0.5 font-black uppercase tracking-tighter",
                          ret.status === 'Paid' || ret.status === 'Authorized' 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {ret.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button className="bg-[#001529] text-white hover:bg-slate-800 border-none shadow-md font-bold h-8 text-[11px] gap-2 px-4 transition-all active:scale-95">
                              Actions <ChevronDown className="h-3 w-3" />
                            </Button>
                          } />
                          <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              onClick={() => {
                                setViewingDebitNote(ret);
                              }}
                              className="text-slate-700 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Debit Note
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              onClick={() => {
                                setEditingDN(ret);
                                setIsOpenEditDN(true);
                              }}
                              className="text-amber-600 focus:text-amber-600 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                            >
                              <Settings2 className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            
                            {ret.status?.toLowerCase() !== 'authorized' && ret.status?.toLowerCase() !== 'paid' && (
                              <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => handleAuthorize(ret.id)}
                                className="text-emerald-600 focus:text-emerald-600 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                                disabled={authorizingId === ret.id}
                              >
                                {authorizingId === ret.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                Mark as Authorised
                              </DropdownMenuItem>
                            )}
                            
                            {ret.evidence_url && (
                              <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => window.open(ret.evidence_url, '_blank')}
                                className="text-blue-600 focus:text-blue-600 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" /> View Evidence
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── RETURN INITIATION MODAL ── */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="sm:max-w-4xl w-full p-0 overflow-hidden border-none shadow-2xl rounded-2xl flex flex-col max-h-[90vh] [&>button]:text-white">
          <DialogHeader className="bg-[#001529] p-6 text-white border-b-0 space-y-1 shrink-0">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-lg">
                <RotateCcw className="h-5 w-5 text-white" />
              </div>
              Stock Return Authorization
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium text-xs">
              Follow corporate guidelines for returning serialized inventory to authorized vendors.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid md:grid-cols-5 h-full">
              {/* Left Column: Search & Selection */}
              <div className="col-span-3 p-8 border-r border-slate-100 space-y-8">
                 <div className="space-y-4">
                   <label className="text-[10px] font-black text-[#000000] uppercase tracking-widest flex items-center gap-2">
                     <Search className="h-3 w-3 text-[#001529]" /> 1. Search Source Document
                   </label>
                   <div className="flex flex-col gap-3">
                     <Input 
                       placeholder="SCAN PO ID (e.g. PO-2026-XXXX)..."
                       className="font-mono h-10 text-sm bg-slate-50 border-slate-200 focus-visible:ring-[#001529]/20 focus-visible:border-[#001529] text-[#000000]"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                     />
                     <Button 
                       disabled={loading}
                       onClick={handleSearch}
                       className="bg-[#001529] hover:bg-slate-800 text-white font-black h-10 px-6 text-xs uppercase transition-all active:scale-95"
                     >
                       {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Identity"}
                     </Button>
                   </div>
                 </div>

                 {selectedPO && (
                   <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-inner">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-[#000000]">{selectedPO.po_number} Authenticated</span>
                         <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase tracking-tighter">{selectedPO.status}</Badge>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                         <div>
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Vendor Partner</p>
                           <p className="text-sm font-bold text-[#000000] leading-tight">
                             {Array.isArray(selectedPO.vendor) ? selectedPO.vendor[0]?.name : selectedPO.vendor?.name}
                           </p>
                         </div>
                         <div>
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Origin Branch</p>
                           <p className="text-sm font-bold text-[#000000] leading-tight">
                             {Array.isArray(selectedPO.branch) ? selectedPO.branch[0]?.name : selectedPO.branch?.name}
                           </p>
                         </div>
                       </div>
                     </div>

                     <div className="space-y-4">
                       <label className="text-[10px] font-black text-[#000000] uppercase tracking-widest flex items-center justify-between">
                         <span>2. Select Serialized Units</span>
                         <span className={cn(
                           "text-[9px] font-black px-2 py-0.5 rounded-full border",
                           selectedSerials.length > 0 ? "bg-[#001529] text-white border-[#001529]" : "bg-slate-100 text-slate-400 border-slate-200"
                         )}>
                           {selectedSerials.length} ITEM(S) IDENTIFIED
                         </span>
                       </label>
                       
                       <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                         {availableSerials.map((item) => (
                           <div 
                             key={item.id}
                             onClick={() => toggleSerialSelection(item.serial_number)}
                             className={cn(
                               "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group shadow-sm",
                               selectedSerials.includes(item.serial_number) 
                                 ? "border-[#001529] bg-blue-50/30" 
                                 : "border-slate-100 bg-white hover:border-slate-200"
                             )}
                           >
                             <div className="flex items-center gap-4">
                               <div className={cn(
                                 "h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-300",
                                 selectedSerials.includes(item.serial_number) 
                                   ? "bg-[#001529] border-[#001529] rotate-0" 
                                   : "border-slate-200 -rotate-12 group-hover:rotate-0 group-hover:border-slate-400"
                               )}>
                                 {selectedSerials.includes(item.serial_number) && <CheckCircle2 className="h-4 w-4 text-white" />}
                               </div>
                               <div>
                                 <p className="text-xs font-black text-[#000000] font-mono tracking-tight">{item.serial_number}</p>
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">
                                   {Array.isArray(item.product) ? item.product[0]?.model_name : item.product?.model_name}
                                 </p>
                               </div>
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-black text-[#000000]">₹{item.landed_cost.toLocaleString()}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Landed Cost</p>
                             </div>
                           </div>
                         ))}
                         {availableSerials.length === 0 && !loading && (
                            <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 gap-2">
                               <Package className="h-10 w-10 opacity-20" />
                               <p className="text-[9px] font-black uppercase tracking-widest">No available units found</p>
                            </div>
                         )}
                       </div>
                     </div>
                   </div>
                 )}
              </div>

              {/* Right Column: Reasoning & Proof */}
              <div className="col-span-2 p-8 bg-slate-50/50 space-y-8">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 font-bold text-[10px] uppercase tracking-tight">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#000000] uppercase tracking-widest">3. Primary Return Logic</label>
                    <Select value={returnReason} onValueChange={(v) => setReturnReason(v || "")}>
                      <SelectTrigger className="h-10 bg-white border-slate-200 text-[#001529] font-bold text-xs uppercase tracking-tight focus:ring-[#001529]">
                        <SelectValue placeholder="CHOOSE RETURN LOGIC..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 shadow-xl rounded-xl p-1">
                        {returnReasons.map(r => (
                          <SelectItem key={r.id} value={r.reason_text} className="text-xs font-bold text-[#001529] focus:bg-slate-50 cursor-pointer rounded-lg">
                            {r.reason_text}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#000000] uppercase tracking-widest">4. Damage Proof / Evidence</label>
                    <div 
                      className={cn(
                        "relative h-44 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group overflow-hidden bg-white shadow-sm",
                        damageProof ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-[#001529]/30 hover:bg-white"
                      )}
                      onClick={() => document.getElementById('damage-proof-input')?.click()}
                    >
                      {damageProof ? (
                        <>
                          <div className="bg-emerald-100 p-3 rounded-full">
                            <ImageIcon className="h-7 w-7 text-emerald-600" />
                          </div>
                          <div className="text-center px-6">
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter truncate block max-w-full">{damageProof.name}</span>
                            <p className="text-[8px] font-bold text-emerald-600/60 uppercase mt-0.5 tracking-widest">File Capture Successful</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDamageProof(null); }} className="absolute top-2 right-2 h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500 rounded-full">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="bg-slate-100 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
                            <ImageIcon className="h-7 w-7 text-slate-400 group-hover:text-[#001529]" />
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-[#001529] uppercase tracking-widest">Upload Damage Proof</span>
                            <p className="text-[8px] font-bold text-slate-300 uppercase mt-1 tracking-tighter">JPG, PNG allowed (Max 5MB)</p>
                          </div>
                        </>
                      )}
                      <input 
                        id="damage-proof-input"
                        type="file"
                        accept="image/*"
                        title="Upload Damage Proof"
                        className="hidden"
                        onChange={(e) => setDamageProof(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-slate-900 rounded-2xl space-y-2 border border-slate-700 shadow-xl">
                      <div className="flex items-center gap-2 text-[#7FD1E3]">
                         <ShieldAlert className="h-4 w-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Security Audit</span>
                      </div>
                      <p className="text-[9px] font-semibold text-slate-400 leading-tight">By confirming this transaction, the selected units will be removed from inventory and a corresponding Debit Note will be generated for the vendor.</p>
                  </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
             <div className="flex w-full gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="h-12 px-6 font-black uppercase text-xs border-slate-200 text-[#000000] hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={returnLoading || !selectedPO || selectedSerials.length === 0}
                  onClick={handleSubmitReturn}
                  className="flex-1 h-12 bg-[#001529] hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-900/10 transition-all active:scale-95 group"
                >
                  {returnLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                      Processing Return...
                    </>
                  ) : (
                    <>
                      Confirm Return Transaction
                      <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Debit Note Detail View Modal */}
      {viewingDebitNote && (
        <Dialog open={!!viewingDebitNote} onOpenChange={(open) => {
          if (!open) {
            setViewingDebitNote(null);
          }
        }}>
          <DialogContent className="w-[90vw] max-w-[1200px] sm:max-w-none h-[85vh] flex flex-col overflow-hidden p-0 gap-0 border-none shadow-2xl [&>button]:text-white">
            <DialogHeader className="bg-[#111827] p-8 text-white rounded-t-lg shrink-0">
              <div className="flex justify-between items-start w-full">
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tighter text-white m-0 leading-none">
                    Debit Note
                  </h1>
                  <div className="space-y-1">
                    <p className="text-xl font-bold m-0 flex items-center gap-2">
                      <span className="opacity-60 text-sm uppercase tracking-widest font-black">Ref:</span>
                      {viewingDebitNote.debit_note_number}
                    </p>
                    <DialogDescription className="text-slate-400 font-medium m-0">
                      <span className="opacity-60 text-[10px] uppercase tracking-widest font-black mr-2">Date:</span>
                      {new Date(viewingDebitNote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </DialogDescription>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-black text-white m-0 uppercase tracking-tighter">Ethan Home Appliances</p>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-black m-0 text-[#7FD1E3]">Reverse Logistics Division</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg">
                       <NextImage src="/ethan-logo.png" alt="Ethan Logo" width={40} height={40} className="h-10 w-auto object-contain" />
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-8 bg-white space-y-8">
              {/* Metadata Grid */}
              <div className="grid md:grid-cols-2 gap-8 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <Building2 className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Originating Branch</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="font-bold text-lg text-slate-900">{viewingDebitNote.branch?.name || viewingDebitNote.po?.branch?.name || 'Authorized Branch'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">
                      {viewingDebitNote.branch?.full_address || viewingDebitNote.po?.branch?.full_address || 'Ops360 Node Address Pending Retrieval'}
                    </p>
                    <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-wider">
                      GSTIN: {viewingDebitNote.branch?.gstin || viewingDebitNote.po?.branch?.gstin || '32AAAAA0000A1Z5'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <Truck className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendor Creditor</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="font-bold text-lg text-slate-900">{viewingDebitNote.vendor?.name || viewingDebitNote.vendor_name || 'Vendor Partner'}</p>
                    <p className="text-[10px] font-mono mt-1 text-slate-400 uppercase">
                      GSTIN: {viewingDebitNote.vendor?.gstin || viewingDebitNote.po?.vendor?.gstin || 'Verification Pending'}
                    </p>
                    <Badge variant="outline" className="mt-2 text-[8px] uppercase font-black px-2 py-0 border-blue-200 text-blue-700 bg-blue-50">
                      Linked to PO: {viewingDebitNote.po_number}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Transaction Breakdown */}
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Reversal Transaction details
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-100">
                        <TableHead className="min-w-[300px] font-black uppercase text-[10px] tracking-widest">Description of Reversal</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8">Deductible Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <TableCell className="py-6">
                          <div className="font-bold text-slate-900 text-base">Purchase Return: {viewingDebitNote.reason}</div>
                          {viewingDebitNote.serial_numbers && viewingDebitNote.serial_numbers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {viewingDebitNote.serial_numbers.map((sn, idx) => (
                                <Badge key={idx} variant="outline" className="text-[8px] font-mono font-bold bg-white text-blue-600 border-blue-100">
                                  {sn}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <span className="text-lg font-black text-[#001529]">{formatCurrency(viewingDebitNote.amount)}</span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-start pt-6 gap-10">
                  {/* Rejection Clause & Value in Words on the left */}
                  <div className="flex-1 space-y-6 pt-2">
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-inner">
                      <h4 className="text-xs font-black uppercase flex items-center gap-2 m-0 text-slate-800">
                        <AlertCircle className="h-4 w-4 text-rose-600" /> Rejection & Debit Clause
                      </h4>
                      <p className="text-[10px] font-bold leading-relaxed text-slate-600 italic m-0">
                        This debit note is issued in accordance with the purchase return protocol and quality inspection records. 
                        The corresponding amount will be adjusted against the vendor&apos;s pending invoices or future payment cycles. 
                        Acceptance of this return constitutes agreement to these financial adjustments.
                      </p>
                    </div>
                    
                    <div className="space-y-1.5 pl-2">
                       <Label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Total Reversal Value in Words</Label>
                       <p className="text-xs font-black italic m-0 underline decoration-slate-900 underline-offset-4 text-[#001529]">
                         {numberToWords(Math.round(viewingDebitNote.amount))}.
                       </p>
                    </div>
                  </div>

                  {/* Financial Summary Box on the right */}
                  <div className="w-[360px] space-y-3 p-8 rounded-2xl bg-[#001529] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                       <ShieldCheck className="h-16 w-16" />
                    </div>
                    {(() => {
                      const grandTotal = viewingDebitNote.amount;
                      const netValue = grandTotal / 1.18;
                      const cgst = netValue * 0.09;
                      const sgst = netValue * 0.09;

                      return (
                        <>
                          <div className="flex justify-between items-center text-xs opacity-80">
                            <span className="font-bold uppercase tracking-tight">Net Deductible</span>
                            <span className="font-black text-white">{formatCurrency(netValue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs opacity-80">
                            <span className="font-bold uppercase tracking-tight">CGST Reversed (9%)</span>
                            <span className="font-black text-white">{formatCurrency(cgst)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pb-3 border-b border-white/10 opacity-80">
                            <span className="font-bold uppercase tracking-tight">SGST Reversed (9%)</span>
                            <span className="font-black text-white">{formatCurrency(sgst)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-3">
                            <span className="text-sm font-black uppercase tracking-tighter text-[#7FD1E3]">Total Debit Value</span>
                            <span className="text-3xl font-black text-white drop-shadow-sm">{formatCurrency(grandTotal)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Audit Compliance */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative mt-8">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <ShieldCheck className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black uppercase tracking-tighter text-[#7FD1E3]">Reverse Logistics Integrity Audit</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Authorized Financial Recovery Mechanism</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[9px] font-black tracking-widest text-[#7FD1E3] uppercase mb-1">Scan for Validation</span>
                      <div className="bg-white p-1 rounded-lg shadow-inner shadow-slate-900/20">
                         <NextImage 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`OPS360-DN-MODAL-${viewingDebitNote.debit_note_number}`)}`} 
                            alt="Validation QR" 
                            width={48}
                            height={48}
                            unoptimized
                            className="h-12 w-12 block grayscale contrast-125 hover:grayscale-0 transition-all cursor-crosshair"
                          />
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-[11px] font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" /> Audited & Verified
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-6 border-t rounded-b-lg shrink-0">
              <div className="flex justify-between items-center w-full">
                <Button 
                  variant="outline" 
                  className="rounded-xl font-bold text-xs uppercase tracking-widest h-12 border-2 hover:bg-slate-100 transition-all px-8"
                  onClick={() => setViewingDebitNote(null)}
                >
                  Close Document
                </Button>
                <div className="flex gap-4">
                   <Button 
                    className="bg-[#001529] text-white hover:bg-slate-800 font-bold text-xs uppercase h-12 px-8 rounded-xl shadow-md transition-all active:scale-95 flex gap-2"
                    onClick={() => {
                        setLastDebitNote(viewingDebitNote);
                        setIsDownloading(viewingDebitNote.id);
                        setTimeout(() => handlePrint(), 500);
                    }}
                    disabled={isDownloading === viewingDebitNote.id}
                  >
                    {isDownloading === viewingDebitNote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Generate Formal PDF
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Hidden PDF Template */}
      <div className="fixed -left-[9999px] top-0">
        {lastDebitNote && (
          <DebitNotePrintTemplate
            ref={debitNoteRef}
            debitNote={lastDebitNote}
            vendor={{
              name: lastDebitNote.vendor?.name || 'Vendor',
              gstin: lastDebitNote.vendor?.gstin || 'N/A',
              address: 'N/A'
            }}
            branch={{
              name: lastDebitNote.branch?.name || 'HQ',
              full_address: lastDebitNote.branch?.full_address || 'N/A',
              gstin: lastDebitNote.branch?.gstin || 'N/A'
            }}
          />
        )}
      </div>
      {/* ── EDIT DEBIT NOTE MODAL ── */}
      <Dialog open={isOpenEditDN} onOpenChange={setIsOpenEditDN}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-amber-500" />
              Edit Debit Note: {editingDN?.debit_note_number}
            </DialogTitle>
            <DialogDescription>
              Update the return reason or amount for this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider">Return Reason</Label>
              <Select 
                value={editingDN?.reason || ""} 
                onValueChange={(v: string | null) => {
                  if (v && editingDN) setEditingDN({...editingDN, reason: v});
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent>
                  {returnReasons.map(r => (
                    <SelectItem key={r.id} value={r.reason_text}>{r.reason_text}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider">Landed Cost / Debit Amount (₹)</Label>
              <Input 
                type="number"
                value={editingDN?.amount}
                onChange={(e) => editingDN && setEditingDN({...editingDN, amount: Number(e.target.value)})}
                className="font-mono"
              />
              <p className="text-[10px] text-slate-400 italic">Warning: Manual amount edits should only be done if the calculated landed cost was incorrect.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenEditDN(false)} disabled={returnLoading}>Cancel</Button>
            <Button onClick={handleUpdateDN} disabled={returnLoading} className="bg-[#001529]">
              {returnLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
