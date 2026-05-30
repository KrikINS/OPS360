"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Loader2, Search, Settings2, X, CheckCircle2, RotateCcw, AlertTriangle, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/utils/format"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from "@/components/ui/dropdown-menu"
import { ChevronDown, PencilLine, History, Eye } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

type Discrepancy = {
  id: string;
  po_id: string;
  vendor_id: string;
  discrepancy_type: string;
  detected_gap: number;
  status: string;
  admin_comment: string | null;
  created_at: string;
  resolved_at: string | null;
  display_id?: string;
  po?: { 
    po_number: string; 
    total_amount: number;
    items: Array<{
      id: string;
      unit_price: number;
      quantity: number;
      received_quantity: number;
    }>
  };
  vendor?: { name: string };
  product?: { model_name: string };
};

export default function DiscrepancyReportPage() {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  
  // Resolution Modal State
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false)
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null)
  const [adminComment, setAdminComment] = useState("")
  const [isResolving, setIsResolving] = useState(false)
  
  // Advanced Actions State
  const [reopenModalOpen, setReopenModalOpen] = useState(false)
  const [editGapModalOpen, setEditGapModalOpen] = useState(false)
  const [viewNoteModalOpen, setViewNoteModalOpen] = useState(false)
  const [newGapValue, setNewGapValue] = useState("")
  const [reopenReason, setReopenReason] = useState("")
  const [isUpdatingAction, setIsUpdatingAction] = useState(false)
  
  const router = useRouter()

  

  const fetchDiscrepancies = useCallback(async () => {
    setLoading(true)
    const { data, error } = await import("@/app/actions/generics").then(m => m.fetchData('discrepancies'))

    if (!error && data && Array.isArray(data)) {
      setDiscrepancies(data as Discrepancy[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDiscrepancies()
  }, [fetchDiscrepancies])

  const handleResolve = async (action: 'return' | 'accept') => {
    if (!selectedDiscrepancy) return
    setIsResolving(true)

    try {
      if (action === 'accept') {
        if (!adminComment) {
          alert("Admin comment is required to accept variance.")
          setIsResolving(false)
          return
        }
        
        const { error } = await import("@/app/actions/generics").then(m => m.updateData('discrepancies', {
          id: selectedDiscrepancy.id,
          status: 'Resolved', 
          admin_comment: adminComment,
          resolved_at: new Date().toISOString()
        }))

        if (error) throw error

        // Sync PO status to MATCHED in the audit trail
        await fetch('/api/procurement/purchase-orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: selectedDiscrepancy.po_id, 
            status: 'received',
            is_audit_matched: true
          })
        })
      } else if (action === 'return') {
        // Link to Return logic: Update status and redirect to Procurement Returns tab
        const { error } = await import("@/app/actions/generics").then(m => m.updateData('discrepancies', {
          id: selectedDiscrepancy.id,
          status: 'Investigating',
          admin_comment: "Linked to Purchase Return workflow."
        }))

        if (error) throw error
        
        // Use router to navigate to the returns tab
        router.push('/procurement?tab=returns')
        return
      }

      setResolutionModalOpen(false)
      setAdminComment("")
      fetchDiscrepancies()
    } catch (err) {
      console.error("Resolution failed", err)
      alert("Resolution failed. Please try again.")
    } finally {
      setIsResolving(false)
    }
  }

  const handleUpdateAction = async (action: 'reopen' | 'update_gap') => {
    if (!selectedDiscrepancy) return
    setIsUpdatingAction(true)

    try {
      if (action === 'reopen') {
        const { error } = await import("@/app/actions/generics").then(m => m.updateData('discrepancies', {
          id: selectedDiscrepancy.id,
          status: 'Investigating', 
          admin_comment: `REOPENED: ${reopenReason}\n\nPREVIOUS NOTE: ${selectedDiscrepancy.admin_comment}`,
          resolved_at: null
        }))

        if (error) throw error
        setReopenModalOpen(false)
        setReopenReason("")
      } else if (action === 'update_gap') {
        const { error } = await import("@/app/actions/generics").then(m => m.updateData('discrepancies', {
          id: selectedDiscrepancy.id,
          detected_gap: Number(newGapValue)
        }))

        if (error) throw error
        setEditGapModalOpen(false)
        setNewGapValue("")
      }

      fetchDiscrepancies()
    } catch (err) {
      console.error("Action failed", err)
      alert("Action failed. Please try again.")
    } finally {
      setIsUpdatingAction(false)
    }
  }

  // Create a stable mapping of IDs based on creation date
  const allSortedDiscrepancies = [...discrepancies].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  
  const filteredDiscrepancies = discrepancies.filter(item => {
    const searchMatch = !searchTerm || 
      item.po?.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const statusMatch = statusFilter === "all" || item.status === statusFilter
    const typeMatch = typeFilter === "all" || item.discrepancy_type === typeFilter
    
    return searchMatch && statusMatch && typeMatch
  })

  if (loading && discrepancies.length === 0) return (
    <div className="flex flex-col h-64 items-center justify-center gap-4">
      <Loader2 className="animate-spin h-8 w-8 text-[#001529]" />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auditing Variance Logs...</span>
    </div>
  )

  return (
    <div className="flex-1 space-y-8 mt-0">
      <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none overflow-hidden text-xs py-0">
        <CardHeader className="bg-[#001529]/95 backdrop-blur-md sticky top-0 z-20 pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none shadow-[0_4px_12px_-4px_rgba(0,21,41,0.35)] text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                Discrepancy Report Registry
              </CardTitle>
              <CardDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Fiscal & Inventory Mismatch Management
              </CardDescription>
            </div>
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
                {showFilters ? "Hide Filters" : "Filter Registry"}
              </Button>

              <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-white/40 border-white/10">
                Live Audit Stream
              </Badge>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search by ID, PO Number or Vendor..."
                  className="pl-9 h-8 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/30 rounded-lg text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Type</span>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || "all")}>
                  <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001529] border-white/10 text-white">
                    <SelectGroup>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Price Mismatch">Price Mismatch</SelectItem>
                      <SelectItem value="Quantity Mismatch">Quantity Mismatch</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Status</span>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
                  <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001529] border-white/10 text-white">
                    <SelectGroup>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Investigating">Investigating</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setTypeFilter("all")
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
          <div className="overflow-auto max-h-[calc(100vh-380px)] border-b scrollbar-thin scrollbar-thumb-slate-200">
            <Table>
              <TableHeader className="bg-slate-50 border-b sticky top-0 z-10 shadow-sm transition-all duration-300">
                <TableRow>
                  <TableHead className="py-3 px-3 font-black text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Discrepancy ID</TableHead>
                  <TableHead className="py-3 px-2 font-black text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase text-center">Reference / Product</TableHead>
                  <TableHead className="py-3 px-2 font-black text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase">Vendor</TableHead>
                  <TableHead className="py-3 px-2 font-black text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase text-center">Discrepancy Type</TableHead>
                  <TableHead className="py-3 px-2 font-black text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase text-right">Detected Gap</TableHead>
                  <TableHead className="py-3 px-2 font-black text-slate-400 tracking-wider text-[9px] border-r border-slate-100 uppercase text-center">Status</TableHead>
                  <TableHead className="py-3 px-3 font-black text-slate-400 tracking-wider text-[9px] uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscrepancies.map((item: Discrepancy) => (
                  <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0 text-[11px]">
                    <TableCell className="py-4 px-3 font-black text-[#001529] font-mono border-r border-slate-100/50">
                      {item.display_id || `EHA-DR-${(allSortedDiscrepancies.findIndex(d => d.id === item.id) + 1).toString().padStart(4, '0')}`}
                    </TableCell>
                    <TableCell className="py-4 px-2 font-bold text-[#001529] font-mono border-r border-slate-100/50">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px]">{item.po?.po_number || "NO_REF"}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                          {item.product?.model_name || "Unknown Product"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-2 font-bold text-slate-600 border-r border-slate-100/50">
                      {item.vendor?.name}
                    </TableCell>
                    <TableCell className="py-4 px-2 border-r border-slate-100/50 text-center">
                      <Badge variant="secondary" className={cn(
                        "font-black text-[9px] uppercase tracking-tighter py-0 px-2 shadow-sm border",
                        item.discrepancy_type === 'Price Mismatch' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
                      )}>
                        {item.discrepancy_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-2 border-r border-slate-100/50 text-right font-black font-mono">
                      <div className={cn(
                        "text-sm",
                        item.detected_gap < 0 ? "text-red-500" : "text-emerald-600"
                      )}>
                        {item.discrepancy_type.toUpperCase() === 'QUANTITY_MISMATCH' || item.discrepancy_type === 'Quantity Mismatch'
                          ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold">{item.detected_gap} Unit{Math.abs(item.detected_gap) !== 1 ? 's' : ''}</span>
                              <span className="text-[9px] opacity-50 font-bold">
                                {item.detected_gap < 0 ? 'SHRINKAGE' : 'OVERAGE'}
                              </span>
                            </div>
                          )
                          : formatCurrency(item.detected_gap)
                        }
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-2 border-r border-slate-100/50 text-center">
                      <Badge className={cn(
                        "text-[9px] px-2 py-0.5 font-black uppercase tracking-tighter ring-1",
                        item.status === 'Resolved' ? "bg-emerald-100 text-emerald-700 ring-emerald-200" :
                        item.status === 'Investigating' ? "bg-blue-100 text-blue-700 ring-blue-200" : 
                        "bg-amber-100 text-amber-700 ring-amber-200"
                      )}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-3">
                      <div className="flex justify-start">
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(
                            buttonVariants({ variant: "outline", size: "xs" }),
                            "bg-[#001529] hover:bg-slate-800 text-white border-none h-8 px-4 text-[11px] font-bold gap-2 transition-all active:scale-95"
                          )}>
                            Actions <ChevronDown className="h-3 w-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-xl rounded-xl p-1 font-bold text-[10px] uppercase tracking-wider">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1">
                                Audit Options
                              </DropdownMenuLabel>
                              
                              {item.status !== 'Resolved' ? (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedDiscrepancy(item);
                                    setResolutionModalOpen(true);
                                  }}
                                  className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-lg"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve Discrepancy
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedDiscrepancy(item);
                                    setReopenModalOpen(true);
                                  }}
                                  className="text-amber-600 focus:text-amber-700 focus:bg-amber-50 cursor-pointer font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-lg"
                                >
                                  <History className="h-4 w-4 mr-2" /> Reopen Investigation
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedDiscrepancy(item);
                                  setNewGapValue(item.detected_gap.toString());
                                  setEditGapModalOpen(true);
                                }}
                                className="text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-lg"
                              >
                                <PencilLine className="h-4 w-4 mr-2" /> Edit Gap Value
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 bg-slate-100" />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedDiscrepancy(item);
                                  setViewNoteModalOpen(true);
                                }}
                                className="text-slate-600 focus:text-slate-900 focus:bg-slate-50 cursor-pointer font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-lg"
                              >
                                <Eye className="h-4 w-4 mr-2" /> View Resolution Note
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDiscrepancies.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4 opacity-20 grayscale">
                          <ShieldAlert className="h-16 w-16" />
                          <div className="space-y-1 text-center">
                            <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">Zero Variance Environment</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">No discrepancies detected for current filter profile</p>
                          </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resolution Modal */}
      <Dialog open={resolutionModalOpen} onOpenChange={setResolutionModalOpen}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-2xl overflow-hidden p-0">
          <DialogHeader className="bg-[#001529] p-6 text-white text-left">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="bg-red-500 p-2 rounded-lg flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-white" />
              </span>
              Execute Resolution Logic
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium text-xs mt-2">
              Select a corporate resolution path for the detected mismatch in <span className="text-white font-mono">{selectedDiscrepancy?.po?.po_number}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mismatch Type</p>
                <p className="text-sm font-black text-slate-900">{selectedDiscrepancy?.discrepancy_type}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Detected Gap</p>
                <p className="text-sm font-black text-red-500">
                  {selectedDiscrepancy?.discrepancy_type.toUpperCase() === 'QUANTITY_MISMATCH' || selectedDiscrepancy?.discrepancy_type === 'Quantity Mismatch'
                    ? `${selectedDiscrepancy?.detected_gap} Unit${Math.abs(selectedDiscrepancy?.detected_gap || 0) !== 1 ? 's' : ''}`
                    : formatCurrency(selectedDiscrepancy?.detected_gap || 0)
                  }
                </p>
              </div>
            </div>

            <div className="space-y-3">
               <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <MessageSquare className="h-3 w-3" /> Audit Investigation Comment
               </Label>
               <Textarea
                placeholder="Business justification (e.g., Vendor provided 2% cash discount, accepted discrepancy for urgent processing)..."
                className="min-h-[120px] text-xs"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <p className={cn(
                  "text-[10px] font-bold",
                  adminComment.length >= 20 ? "text-emerald-600" : "text-amber-600"
                )}>
                  {adminComment.length < 20 
                    ? `Minimum 20 characters required: ${adminComment.length}/20` 
                    : "✓ Comment length sufficient"
                  }
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="text-red-500 border-red-100 hover:bg-red-50 font-bold" onClick={() => setResolutionModalOpen(false)}>Cancel</Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleResolve('accept')}
                    disabled={adminComment.length < 20 || isResolving}
                  >
                    {isResolving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Accept Variance
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
               <Button 
                 variant="outline"
                 onClick={() => handleResolve('return')}
                 className="border-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-300 font-black h-12 flex flex-col gap-0 transition-all active:scale-95"
               >
                 <span className="text-xs">Link to Return</span>
                 <span className="text-[8px] opacity-60">Logistics Shortfall</span>
                 <RotateCcw className="absolute right-2 opacity-10 h-8 w-8" />
               </Button>
               
               <Button 
                 onClick={() => handleResolve('accept')}
                 disabled={adminComment.length < 20 || isResolving}
                 className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 flex flex-col gap-0 transition-all active:scale-95 overflow-hidden group shadow-lg shadow-emerald-600/20"
               >
                 {isResolving ? (
                   <Loader2 className="h-5 w-5 animate-spin" />
                 ) : (
                   <>
                     <span className="text-xs">Accept Variance</span>
                     <span className="text-[8px] opacity-60">Manual Ledger Update</span>
                     <CheckCircle2 className="absolute right-2 opacity-10 h-8 w-8 group-hover:opacity-20 transition-opacity" />
                   </>
                 )}
               </Button>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-2 text-red-500 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">Permanent Audit Record</span>
             </div>
             <Button variant="outline" size="sm" onClick={() => setResolutionModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-red-500 border-red-100 hover:bg-red-50">
               Close
             </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reopen Modal */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-2xl overflow-hidden p-0">
          <DialogHeader className="bg-amber-600 p-6 text-white text-left">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="bg-amber-500 p-2 rounded-lg flex items-center justify-center">
                <History className="h-5 w-5 text-white" />
              </span>
              Reopen Investigation
            </DialogTitle>
            <DialogDescription className="text-amber-100 font-medium text-xs mt-2">
              Provide a reason for reopening the audit for <span className="text-white font-mono">{selectedDiscrepancy?.po?.po_number}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reason for Reopening</Label>
              <Textarea 
                placeholder="E.g., Incorrect original assessment, new vendor feedback..."
                className="min-h-[100px] text-xs font-medium"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" className="text-red-500 border-red-100 hover:bg-red-50 font-bold" onClick={() => setReopenModalOpen(false)}>Cancel</Button>
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={() => handleUpdateAction('reopen')}
                disabled={!reopenReason || isUpdatingAction}
              >
                {isUpdatingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Reopen Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Gap Modal */}
      <Dialog open={editGapModalOpen} onOpenChange={setEditGapModalOpen}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-2xl overflow-hidden p-0">
          <DialogHeader className="bg-blue-600 p-6 text-white text-left">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="bg-blue-600 p-2 rounded-lg flex items-center justify-center">
                <PencilLine className="h-5 w-5 text-white" />
              </span>
              Adjust Fiscal Gap
            </DialogTitle>
            <DialogDescription className="text-blue-100 font-medium text-xs mt-2">
              Manually correct the detected variance amount for audit accuracy.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                New Gap Value ({selectedDiscrepancy?.discrepancy_type.toUpperCase() === 'QUANTITY_MISMATCH' || selectedDiscrepancy?.discrepancy_type === 'Quantity Mismatch' ? 'Physical Units' : 'Landed Cost'})
              </Label>
              <div className="relative">
                {!(selectedDiscrepancy?.discrepancy_type.toUpperCase() === 'QUANTITY_MISMATCH' || selectedDiscrepancy?.discrepancy_type === 'Quantity Mismatch') && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                )}
                <Input 
                  type="number"
                  className={cn(
                    "font-black text-lg",
                    !(selectedDiscrepancy?.discrepancy_type.toUpperCase() === 'QUANTITY_MISMATCH' || selectedDiscrepancy?.discrepancy_type === 'Quantity Mismatch') && "pl-7"
                  )}
                  value={newGapValue}
                  onChange={(e) => setNewGapValue(e.target.value)}
                />
                {(selectedDiscrepancy?.discrepancy_type.toUpperCase() === 'QUANTITY_MISMATCH' || selectedDiscrepancy?.discrepancy_type === 'Quantity Mismatch') && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Unit(s)</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-bold italic mt-1">
                Format: {selectedDiscrepancy?.discrepancy_type.toUpperCase() === 'QUANTITY_MISMATCH' || selectedDiscrepancy?.discrepancy_type === 'Quantity Mismatch'
                  ? `${newGapValue} Unit(s)`
                  : formatCurrency(Number(newGapValue) || 0)
                }
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" className="text-red-500 border-red-100 hover:bg-red-50 font-bold" onClick={() => setEditGapModalOpen(false)}>Cancel</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={() => handleUpdateAction('update_gap')}
                disabled={isUpdatingAction}
              >
                {isUpdatingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Update Value
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Note Modal */}
      <Dialog open={viewNoteModalOpen} onOpenChange={setViewNoteModalOpen}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-2xl overflow-hidden p-0">
          <DialogHeader className="bg-slate-800 p-6 text-white text-left">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="bg-slate-800 p-2 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-white" />
              </span>
              Resolution History
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium text-xs mt-2">
              Permanent audit log for <span className="text-white font-mono">{selectedDiscrepancy?.po?.po_number}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[120px]">
              <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap">
                {selectedDiscrepancy?.admin_comment || "No audit notes recorded."}
              </p>
            </div>
            <div className="flex justify-end mt-2">
              <Button className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100 font-black uppercase text-[10px] tracking-widest h-10 w-full" onClick={() => setViewNoteModalOpen(false)}>
                Close Portal View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={cn("block", className)}>{children}</label>
}
