"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Package, Clock, Plus, Search, Loader2, 
  ArrowRight,
  Trash2, Send, CheckCircle2, XCircle, FileSpreadsheet
} from "lucide-react"
import { exportToExcel } from "@/lib/export-utils"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
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

export type Product = {
  id: string
  model_name: string
  product_code: string
  brand: string
  available_units: number
}

export type StockRequest = {
  id: string
  request_number: string
  requesting_branch_id: string
  source_branch_id: string
  requesting_branch: { name: string, code: string }
  source_branch: { name: string, code: string }
  status: 'Pending' | 'In-Transit' | 'Fulfilled' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'Urgent'
  notes: string
  created_at: string
  item_count: number
  items: {
    id: string
    product_id: string
    quantity: number
    product: {
      model_name: string
      product_code: string
      brand?: string
    }
  }[]
}

type InventoryUnit = {
  id: string
  serial_number: string
  product_id: string
}

export function StockRequestsView({ onFulfill }: { onFulfill?: (req: StockRequest) => void }) {
  
  const searchParams = useSearchParams()
  const [branches, setBranches] = useState<Branch[]>([])
  const [requests, setRequests] = useState<StockRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  
  // Auth & Context
  const [userBranches, setUserBranches] = useState<Branch[]>([])
  const [userBranchId, setUserBranchId] = useState<string | null>(null)
  
  // New Request Form
  const [targetSourceId, setTargetSourceId] = useState("")
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'Urgent'>('Medium')

  const [productSearch, setProductSearch] = useState("")
  const [productResults, setProductResults] = useState<Product[]>([])
  const [requestCart, setRequestCart] = useState<{product: Product, quantity: number}[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Fulfillment State
  const [fulfillingRequest, setFulfillingRequest] = useState<StockRequest | null>(null)
  const [availableSerials, setAvailableSerials] = useState<Record<string, InventoryUnit[]>>({})
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string[]>>({}) // item.id -> inventory_ids[]
  const [fulfillmentLoading, setFulfillmentLoading] = useState(false)
  
  // Detail Modal State
  const [viewingRequest, setViewingRequest] = useState<StockRequest | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [canExport, setCanExport] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchRequests = useCallback(async () => {
    if (!userBranchId) return
    setLoading(true)
    const { data, error } = await import("@/app/actions/transfers").then(m => m.getBranchStockRequestsAction(userBranchId))
    if (!error && data && Array.isArray(data)) {
      const typedData = data as Array<StockRequest & { items: unknown[] }>
      setRequests(typedData.map((r) => ({
        ...r,
        item_count: r.items?.length || 0
      })))
    }
    setLoading(false)
  }, [userBranchId])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const addToRequest = useCallback((product: Product) => {
    setRequestCart(prev => {
      if (prev.find(i => i.product.id === product.id)) return prev
      return [...prev, { product, quantity: 1 }]
    })
    setProductSearch("")
    setProductResults([])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: branchData } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))
      const { data: authData } = await import("@/app/actions/user").then(m => m.getUserAction())
      
      if (branchData && Array.isArray(branchData)) setBranches(branchData as Branch[])
      
      if (authData?.user?.id) {
        const userId = authData.user.id
        const { data: allAccess } = await import("@/app/actions/generics").then(m => m.fetchData("user_branch_access"))
        const access = allAccess && Array.isArray(allAccess) ? allAccess.filter(a => (a as Record<string, unknown>)['user_id'] === userId) : []
        
        if (access.length > 0) {
          interface ACMResponse { branch_id: string }
          const typedAccess = access as unknown as ACMResponse[]
          const allBranchesArr = (branchData && Array.isArray(branchData)) ? branchData as Branch[] : []
          const uBranches = typedAccess
            .map((a) => allBranchesArr.find((b) => b.id === a.branch_id))
            .filter((b): b is Branch => b !== undefined)
          setUserBranches(uBranches)
          const { data: profileData } = await import("@/app/actions/user").then(m => m.getUserProfileAction(userId))
          const profile = profileData as Record<string, unknown> | null
          if (uBranches.length === 1) {
            setUserBranchId(uBranches[0].id)
          } else if (profile?.assigned_branch_id) {
            setUserBranchId(String(profile.assigned_branch_id))
          } else if (uBranches.length > 1) {
            setUserBranchId(uBranches[0].id)
          } else {
            setLoading(false)
          }

          // Check export permission
          const isAdmin = profile?.role === 'Admin/Owner' || profile?.role === 'SUPER_ADMIN' || profile?.role === 'finance'
          const { data: allPerms } = await import("@/app/actions/generics").then(m => m.fetchData("user_permissions"))
          const hasTransferPerm = allPerms && Array.isArray(allPerms) && allPerms.some(p => 
            (p as Record<string, unknown>)['user_id'] === userId && 
            (p as Record<string, unknown>)['module'] === 'transfer' && 
            (p as Record<string, unknown>)['enabled'] === true
          )
          setCanExport(Boolean(isAdmin) || Boolean(hasTransferPerm))
        }
      }
      
      // Handle Demand Shortcut from Inventory Registry
      const demandId = searchParams.get('demand')
      if (demandId) {
        const { data: prodArr } = await import("@/app/actions/generics").then(m => m.fetchData("products"))
        const prod = prodArr && Array.isArray(prodArr) ? (prodArr as unknown as typeof import("@/db/schema").products.$inferSelect[]).find((p) => p.id === demandId) : null
        if (prod) {
          // Note: targetSourceId might not be set yet if user has multiple branches and hasn't selected one.
          const { data: stockData } = await import("@/app/actions/generics").then(m => m.fetchData("inventory"))
          const filteredStock = stockData && Array.isArray(stockData) ? (stockData as unknown as typeof import("@/db/schema").inventory.$inferSelect[]).filter((i) => i.product_id === prod.id && i.status === 'Available') : []
          if (filteredStock && filteredStock[0]) {
            addToRequest(filteredStock[0] as unknown as Product)
            setIsCreating(true)
          }
        }
      }
    }
    init()
  }, [fetchRequests, searchParams, branches, addToRequest])

  const searchProducts = useCallback(async (term: string) => {
    setProductSearch(term)
    if (term.length < 2 || !targetSourceId) {
      setProductResults([])
      return
    }
    const { data, error } = await import('@/app/actions/transfers')
      .then(m => m.searchProductsForTransferAction(term, targetSourceId))

    if (!error && data) {
      setProductResults(data as Product[])
    }
  }, [targetSourceId])

  const updateCartQty = (id: string, qty: number) => {
    setRequestCart(requestCart.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, qty) } : i))
  }

  const removeFromCart = (id: string) => {
    setRequestCart(requestCart.filter(i => i.product.id !== id))
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data, error } = await import('@/app/actions/generics')
        .then(m => m.rpcCall('get_export_data', { p_type: 'logistics' }))
      if (error) throw new Error(error.message)
      if (data && Array.isArray(data)) {
        exportToExcel(data as Record<string, unknown>[], 'Logistics')
      }
    } catch (err) {
      console.error("Export failed", err)
    } finally {
      setExporting(false)
    }
  }

  const submitRequest = async () => {
    if (!targetSourceId || requestCart.length === 0 || !userBranchId) return
    setSubmitting(true)
    try {
      const requestNumber = `REQ/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`

      const { data, error: reqErr } = await import('@/app/actions/generics')
        .then(m => m.insertData('stock_requests', [{
          source_branch_id: targetSourceId,
          requesting_branch_id: userBranchId,
          request_number: requestNumber,
          status: 'Pending',
          priority,
        }]))

      if (reqErr) throw new Error(reqErr.message)

      const newRequest = data && Array.isArray(data) ? data[0] as Record<string, unknown> : null
      if (newRequest?.id) {
        await Promise.all(requestCart.map(item =>
          import('@/app/actions/generics').then(m => m.insertData('stock_request_items', [{
            request_id: String(newRequest.id),
            product_id: item.product.id,
            quantity: item.quantity,
          }]))
        ))
      }

      setIsCreating(false)
      setRequestCart([])
      setTargetSourceId("")

      alert(`Stock request ${requestNumber} submitted successfully`)
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to submit request")
    } finally {
      setSubmitting(false)
      fetchRequests()
    }
  }

  const openFulfillment = async (req: StockRequest) => {
    setFulfillingRequest(req)
    setFulfillmentLoading(true)
    
    try {
      const pIds = req.items.map(i => i.product_id)
      const { data: invData } = await import("@/app/actions/generics").then(m => m.fetchData("inventory"))
      const data = invData && Array.isArray(invData) ? (invData as unknown as typeof import("@/db/schema").inventory.$inferSelect[]).filter((i) => i.branch_id === userBranchId && i.status === 'Available' && i.product_id && pIds.includes(i.product_id)) : []

      if (data) {
        const grouped: Record<string, InventoryUnit[]> = {}
        const typedData = data as InventoryUnit[]
        typedData.forEach((unit) => {
          if (!grouped[unit.product_id]) grouped[unit.product_id] = []
          grouped[unit.product_id].push(unit)
        })
        setAvailableSerials(grouped)
      }
      
      const initial: Record<string, string[]> = {}
      req.items.forEach(i => initial[i.id] = [])
      setSelectedUnits(initial)
      
    } catch (err) {
      console.error(err)
    } finally {
      setFulfillmentLoading(false)
    }
  }

  const toggleUnitSelection = (itemId: string, unitId: string, max: number) => {
    const current = selectedUnits[itemId] || []
    if (current.includes(unitId)) {
      setSelectedUnits({ ...selectedUnits, [itemId]: current.filter(id => id !== unitId) })
    } else {
      if (current.length >= max) return
      setSelectedUnits({ ...selectedUnits, [itemId]: [...current, unitId] })
    }
  }

  const confirmFulfillment = async () => {
    if (!fulfillingRequest) return
    
    const allValid = fulfillingRequest.items.every(i => (selectedUnits[i.id]?.length || 0) === i.quantity)
    if (!allValid) {
      alert("Please select exactly the requested quantity for ALL items.")
      return
    }

    setSubmitting(true)
    try {
      const allInventoryIds = Object.values(selectedUnits).flat()
      const { error } = await import('@/app/actions/transfers')
        .then(m => m.fulfillStockRequestAction(fulfillingRequest.id, allInventoryIds))

      if (error) throw new Error(error.message ?? 'Fulfillment failed')

      setFulfillingRequest(null)
      fetchRequests()
      alert("Stock request fulfilled and in-transit.")
    } catch (err: unknown) {
      alert((err as Error).message || "Fulfillment failed")
    } finally {
      setSubmitting(false)
    }
  }

  const cancelRequest = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) return
    setCancelling(true)
    try {
      const { error } = await import("@/app/actions/generics").then(m => m.updateData("stock_requests", { id, status: 'Cancelled' }))
      
      if (error) throw error
      setViewingRequest(null)
      fetchRequests()
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to cancel request")
    } finally {
      setCancelling(false)
    }
  }

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Urgent': return "bg-rose-50 text-rose-600 border-rose-100"
      case 'Medium': return "bg-amber-50 text-amber-600 border-amber-100"
      default: return "bg-blue-50 text-blue-600 border-blue-100"
    }
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Fulfilled': return "bg-emerald-50 text-emerald-600 border-emerald-100"
      case 'In-Transit': return "bg-blue-50 text-blue-600 border-blue-100"
      case 'Cancelled': return "bg-slate-50 text-slate-400 border-slate-100"
      default: return "bg-slate-50 text-slate-600 border-slate-100"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            Stock Demand & Requests
          </h2>
          <p className="text-xs text-slate-500 font-medium">Manage internal logistics for branch-to-branch supply.</p>
        </div>

        <div className="flex gap-2 items-center">
          {userBranches.length > 1 && (
            <Select value={userBranchId || ""} onValueChange={(val) => setUserBranchId(val || "")}>
              <SelectTrigger className="h-10 border-slate-200 bg-white min-w-[180px]">
                <SelectValue placeholder="Select Branch">
                  {userBranches.find(b => b.id === userBranchId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {userBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canExport && (
            <Button 
              onClick={handleExport} 
              variant="outline" 
              disabled={exporting}
              className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 gap-1.5 font-bold h-10 px-4 text-xs transition-all shadow-sm"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              Export Demands
            </Button>
          )}

          <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger 
            render={
              <Button className="bg-[#001529] hover:bg-slate-800 font-black h-10 px-4 rounded-xl gap-2 shadow-lg flex items-center text-white text-xs">
                <Plus className="h-4 w-4 text-[#7FD1E3]" />
                NEW STOCK REQUEST
              </Button>
            }
          />
          <DialogContent className="md:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Create Demand Order</DialogTitle>
              <DialogDescription>Specify the products and quantities needed from a target source for {userBranches.find(b => b.id === userBranchId)?.name || 'your branch'}.</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Target Source Branch</label>
                <Select 
                  value={targetSourceId} 
                  onValueChange={(val) => {
                    setTargetSourceId(val || "");
                    if (productSearch.length >= 2) searchProducts(productSearch);
                  }}
                >
                  <SelectTrigger className="h-12 border-slate-200">
                    <SelectValue placeholder="Select Source Branch">
                      {branches.find(b => b.id === targetSourceId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.filter(b => b.id !== userBranchId).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Priority Level</label>
                <div className="flex bg-slate-100 p-1 rounded-lg h-12">
                  {['Low', 'Medium', 'Urgent'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p as 'Low' | 'Medium' | 'Urgent')}
                      className={cn(
                        "flex-1 rounded-md text-[10px] font-black uppercase transition-all",
                        priority === p ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search Product Model or EHA Code..."
                  className="pl-10 h-12 bg-slate-50 border-none shadow-inner"
                  value={productSearch}
                  onChange={(e) => searchProducts(e.target.value)}
                />
                
                {productResults.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {productResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToRequest(p)}
                        disabled={p.available_units === 0}
                        className={cn(
                          "w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0",
                          p.available_units === 0 && "opacity-60 cursor-not-allowed bg-slate-50/50"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">{p.model_name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{p.product_code} • {p.brand}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn(
                            "text-[8px] font-black h-5 px-2",
                            p.available_units > 10 ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                            p.available_units > 0 && p.available_units < 5 ? "text-amber-600 bg-amber-50 border-amber-100" :
                            p.available_units === 0 ? "text-rose-600 bg-rose-50 border-rose-100" :
                            "text-slate-400 bg-slate-50 border-slate-100"
                          )}>
                            {p.available_units === 0 ? "Out of Stock" : 
                             p.available_units < 5 ? `Low Stock: ${p.available_units}` : 
                             `Available: ${p.available_units}`}
                          </Badge>
                          <Plus className={cn("h-4 w-4", p.available_units === 0 ? "text-slate-200" : "text-slate-300")} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Demand Manifest</label>
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  {requestCart.length === 0 ? (
                    <div className="p-12 text-center text-slate-300 italic text-xs flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-20" />
                      No products added to demand
                    </div>
                  ) : (
                    <Table>
                      <TableBody>
                        {requestCart.map(item => (
                          <TableRow key={item.product.id} className="group border-b last:border-0 h-16">
                            <TableCell className="py-2">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{item.product.product_code}</span>
                                <span className="text-xs font-black text-slate-800">{item.product.model_name}</span>
                                {item.quantity > item.product.available_units && (
                                  <div className="flex items-center gap-1 mt-1 text-rose-500">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-[9px] font-bold">EXCEEDS SOURCE STOCK ({item.product.available_units})</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-32 px-4">
                              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit shadow-inner">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 bg-white shadow-sm hover:bg-slate-50 text-slate-900 border-none transition-all active:scale-95"
                                  onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center text-xs font-black tracking-tighter text-slate-800">{item.quantity}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 bg-white shadow-sm hover:bg-slate-50 text-slate-900 border-none transition-all active:scale-95"
                                  onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                                >
                                  +
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 p-0 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                                onClick={() => removeFromCart(item.product.id)}
                              >
                                <Trash2 className="h-4.5 w-4.5" />
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

            <DialogFooter className="mt-4 border-t border-slate-50 pt-4 items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-900 uppercase">
                    Total Demand: {requestCart.reduce((sum, item) => sum + item.quantity, 0)} Units
                  </span>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="font-bold text-slate-500">Later</Button>
              <Button 
                className="bg-slate-900 hover:bg-black font-black px-8 h-12 rounded-xl"
                onClick={submitRequest}
                disabled={submitting || requestCart.length === 0 || !targetSourceId}
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                TRANSMIT DEMAND
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList className="mb-6 bg-slate-100/50 p-1 rounded-xl h-12 w-full max-w-md">
          <TabsTrigger value="my-requests" className="flex-1 rounded-lg px-6 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <Send className="h-3.5 w-3.5 mr-2" />
            MY REQUESTS
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex-1 rounded-lg px-6 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            <ArrowRight className="h-3.5 w-3.5 mr-2" />
            INCOMING DEMANDS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests" className="space-y-4">
          <div className="grid gap-4">
            {loading ? (
              <Card className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                Retrieving active demands...
              </Card>
            ) : requests.filter(r => r.requesting_branch_id === userBranchId).length === 0 ? (
              <Card className="p-12 text-center text-slate-300 italic border-dashed">
                You haven&apos;t initiated any stock requests.
              </Card>
            ) : (
              requests.filter(r => r.requesting_branch_id === userBranchId).map(req => (
                <Card 
                  key={req.id} 
                  className="hover:shadow-md transition-all group border-slate-100 overflow-hidden cursor-pointer active:scale-[0.99]"
                  onClick={() => setViewingRequest(req)}
                >
                  <div className="flex items-center">
                    <div className={cn("w-1 self-stretch", 
                      req.status === 'Fulfilled' ? "bg-emerald-500" :
                      req.status === 'In-Transit' ? "bg-blue-500" :
                      "bg-amber-500"
                    )} />
                    <div className="flex-1 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black tracking-tight text-slate-900 uppercase bg-slate-100 px-2 py-0.5 rounded">
                            {req.request_number}
                          </span>
                          <Badge variant="outline" className={cn("text-[8px] font-black py-0", getPriorityColor(req.priority))}>
                            {req.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(req.created_at).toLocaleDateString()}</span>
                          <Badge className={cn("text-[8px] font-black h-6 px-3", getStatusColor(req.status))}>
                            {req.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5 tracking-tighter text-nowrap">Source Branch</span>
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                            {req.source_branch?.name}
                          </span>
                        </div>
                        <div className="flex flex-col col-span-2">
                          <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5 tracking-tighter text-nowrap">SKUs</span>
                          <div className="flex flex-wrap gap-1">
                            {req.items?.slice(0, 2).map((item) => (
                              <Badge key={item.id} variant="secondary" className="bg-slate-50 text-slate-600 font-bold text-[8px] py-0">
                                {item.product?.model_name} (x{item.quantity})
                              </Badge>
                            ))}
                            {req.item_count > 2 && <span className="text-[8px] text-slate-400 font-bold font-mono">+{req.item_count - 2}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="incoming">
          <Card className="border-slate-100 shadow-sm overflow-hidden rounded-xl bg-white/50">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="h-10 border-none">
                  <TableHead className="text-[9px] font-black uppercase text-slate-400 px-4">Request #</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400">Requesting Branch</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400">Demand</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400">Status</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right px-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.filter(r => r.source_branch_id === userBranchId).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-xs italic">
                      No incoming stock demands.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.filter(r => r.source_branch_id === userBranchId).map((req) => (
                    <TableRow 
                      key={req.id} 
                      className="hover:bg-white group transition-colors h-14 border-slate-100 cursor-pointer"
                      onClick={() => setViewingRequest(req)}
                    >
                      <TableCell className="px-4">
                        <span className="text-[10px] font-black text-slate-900">{req.request_number}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-black text-slate-700">{req.requesting_branch?.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-black text-slate-900">{req.item_count} Items</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-[8px] font-black uppercase", getStatusColor(req.status))}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-4">
                        {req.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => onFulfill?.(req)}
                              className="bg-emerald-600 hover:bg-emerald-700 font-black text-[9px] h-8 px-3 rounded shadow-sm gap-1 text-white"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              FULFILL
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openFulfillment(req)}
                              className="font-bold text-[9px] h-8 px-2 rounded opacity-50 hover:opacity-100"
                              title="Manual Assignment"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase">PROCESSED</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Request Detail Modal */}
      <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
        <DialogContent className="md:max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex flex-col">
                <DialogTitle className="text-2xl font-black">{viewingRequest?.request_number}</DialogTitle>
                <DialogDescription>Demand Order Detail</DialogDescription>
              </div>
              <Badge className={cn("text-[10px] font-black h-7 px-4", viewingRequest && getStatusColor(viewingRequest.status))}>
                {viewingRequest?.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Requesting Branch</span>
                <p className="text-sm font-black text-[#001529]">{viewingRequest?.requesting_branch?.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{viewingRequest?.requesting_branch?.code}</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Source Target</span>
                <p className="text-sm font-black text-[#001529]">{viewingRequest?.source_branch?.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{viewingRequest?.source_branch?.code}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Items Requested</label>
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableBody>
                    {viewingRequest?.items.map(item => (
                      <TableRow key={item.id} className="border-b last:border-0 h-14">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.product.product_code}</span>
                            <span className="text-xs font-black text-slate-800">{item.product.model_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-xs text-slate-900 pr-6">
                          x{item.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {viewingRequest?.notes && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Logistics Notes</label>
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-xs text-slate-600 italic">
                  &quot;{viewingRequest.notes}&quot;
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            {/* Show Cancel for Requester */}
            {viewingRequest?.requesting_branch_id === userBranchId && viewingRequest?.status === 'Pending' && (
              <Button 
                variant="outline"
                className="font-black text-rose-500 border-rose-100 hover:bg-rose-50 rounded-xl px-6"
                onClick={() => cancelRequest(viewingRequest.id)}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                CANCEL REQUEST
              </Button>
            )}

            <div className="flex-1" />

            {/* Show Fulfill for Source */}
            {viewingRequest?.source_branch_id === userBranchId && viewingRequest?.status === 'Pending' && (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 font-black px-8 h-12 rounded-xl text-white shadow-lg"
                onClick={() => {
                  setViewingRequest(null);
                  onFulfill?.(viewingRequest);
                }}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                FULFILL REQUEST
              </Button>
            )}

            <Button variant="ghost" onClick={() => setViewingRequest(null)} className="font-bold text-slate-500 px-6">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fulfillment Modal */}
      <Dialog open={!!fulfillingRequest} onOpenChange={() => setFulfillingRequest(null)}>
        <DialogContent className="md:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Shipment Fulfillment</DialogTitle>
            <DialogDescription>Assign specific serial numbers to fulfill this demand order.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 overflow-y-auto max-h-[60vh]">
            {fulfillmentLoading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              </div>
            ) : fulfillingRequest?.items.map(item => {
              const selectedCount = selectedUnits[item.id]?.length || 0;
              const isComplete = selectedCount === item.quantity;
              const serials = availableSerials[item.product_id] || [];

              return (
                <div key={item.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400">DEMAND: {item.quantity} UNITS</span>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight">{item.product.model_name}</h4>
                    </div>
                    <Badge variant={isComplete ? "default" : "outline"} className={cn(
                      "text-[9px] font-black h-7 px-3 gap-1.5",
                      isComplete ? "bg-emerald-600 text-white" : "border-slate-200 text-slate-400"
                    )}>
                      {isComplete ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {selectedCount} / {item.quantity}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {serials.length === 0 ? (
                      <div className="col-span-4 p-2 text-center text-[9px] font-bold text-rose-500 bg-rose-50 rounded border border-rose-100">
                        INSUFFICIENT LOCAL STOCK
                      </div>
                    ) : serials.map(unit => {
                      const isSelected = selectedUnits[item.id]?.includes(unit.id);
                      return (
                        <button
                          key={unit.id}
                          disabled={!isSelected && isComplete}
                          onClick={() => toggleUnitSelection(item.id, unit.id, item.quantity)}
                          className={cn(
                            "flex flex-col p-2 rounded-lg border transition-all text-left",
                            isSelected 
                              ? "bg-blue-600 border-blue-600 text-white" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-blue-400",
                            !isSelected && isComplete && "opacity-30 cursor-not-allowed"
                          )}
                        >
                          <span className="text-[9px] font-black truncate">{unit.serial_number}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setFulfillingRequest(null)} className="font-bold text-slate-500">Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 font-black px-8 h-12 rounded-xl"
              onClick={confirmFulfillment}
              disabled={submitting || !fulfillingRequest?.items.every(i => (selectedUnits[i.id]?.length || 0) === i.quantity)}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              EXECUTE PHYSICAL TRANSFER
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
