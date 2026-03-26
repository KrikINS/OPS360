"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useReactToPrint } from "react-to-print"
import { WaybillPrintTemplate } from "@/components/transfer/WaybillPrintTemplate"
import { Input } from "@/components/ui/input"
import { 
  AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, Clock, History, Loader2, 
  Package, Plus, Printer, Search, Send, ShieldCheck, Trash2
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Badge } from "@/components/ui/badge"
import { type StockRequest } from "./StockRequestsView"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Branch = {
  id: string
  name: string
  code: string
}

type Product = {
  id: string
  model_name: string
  product_code: string
  brand: string
}

type InventoryUnit = {
  id: string
  serial_number: string
  product_id: string
  status: string
}

type TransferItem = {
  product: Product
  unit: InventoryUnit
}

type StockTransfer = {
  id: string
  transfer_number: string
  source_branch_id: string
  destination_branch_id: string
  status: 'Pending' | 'In-Transit' | 'Completed' | 'Cancelled'
  originator_id: string
  received_by?: string
  condition_notes?: string
  created_at: string
  completed_at?: string
  stock_request_id?: string
  source_branch?: { name: string, code: string }
  destination_branch?: { name: string, code: string }
  originator?: { full_name: string }
  items?: { id: string, serial_number: string, product: { model_name: string } }[]
  item_count: number
}

type WaybillData = {
  transfer_details: {
    number: string
    status: string
    created_at: string
    completed_at: string | null
  }
  source_branch: {
    name: string
    address: string
  }
  destination_branch: {
    name: string
    address: string
  }
  originator: {
    full_name: string
  }
  items: {
    model_name: string
    category: string
    serial_number: string
  }[]
}

export function StockTransfersView({ 
  prefillRequest, 
  onClearPrefill 
}: { 
  prefillRequest?: StockRequest | null
  onClearPrefill?: () => void
}) {
  const supabase = createClient()
  const [branches, setBranches] = useState<Branch[]>([])
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  
  // Create Transfer State
  const [userBranchId, setUserBranchId] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState("")
  const [destId, setDestId] = useState("")
  const [transferCart, setTransferCart] = useState<TransferItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [inventorySearch, setInventorySearch] = useState("")
  const [inventoryResults, setInventoryResults] = useState<(InventoryUnit & { product: Product })[]>([])

  // Waybill Print State
  const printRef = useRef<HTMLDivElement>(null)
  const [lastTransferNumber, setLastTransferNumber] = useState<string | null>(null)
  const [waybillData, setWaybillData] = useState<WaybillData | null>(null)
  const [printing, setPrinting] = useState(false)
  const [transferSearch, setTransferSearch] = useState("")

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Waybill-${lastTransferNumber}`,
    onAfterPrint: () => setPrinting(false)
  })

  const fetchAndPrintWaybill = async (transferNumber: string) => {
    setPrinting(true)
    try {
      const { data, error } = await supabase.rpc('get_waybill_data', {
        p_transfer_number: transferNumber
      })
      if (error) throw error
      if (data) {
        setWaybillData(data)
        // Wait for state to update and template to render
        setTimeout(() => {
          handlePrint()
        }, 300)
      }
    } catch (err) {
      console.error("Failed to fetch waybill data", err)
      alert("Failed to load waybill for printing.")
      setPrinting(false)
    }
  }

  // Receiving State
  const [receivingTx, setReceivingTx] = useState<StockTransfer | null>(null)
  const [receivingItems, setReceivingItems] = useState<TransferItem[]>([])
  const [discrepancyMode, setDiscrepancyMode] = useState(false)
  const [discrepancyNotes, setDiscrepancyNotes] = useState("")

  useEffect(() => {
    if (prefillRequest) {
      setDestId(prefillRequest.requesting_branch_id)
      setIsCreating(true)
    }
  }, [prefillRequest])

  const fetchTransfers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('stock_transfers')
      .select(`
        *,
        source_branch:branches!source_branch_id(name, code),
        destination_branch:branches!destination_branch_id(name, code),
        items:stock_transfer_items(id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Failed to load transfers", error)
    } else {
      const typedData = (data || []) as (StockTransfer & { items: { id: string }[] })[]
      setTransfers(typedData.map((t) => ({
        ...t,
        item_count: t.items?.length || 0
      })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: branchData } = await supabase.from('branches').select('id, name, code')
      const { data: authData } = await supabase.auth.getUser()
      
      if (branchData) setBranches(branchData)
      
      if (authData?.user?.id) {
        const { data: userProfile } = await supabase.from('profiles').select('assigned_branch_id').eq('id', authData.user.id).single()
        if (userProfile?.assigned_branch_id) {
          setUserBranchId(userProfile.assigned_branch_id)
          setSourceId(userProfile.assigned_branch_id)
        }
      }
      
      await fetchTransfers()
    }
    init()
  }, [supabase, fetchTransfers])

  const searchInventory = async (term: string) => {
    setInventorySearch(term)
    if (term.length < 2) {
      setInventoryResults([])
      return
    }

    try {
      const { data: serialMatches } = await supabase
        .from('inventory')
        .select('id, serial_number, product_id, status, product:products(id, model_name, product_code, brand)')
        .eq('branch_id', sourceId || userBranchId || "")
        .eq('status', 'Available')
        .ilike('serial_number', `%${term}%`)
        .limit(10)

      const { data: productMatches } = await supabase
        .from('products')
        .select('id, model_name, product_code, brand')
        .or(`model_name.ilike.%${term}%,product_code.ilike.%${term}%`)
        .limit(5)

      let finalResults = [...(serialMatches || [])] as (InventoryUnit & { product: Product })[]

      if (productMatches && productMatches.length > 0) {
        const { data: productUnitMatches } = await supabase
          .from('inventory')
          .select('id, serial_number, product_id, status, product:products(id, model_name, product_code, brand)')
          .eq('branch_id', sourceId || userBranchId || "")
          .eq('status', 'Available')
          .in('product_id', productMatches.map((p: { id: string }) => p.id))
          .limit(10)
        
        if (productUnitMatches) {
          const newUnits = (productUnitMatches as (InventoryUnit & { product: Product })[]).filter(
            u => !finalResults.find(fr => fr.id === u.id)
          )
          finalResults = [...finalResults, ...newUnits]
        }
      }

      setInventoryResults(finalResults.slice(0, 10))
    } catch (err) {
      console.error("Search failed:", err)
      setInventoryResults([])
    }
  }

  const removeFromTransfer = (id: string) => {
    setTransferCart(transferCart.filter(i => i.unit.id !== id))
  }

  const submitTransfer = async () => {
    if (!sourceId || !destId || transferCart.length === 0) {
      alert("Please ensure both source and destination branches are selected and at least one item is added.")
      return
    }

    // Strict Validation for Requests
    if (prefillRequest) {
      const isMet = prefillRequest.items.every(reqItem => {
        const addedCount = transferCart.filter(cartItem => cartItem.product.id === reqItem.product_id).length
        return addedCount === reqItem.quantity
      })

      if (!isMet) {
        alert("CRITICAL: You must manifest the EXACT quantity requested before shipping. Please add the required serial numbers.")
        return
      }
    }

    setSubmitting(true)
    try {
      const rpcName = prefillRequest ? 'fulfill_stock_request' : 'process_stock_transfer_send'
      const rpcParams = prefillRequest 
        ? { p_request_id: prefillRequest.id, p_inventory_ids: transferCart.map(i => i.unit.id) }
        : { p_source_branch_id: sourceId, p_destination_branch_id: destId, p_inventory_ids: transferCart.map(i => i.unit.id), p_notes: "" }

      const { data: transferNumber, error } = await supabase.rpc(rpcName, rpcParams)
      
      if (error) throw error

      setLastTransferNumber(transferNumber)
      alert(prefillRequest ? `Request fulfilled. Waybill ${transferNumber} generated.` : `Transfer ${transferNumber} initiated.`)
      
      // Keep modal open but clear cart to allow printing
      setTransferCart([])
      if (prefillRequest) onClearPrefill?.()
      await fetchTransfers()
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to create transfer")
    } finally {
      setSubmitting(false)
    }
  }

  const openReceiveVerification = async (tx: StockTransfer) => {
    setReceivingTx(tx)
    setDiscrepancyMode(false)
    setDiscrepancyNotes("")
    
    try {
      const { data } = await supabase
        .from('stock_transfer_items')
        .select(`
          inventory_id,
          inventory:inventory(serial_number),
          product:products(model_name, id)
        `)
        .eq('transfer_id', tx.id)

      if (data) {
        const typedData = data as { 
          inventory_id: string; 
          inventory: { serial_number: string }; 
          product: { id: string; model_name: string } 
        }[]
        setReceivingItems(typedData.map((item) => ({
          unit: {
            id: item.inventory_id,
            serial_number: item.inventory.serial_number,
            product_id: item.product?.id || '',
            status: 'In-Transit'
          },
          product: {
            id: item.product?.id || '',
            model_name: item.product?.model_name || 'Unknown',
            product_code: '',
            brand: ''
          }
        })))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const confirmReceipt = async () => {
    if (!receivingTx) return
    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('receive_stock_transfer', {
        p_transfer_id: receivingTx.id,
        p_notes: discrepancyMode ? discrepancyNotes : ""
      })

      if (error) throw error

      alert("Inventory synced successfully.")
      setReceivingTx(null)
      await fetchTransfers()
    } catch (err: unknown) {
      alert((err as Error).message || "Receipt failed")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Completed': return "bg-emerald-50 text-emerald-600 border-emerald-100"
      case 'Pending': return "bg-amber-50 text-amber-600 border-amber-100"
      case 'Cancelled': return "bg-slate-50 text-slate-400 border-slate-100"
      default: return "bg-slate-50 text-slate-600 border-slate-100"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            Inter-Branch Redistribution
          </h2>
          <p className="text-xs text-slate-500 font-medium">Manage waybills and cross-branch logistics.</p>
        </div>

        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger 
            render={
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg font-black h-10 px-4 rounded-xl gap-2 flex items-center text-white text-xs">
                <Plus className="h-4 w-4" />
                INITIATE TRANSFER
              </Button>
            }
          />
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">New Stock Transfer</DialogTitle>
              <DialogDescription>Move physical units from one branch to another.</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Dispatch From</label>
                <Select value={sourceId} onValueChange={(val) => setSourceId(val || "")}>
                  <SelectTrigger className="h-12 border-slate-200">
                    <SelectValue placeholder="Dispatch From">
                      {branches.find(b => b.id === sourceId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Receive At</label>
                <Select value={destId} onValueChange={(val) => setDestId(val || "")}>
                  <SelectTrigger className="h-12 border-slate-200">
                    <SelectValue placeholder="Receive At">
                      {branches.find(b => b.id === destId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id} disabled={b.id === sourceId}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {prefillRequest && (
              <Card className="bg-blue-50/50 border-blue-100 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    <h4 className="text-[10px] font-black uppercase text-blue-900 tracking-wider">
                      Fulfilling Request {prefillRequest.request_number}
                    </h4>
                  </div>
                  <Badge className="bg-blue-600 text-[8px] font-black h-5 px-2">
                    DEMAND MANIFEST
                  </Badge>
                </div>
                <div className="space-y-2">
                  {prefillRequest.items.map(item => {
                    const addedCount = transferCart.filter(i => i.product.id === item.product_id).length
                    const isMet = addedCount >= item.quantity
                    return (
                      <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-100/50 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-800 tracking-tight">{item.product.model_name}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Need: {item.quantity} units</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded",
                            isMet ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {addedCount} / {item.quantity}
                          </span>
                          {isMet && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search Serial Number or Model..."
                  className="pl-10 h-12 bg-slate-50 border-none shadow-inner"
                  value={inventorySearch}
                  onChange={(e) => searchInventory(e.target.value)}
                />
              </div>

              {inventoryResults.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-2 space-y-1 border border-slate-100 max-h-40 overflow-y-auto">
                  {inventoryResults.map(unit => (
                    <button
                      key={unit.id}
                      onClick={() => {
                             if (unit.product && !transferCart.find(i => i.unit.id === unit.id)) {
                               setTransferCart([...transferCart, { product: unit.product, unit }]);
                               setInventorySearch("");
                               setInventoryResults([]);
                             }
                           }}
                      className="w-full flex items-center justify-between p-2 hover:bg-white rounded-xl transition-colors text-left"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-600 tracking-tight">{unit.serial_number}</span>
                        <span className="text-xs font-bold text-slate-700">{unit.product.model_name}</span>
                      </div>
                      <Plus className="h-4 w-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Transfer Manifest ({transferCart.length} Units)
                </label>
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  {transferCart.length === 0 ? (
                    <div className="p-12 text-center text-slate-300 italic text-xs flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-20" />
                      No units selected
                    </div>
                  ) : (
                    <Table>
                      <TableBody>
                        {transferCart.map(item => (
                          <TableRow key={item.unit.id} className="group border-b last:border-0 h-16">
                            <TableCell className="py-2 px-4">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">SN: {item.unit.serial_number}</span>
                                <span className="text-xs font-black text-slate-800">{item.product.model_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-4">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => removeFromTransfer(item.unit.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => {
                  setIsCreating(false)
                  setLastTransferNumber(null)
                  setTransferCart([])
                }} className="font-bold text-slate-500 hover:bg-slate-100">Close</Button>
                
                {lastTransferNumber && (
                  <Button 
                    variant="outline"
                    className="border-blue-200 text-blue-600 font-black hover:bg-blue-50 h-12 rounded-xl px-6 gap-2"
                    onClick={() => fetchAndPrintWaybill(lastTransferNumber)}
                    disabled={printing}
                  >
                    {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    PRINT WAYBILL
                  </Button>
                )}
              </div>

              {!lastTransferNumber && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 font-black px-8 h-12 rounded-xl shadow-lg shadow-blue-200"
                  onClick={submitTransfer}
                  disabled={
                    !!(submitting || 
                    transferCart.length === 0 || 
                    !destId ||
                    (prefillRequest && !prefillRequest.items.every(reqItem => 
                      transferCart.filter(cartItem => cartItem.product.id === reqItem.product_id).length === reqItem.quantity
                    )))
                  }
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  CONFIRM SHIPMENT
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 bg-slate-100/50 p-1 rounded-xl h-12 w-full max-w-md shadow-sm">
          <TabsTrigger value="active" className="flex-1 rounded-lg px-6 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <Clock className="h-3.5 w-3.5 mr-2 text-amber-500" />
            PENDING
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-lg px-6 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <History className="h-3.5 w-3.5 mr-2 text-emerald-500" />
            HISTORY
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-400">INCOMING TRANSFERS</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search ST-Number..."
                  value={transferSearch}
                  onChange={(e) => setTransferSearch(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
            <Card className="border-slate-100 shadow-sm overflow-hidden rounded-xl bg-white/50">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="h-12 border-none">
                  <TableHead className="text-[9px] font-black uppercase text-slate-400 px-4">Waybill</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400">Route</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400">Items</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400">State</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right px-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                     <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-xs">Loading waybills...</TableCell>
                  </TableRow>
                ) : transfers.filter(t => 
                  t.status === 'Pending' && 
                  (!transferSearch || t.transfer_number.toLowerCase().includes(transferSearch.toLowerCase()))
                ).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-xs italic">
                      {transferSearch ? "No matching transfers found." : "No active transfers."}
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers
                    .filter(t => 
                      t.status === 'Pending' && 
                      (!transferSearch || t.transfer_number.toLowerCase().includes(transferSearch.toLowerCase()))
                    )
                    .map(tx => {
                    const isDestination = tx.destination_branch_id === userBranchId;
                    return (
                      <TableRow key={tx.id} className="hover:bg-white group transition-colors h-16 border-slate-100">
                        <TableCell className="px-4">
                          <span className="text-[10px] font-black text-slate-900">{tx.transfer_number}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-500 uppercase">{tx.source_branch?.code}</span>
                             <ChevronRight className="h-3 w-3 text-slate-300" />
                             <span className={cn("text-[9px] font-black uppercase", isDestination ? "text-blue-600" : "text-slate-500")}>
                                {tx.destination_branch?.code}
                             </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] font-black h-5 px-2">
                            {tx.item_count} UNITS
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[8px] font-black h-6 px-3", getStatusColor(tx.status))}>
                            {isDestination ? 'INCOMING' : 'SHIPPED'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-4">
                          {isDestination ? (
                            <Button 
                              size="sm"
                              onClick={() => openReceiveVerification(tx)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] h-8 rounded-lg shadow-sm px-4 gap-1.5"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              RECEIVE
                            </Button>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 uppercase">IN TRANSIT</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-400">TRANSFER HISTORY</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search ST-Number..."
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
            </div>
          </div>
          <Card className="border-slate-100 shadow-sm overflow-hidden rounded-xl bg-white/50">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="h-12 border-none">
                  <TableHead className="text-[9px] font-black uppercase text-slate-400 px-4">Waybill</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400">Route</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right px-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers
                  .filter(t => 
                    t.status !== 'Pending' && 
                    (!transferSearch || t.transfer_number.toLowerCase().includes(transferSearch.toLowerCase()))
                  )
                  .map(tx => (
                  <TableRow key={tx.id} className="h-12 border-slate-50">
                    <TableCell className="px-4">
                      <span className="text-[9px] font-black text-slate-600 font-mono uppercase">{tx.transfer_number}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{tx.source_branch?.code} → {tx.destination_branch?.code}</span>
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <Badge className={cn("font-black text-[8px] h-6 px-3", getStatusColor(tx.status))}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receiving Dialog */}
      <Dialog open={!!receivingTx} onOpenChange={() => setReceivingTx(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Verifying Arrival
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase">{receivingTx?.transfer_number}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase italic">Awaiting Signature...</span>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
              <Table>
                <TableBody>
                  {receivingItems.map(item => (
                    <TableRow key={item.unit.id} className="h-10 border-b last:border-0">
                      <TableCell className="py-1 px-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-blue-600">{item.unit.serial_number}</span>
                          <span className="text-[10px] font-bold text-slate-800 uppercase">{item.product.model_name}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {discrepancyMode ? (
              <Input 
                placeholder="Log discrepancy notes..."
                className="h-10 border-rose-200"
                value={discrepancyNotes}
                onChange={(e) => setDiscrepancyNotes(e.target.value)}
              />
            ) : (
              <Button variant="ghost" onClick={() => setDiscrepancyMode(true)} className="w-full text-[9px] font-black text-rose-500 uppercase">
                <AlertTriangle className="h-3 w-3 mr-2" /> Report Discrepancy
              </Button>
            )}
          </div>

          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-4 border-t border-slate-100">
            <Button onClick={confirmReceipt} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-12 rounded-xl">
              {submitting ? 'SYNCING...' : 'CONFIRM RECEIPT'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Template */}
      <div className="hidden">
        {waybillData && <WaybillPrintTemplate ref={printRef} data={waybillData} />}
      </div>
    </div>
  )
}
