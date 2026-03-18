"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
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
  ShieldCheck
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
  const [isDownloading, setIsDownloading] = useState(false)
  const [returns, setReturns] = useState<DebitNoteData[]>([])
  const [fetchingReturns, setFetchingReturns] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [reasonFilter, setReasonFilter] = useState("all")
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
    onAfterPrint: () => setIsDownloading(false)
  })

  const fetchReturns = useCallback(async () => {
    setFetchingReturns(true)
    try {
      const { data, error } = await supabase
        .from("debit_notes")
        .select(`
          *,
          po:po_id(
            po_number,
            branch:branch_id(name, full_address, gstin),
            vendor:vendor_id(name, gstin)
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setReturns((data as any[]).map((item) => ({
          ...item,
          po_number: item.po?.po_number || 'UNKNOWN',
          vendor_name: item.po?.vendor?.name || 'UNKNOWN',
          vendor: item.po?.vendor,
          branch: item.po?.branch,
          serial_numbers: (item.metadata as any)?.serial_numbers || item.serial_numbers || []
        })))
      }
    } catch (err) {
      console.error("Failed to fetch returns", err)
    } finally {
      setFetchingReturns(false)
    }
  }, [supabase])

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

  return (
    <div className="flex-1 space-y-8 mt-0">
      <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none overflow-hidden py-0">
        <CardHeader className="bg-[#001529] text-white pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none">
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
                    setIsDownloading(true);
                    setTimeout(() => handlePrint(), 500);
                  }}
                  disabled={isDownloading}
                  className="bg-[#001529] hover:bg-slate-800 text-white gap-2 font-black uppercase text-xs h-10 px-6"
                >
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download Debit Note PDF
                </Button>
              </div>
            )}
          </div>
        )}

        {error && !isReturnModalOpen && (
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b">
                  <TableRow>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Return ID</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase text-center">Execution Hub</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Original PO</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Vendor</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Return Logic</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Landed Cost / Debit Note</TableHead>
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
                      <TableCell className="py-3 px-4 border-r border-slate-100/50">
                        <Badge className={cn(
                          "text-[9px] px-2 py-0.5 font-black uppercase tracking-tighter",
                          ret.status === 'Paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
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
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => {
                                setLastDebitNote(ret);
                                setIsDownloading(true);
                                setTimeout(() => handlePrint(), 500);
                              }}
                              className="text-slate-700 font-medium cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Debit Note
                            </DropdownMenuItem>
                            {ret.evidence_url && (
                              <DropdownMenuItem 
                                onClick={() => window.open(ret.evidence_url, '_blank')}
                                className="text-blue-600 focus:text-blue-600 font-medium cursor-pointer"
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
        <DialogContent className="sm:max-w-4xl w-full p-0 overflow-hidden border-none shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
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
    </div>
  )
}
