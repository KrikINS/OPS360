"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useReactToPrint } from "react-to-print"
import { WaybillPrintTemplate } from "@/components/transfer/WaybillPrintTemplate"
import { Input } from "@/components/ui/input"
import { 
  AlertTriangle as AlertIcon, CheckCircle2, ChevronRight as ChevronIcon, Clock as ClockIcon, History as HistoryIcon, Loader2, 
  Package, Plus, Printer, Search, Send, ShieldCheck as ShieldIcon, FileSpreadsheet
} from "lucide-react"
import { exportToExcel } from "@/lib/export-utils"

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

type ProductWithStock = Product & {
  available_units?: number
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
  status: 'REQUESTED' | 'IN_TRANSIT' | 'RECEIVED' | 'DISCREPANCY'
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
  waybill_number?: string
  item_count: number
}

type TransferSKUItem = {
  product: Product
  quantity: number
  available: number
  selectedUnits: InventoryUnit[]
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
  
  const [branches, setBranches] = useState<Branch[]>([])
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  
  // Export State
  const [canExport, setCanExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  // Create Transfer State
  const [userBranchId, setUserBranchId] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState("")
  const [destId, setDestId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  
  // New SKU-based Transfer Manifest
  const [transferSKUCart, setTransferSKUCart] = useState<TransferSKUItem[]>([])
  
  const [pendingDemands, setPendingDemands] = useState<StockRequest[]>([])
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null)
  const [isImportMode, setIsImportMode] = useState(false)

  const [inventorySearch, setInventorySearch] = useState("")
  const [inventoryResults, setInventoryResults] = useState<(InventoryUnit & { product: Product })[]>([])
  const [productSearchResults, setProductSearchResults] = useState<ProductWithStock[]>([])

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
      const { data, error } = await import("@/app/actions/generics").then(m => m.fetchData("waybills"))
      if (error) throw error
      const target = data && Array.isArray(data) ? (data as unknown as Record<string, unknown>[]).find((w) => w.waybill_number === transferNumber) : null
      if (target) {
        setWaybillData(target as unknown as WaybillData)
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
    const { data, error } = await import("@/app/actions/generics").then(m => m.fetchData('stock_transfers'))

    if (error) {
      console.error("Failed to load transfers", error)
    } else {
      const typedData = (data || []) as (StockTransfer & { items: { id: string }[] })[]
      setTransfers(typedData.map((t: StockTransfer & { waybill?: { waybill_number: string }[] | { waybill_number: string } }) => ({
        ...t,
        waybill_number: Array.isArray(t.waybill) ? t.waybill[0]?.waybill_number : t.waybill?.waybill_number,
        item_count: t.items?.length || 0
      })))
    }
    setLoading(false)
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data, error } = await import("@/app/actions/generics").then(m => m.rpcCall('get_export_data', { p_type: 'logistics' }))
      if (error) throw error
      if (data && Array.isArray(data)) {
        exportToExcel(data as Record<string, unknown>[], 'Logistics')
      }
    } catch (err) {
      console.error("Export failed", err)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    async function init() {
      const { data: branchData } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))
      const session = await import("next-auth/react").then(m => m.getSession())
      const user = session?.user
      
      if (branchData && Array.isArray(branchData)) setBranches(branchData as Branch[])
      
      if (user?.id) {
        const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))
        const profileRecord = profile as Record<string, unknown> | null
        if (profileRecord?.['branch_id']) {
          setUserBranchId(String(profileRecord['branch_id']))
          setSourceId(String(profileRecord['branch_id']))
        }

        // Check export permission
        const isAdmin = profile?.role === 'Admin/Owner' || profile?.role === 'SUPER_ADMIN' || profile?.role === 'finance'
        const { data: permissions } = await import("@/app/actions/transfers").then(m => m.getUserPermissionsAction(user.id, "transfer"))
        const hasTransferPerm = permissions && permissions.length > 0
        setCanExport(Boolean(isAdmin) || Boolean(hasTransferPerm))
      }
      
      await fetchTransfers()
    }
    init()
  }, [fetchTransfers])

  const fetchPendingDemands = async () => {
    const { data: demands } = await import("@/app/actions/transfers").then(m => m.getPendingDemandsAction(sourceId || userBranchId || ""))
    
    if (demands) setPendingDemands(demands as StockRequest[])
  }

  const importFromDemand = async (demandId: string) => {
    const demand = pendingDemands.find(d => d.id === demandId)
    if (!demand) return
    
    setDestId(demand.requesting_branch_id)
    setSelectedDemandId(demand.id)
    
    const newSKUItems = await Promise.all(demand.items.map(async (item): Promise<TransferSKUItem> => {
      const { data: stockData } = await import('@/app/actions/transfers')
        .then(m => m.getProductStockCountAction(item.product_id, sourceId || userBranchId || ""))

      return {
        product: {
          id: item.product_id,
          model_name: item.product.model_name,
          product_code: item.product.product_code,
          brand: item.product.brand || ""
        },
        quantity: item.quantity,
        available: typeof stockData === 'number' ? stockData : 0,
        selectedUnits: [] as InventoryUnit[]
      }
    }))
    
    setTransferSKUCart(newSKUItems)
  }

  const searchProducts = async (term: string) => {
    setInventorySearch(term)
    if (term.length < 2) {
      setProductSearchResults([])
      return
    }

    const { data } = await import('@/app/actions/transfers')
      .then(m => m.searchProductsForTransferAction(term))

    if (data) setProductSearchResults(data.map(p => ({ ...p, available_units: 0 })) as ProductWithStock[])
  }

  const addSKUToTransfer = (p: ProductWithStock) => {
    if (transferSKUCart.find(i => i.product.id === p.id)) return
    
    setTransferSKUCart([...transferSKUCart, {
      product: p,
      quantity: 1,
      available: p.available_units || 0,
      selectedUnits: [] as InventoryUnit[]
    }])
    
    setInventorySearch("")
    setProductSearchResults([])
  }

  const updateSKUQty = (productId: string, qty: number) => {
    setTransferSKUCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: Math.max(0, qty) } : item
    ))
  }

  const [pickingUnitsFor, setPickingUnitsFor] = useState<string | null>(null) 

  const openUnitPicker = async (productId: string) => {
    setPickingUnitsFor(productId)
    const { data: invData } = await import("@/app/actions/generics").then(m => m.fetchData("inventory"))
    const data = invData && Array.isArray(invData) ? (invData as unknown as typeof import("@/db/schema").inventory.$inferSelect[]).filter((i) => i.product_id === productId && i.branch_id === (sourceId || userBranchId || "") && i.status === 'Available').slice(0, 50) : []

    if (data) {
      const selectedSKU = transferSKUCart.find(i => i.product.id === productId)
      const mapped = data.map((u: Record<string, unknown>) => ({
        id: String(u['id'] || ''),
        serial_number: String(u['serial_number'] || ''),
        product_id: String(u['product_id'] || ''),
        status: String(u['status'] || ''),
        product: selectedSKU!.product
      })) as InventoryUnit[]
      setInventoryResults(mapped as (InventoryUnit & { product: Product })[])
    }
  }

  const toggleUnitSelection = (productId: string, unit: InventoryUnit) => {
    setTransferSKUCart(prev => prev.map(item => {
      if (item.product.id !== productId) return item
      const isSelected = item.selectedUnits.find(u => u.id === unit.id)
      if (isSelected) {
        return { ...item, selectedUnits: item.selectedUnits.filter(u => u.id !== unit.id) }
      } else {
        if (item.selectedUnits.length >= item.quantity) return item
        return { ...item, selectedUnits: [...item.selectedUnits, unit] }
      }
    }))
  }

  const submitTransfer = async () => {
    if (!sourceId || !destId || transferSKUCart.length === 0) {
      alert("Please ensure branches are selected and at least one item is manifest.")
      return
    }

    const allUnits = transferSKUCart.flatMap(i => i.selectedUnits)
    const expectedCount = transferSKUCart.reduce((sum, item) => sum + item.quantity, 0)

    if (allUnits.length < expectedCount) {
      alert(`INCOMPLETE MANIFEST: You have planned for ${expectedCount} units but only picked ${allUnits.length} serial numbers. Please pick ALL units before initiating.`)
      return
    }

    const anyOverRequest = transferSKUCart.some(i => i.quantity > i.available)
    if (anyOverRequest) {
      alert("OVER-REQUEST ALERT: One or more products exceed current source stock. Please adjust quantities.")
      return
    }

    setSubmitting(true)
    try {
      const rpcName = (selectedDemandId || prefillRequest) ? 'fulfill_stock_request' : 'process_stock_transfer_send'
      const rpcParams = (selectedDemandId || prefillRequest)
        ? { p_request_id: (selectedDemandId || prefillRequest?.id) as string, p_inventory_ids: allUnits.map((u: InventoryUnit) => u.id) }
        : { p_source_branch_id: sourceId, p_destination_branch_id: destId, p_inventory_ids: allUnits.map((u: InventoryUnit) => u.id), p_notes: "" }

      const { data, error } = await import("@/app/actions/generics").then(m => m.rpcCall(rpcName, rpcParams))
      const transferNumber = data as unknown as string
      
      if (error) throw error

      setLastTransferNumber(transferNumber)
      alert((selectedDemandId || prefillRequest) ? `Request fulfilled. Waybill ${transferNumber} generated.` : `Transfer ${transferNumber} initiated.`)
      
      setTransferSKUCart([])
      setSelectedDemandId(null)
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
      const { data } = await import("@/app/actions/transfers").then(m => m.getTransferItemsAction(tx.id))

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
      const { error } = await import("@/app/actions/generics").then(m => m.rpcCall('process_stock_transfer_receive', {
        p_transfer_id: receivingTx.id,
        p_discrepancy_flag: discrepancyMode,
        p_discrepancy_notes: discrepancyNotes
      }))

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
      case 'RECEIVED': return "bg-emerald-50 text-emerald-600 border-emerald-100"
      case 'IN_TRANSIT': return "bg-amber-50 text-amber-600 border-amber-100"
      case 'REQUESTED': return "bg-blue-50 text-blue-600 border-blue-100"
      case 'DISCREPANCY': return "bg-rose-50 text-rose-600 border-rose-100"
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

        <div className="flex items-center gap-3">
          {canExport && (
            <Button 
              onClick={handleExport} 
              variant="outline" 
              disabled={exporting}
              className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 gap-1.5 font-bold h-10 px-4 text-xs transition-all shadow-sm"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              Export Logistics
            </Button>
          )}

          <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger 
            render={
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg font-black h-10 px-4 rounded-xl gap-2 flex items-center text-white text-xs">
                <Plus className="h-4 w-4" />
                INITIATE TRANSFER
              </Button>
            }
          />
          <DialogContent className="md:max-w-4xl md:max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">New Stock Transfer</DialogTitle>
              <DialogDescription>Move physical units from one branch to another.</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Dispatch From (Source)</label>
                <Select 
                  value={sourceId} 
                  onValueChange={(val) => {
                    setSourceId(val || "")
                    setTransferSKUCart([])
                    setSelectedDemandId(null)
                  }}
                >
                  <SelectTrigger className="h-12 border-slate-200">
                    <SelectValue placeholder="Dispatch From" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Receive At (Destination)</label>
                <Select value={destId} onValueChange={(val) => setDestId(val || "")} disabled={!!selectedDemandId}>
                  <SelectTrigger className="h-12 border-slate-200">
                    <SelectValue placeholder="Receive At" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id} disabled={b.id === sourceId}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl h-12 mb-4">
              <button 
                onClick={() => { setIsImportMode(true); fetchPendingDemands(); }}
                className={cn(
                  "flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  isImportMode ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
                )}
              >
                Import from Pending Demand
              </button>
              <button 
                onClick={() => setIsImportMode(false)}
                className={cn(
                  "flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  !isImportMode ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
                )}
              >
                Manual SKU Entry
              </button>
            </div>
            
            {isImportMode ? (
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-black uppercase text-slate-400">Link Demand Order</label>
                <Select value={selectedDemandId || ""} onValueChange={(val) => val && importFromDemand(val)}>
                  <SelectTrigger className="h-12 border-slate-200">
                    <SelectValue placeholder="Select SR- Request..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingDemands.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No pending demands for this branch</div>
                    ) : (
                      pendingDemands.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.request_number} • To: {d.requesting_branch.code} ({d.item_count} items)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search SKU..."
                  className="pl-10 h-10 border-slate-200"
                  value={inventorySearch}
                  onChange={(e) => searchProducts(e.target.value)}
                />
                {productSearchResults.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden">
                    {productSearchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addSKUToTransfer(p)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black">{p.model_name}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{p.product_code}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black h-5 px-2">
                          Available: {p.available_units || 0}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                <Package className="h-3 w-3" />
                Logistic Manifest
              </label>
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm mb-4">
                {transferSKUCart.length === 0 ? (
                   <div className="p-12 text-center text-slate-300 italic text-xs flex flex-col items-center gap-2">
                     No items in manifest
                   </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-10 border-none">
                        <TableHead className="text-[9px] font-black uppercase text-slate-400 px-4">Product SKU</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-center">Current Stock</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-center">Transfer Quantity</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right px-4">S/N Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferSKUCart.map(item => (
                        <TableRow key={item.product.id} className="h-16 border-b last:border-0">
                          <TableCell className="px-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-800">{item.product.model_name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{item.product.product_code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("text-[10px] font-black h-6", item.available > 5 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100")}>
                               {item.available}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4">
                            <div className="flex items-center gap-2 justify-center">
                              <Input 
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateSKUQty(item.product.id, parseInt(e.target.value) || 0)}
                                className={cn("h-8 w-16 text-center font-bold text-xs", item.quantity > item.available && "border-rose-500 bg-rose-50")}
                              />
                            </div>
                            {item.quantity > item.available && (
                              <p className="text-[8px] text-rose-500 font-bold uppercase mt-1 text-center">Insufficient Stock</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-4">
                            <Button 
                              size="sm" 
                              variant={item.selectedUnits.length === item.quantity ? "outline" : "default"}
                              className={cn(
                                "h-8 px-3 text-[10px] font-black rounded-lg gap-1.5",
                                item.selectedUnits.length === item.quantity ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "bg-blue-600 text-white"
                              )}
                              onClick={() => openUnitPicker(item.product.id)}
                            >
                              {item.selectedUnits.length === item.quantity ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                              {item.selectedUnits.length} / {item.quantity}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => {
                  setIsCreating(false)
                  setLastTransferNumber(null)
                  setTransferSKUCart([])
                  setSelectedDemandId(null)
                }} className="font-bold text-slate-500 hover:bg-slate-100">Close</Button>
                
                {lastTransferNumber && (
                  <Button 
                    variant="outline"
                    className="border-blue-200 text-blue-600 font-black hover:bg-blue-50 h-10 rounded-xl px-4 gap-2"
                    onClick={() => fetchAndPrintWaybill(lastTransferNumber || "")}
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
                    submitting || 
                    transferSKUCart.length === 0 || 
                    !destId ||
                    transferSKUCart.some(i => i.quantity > i.available || i.selectedUnits.length < i.quantity || i.quantity <= 0)
                  }
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  INITIATE TRANSFER
                </Button>
              )}
            </DialogFooter>

            {/* Sub-modal for picking serial numbers */}
            <Dialog open={!!pickingUnitsFor} onOpenChange={() => setPickingUnitsFor(null)}>
              <DialogContent className="md:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Dispatch Scanning: {transferSKUCart.find(i => i.product.id === pickingUnitsFor)?.product.model_name}</DialogTitle>
                  <DialogDescription>Select {transferSKUCart.find(i => i.product.id === pickingUnitsFor)?.quantity} physical units available at this branch.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                   <div className="max-h-60 overflow-y-auto border rounded-xl bg-slate-50 p-2 space-y-1">
                      {inventoryResults.map(unit => {
                        const isSelected = transferSKUCart.find(i => i.product.id === pickingUnitsFor)?.selectedUnits.find(u => u.id === unit.id)
                        return (
                          <button
                            key={unit.id}
                            onClick={() => toggleUnitSelection(pickingUnitsFor!, unit)}
                            className={cn(
                              "w-full flex items-center justify-between p-3 rounded-xl transition-all border text-left",
                              isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-transparent hover:border-slate-200"
                            )}
                          >
                             <div className="flex flex-col">
                               <span className="text-[10px] font-black text-blue-600 tracking-tight">{unit.serial_number}</span>
                               <span className="text-[8px] font-bold text-slate-400 uppercase">{unit.status}</span>
                             </div>
                             {isSelected ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : <Plus className="h-4 w-4 text-slate-300" />}
                          </button>
                        )
                      })}
                   </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setPickingUnitsFor(null)} className="font-bold">Finished Scanning</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 bg-slate-100/50 p-1 rounded-xl h-12 w-full max-w-md shadow-sm">
          <TabsTrigger value="active" className="flex-1 rounded-lg px-6 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <ClockIcon className="h-3.5 w-3.5 mr-2 text-amber-500" />
            PENDING
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-lg px-6 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <HistoryIcon className="h-3.5 w-3.5 mr-2 text-emerald-500" />
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
                  t.status === 'IN_TRANSIT' && 
                  (!transferSearch || t.transfer_number.toLowerCase().includes(transferSearch.toLowerCase()) || t.waybill_number?.toLowerCase().includes(transferSearch.toLowerCase()))
                ).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-xs italic">
                      {transferSearch ? "No matching transfers found." : "No active transfers."}
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers
                    .filter(t => 
                      t.status === 'IN_TRANSIT' && 
                      (!transferSearch || t.transfer_number.toLowerCase().includes(transferSearch.toLowerCase()) || t.waybill_number?.toLowerCase().includes(transferSearch.toLowerCase()))
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
                             <ChevronIcon className="h-3 w-3 text-slate-300" />
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
                              <ShieldIcon className="h-3 w-3" />
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
                    t.status !== 'IN_TRANSIT' && 
                    (!transferSearch || t.transfer_number.toLowerCase().includes(transferSearch.toLowerCase()))
                  )
                  .map(tx => (
                  <TableRow key={tx.id} className="h-12 border-slate-50">
                    <TableCell className="px-4">
                      <span className="text-[9px] font-black text-slate-600 font-mono uppercase">
                        {tx.waybill_number || tx.transfer_number}
                      </span>
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
        <DialogContent className="md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-emerald-600" />
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
                <AlertIcon className="h-3 w-3 mr-2" /> Report Discrepancy
              </Button>
            )}
          </div>

          <DialogFooter className="mt-4">
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
