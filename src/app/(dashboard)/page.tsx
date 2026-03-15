"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { 
  Package, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  Search, 
  ArrowUpDown,
  History,
  AlertOctagon,
  Clock
} from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Upload } from "lucide-react"
import { ImportStockModal } from "@/components/inventory/import-stock-modal"

type Branch = {
  id: string
  name: string
  location: string
  type: string
}

type ProductMetadata = {
  id: string
  brand: string
  model_name: string
  category: string
  description: string
  product_code: string
  min_stock_level: number
  tracking_type: string
}

type InventoryItem = {
  id: string
  serial_number: string
  hsn_code: string
  status: string
  branch_id: string
  product_id: string
  price: number
  landed_cost: number
  created_at: string
  product: ProductMetadata
}

export default function InventoryDashboard() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const fetchData = async () => {
      setLoading(true)
      
      const branchRes = await fetch("/api/branches")
      if (branchRes.ok) {
        const dbBranches = await branchRes.json()
        setBranches(dbBranches)
      }

      // Fetch Inventory with Product join
      let query = supabase
        .from('inventory')
        .select(`
          *,
          product:products (
            id,
            brand,
            model_name,
            category,
            description,
            product_code,
            min_stock_level,
            tracking_type
          ),
          branch:branches!left (*)
        `)
      
      // Condition branch filtering
      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch)
      }
      
      const { data: dbInventory, error: invErr } = await query
      if (!invErr && dbInventory) {
        setInventory(dbInventory as unknown as InventoryItem[])
      } else {
        setInventory([])
      }
      
      setLoading(false)
    }

    fetchData()

    const channel = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedBranch])

  const calculateDaysInStock = (createdAt: string) => {
    const createdDate = new Date(createdAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - createdDate.getTime())
    return Math.floor(diffTime / (1000 * 3600 * 24))
  }

   const getAgingColor = (days: number) => {
    if (days > 60) return "text-[#DC143C] font-bold" // Crimson for Critical Aging
    if (days >= 30) return "text-[#D97706] font-semibold"
    return "text-slate-600"
  }

  // Calculate Low Stock with tracking_type filter
  const lowStockCount = inventory.reduce((acc, item) => {
    // Only count as low stock if it's a Stocked item
    if (item.product?.tracking_type !== 'Stocked') return acc;
    
    const branchItems = inventory.filter(i => 
      i.product_id === item.product_id && 
      i.branch_id === item.branch_id && 
      i.status === "Available"
    ).length
    if (branchItems < (item.product?.min_stock_level ?? 0)) return acc + 1
    return acc
  }, 0)

  const filteredInventory = inventory.filter(item => {
    const brand = item.product?.brand?.toLowerCase() || ""
    const model = item.product?.model_name?.toLowerCase() || ""
    const serial = item.serial_number?.toLowerCase() || ""
    const query = searchQuery.toLowerCase()
    
    return brand.includes(query) || model.includes(query) || serial.includes(query)
  }).sort((a, b) => {
    const daysA = calculateDaysInStock(a.created_at)
    const daysB = calculateDaysInStock(b.created_at)
    return sortOrder === 'oldest' ? daysB - daysA : daysA - daysB
  })

  const availableStock = inventory.filter(i => i.status === "Available").length
  const inTransit = inventory.filter(i => i.status === "In-Transit").length
  const soldStock = inventory.filter(i => i.status === "Sold").length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Inventory Register</h1>
          <p className="text-slate-500 mt-1">Real-time assets & aging protocols across the network.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Search Brand, Item or SN..." 
              className="pl-9 w-[280px] h-10 border-slate-200 focus-visible:ring-blue-500 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            <span className="text-[10px] font-bold tracking-wider text-slate-400">Branch</span>
            <Select value={selectedBranch} onValueChange={(val) => { if (val) setSelectedBranch(val) }}>
              <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0 text-sm font-semibold h-8 p-0">
                <SelectValue>
                  {selectedBranch === "all" ? "All Branches" : branches.find(b => b.id === selectedBranch)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="h-10 border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 font-bold gap-2"
          >
            <Upload className="h-4 w-4" /> Import Opening Stock
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-t-4 border-t-[#7FD1E3] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 tracking-wider">Available Units</CardTitle>
            <Package className="h-4 w-4 text-[#7FD1E3]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#001529]">
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : availableStock}
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#D4860A] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 tracking-wider">Network Movement</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#D4860A]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#001529]">
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : inTransit}
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#5A9E78] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 tracking-wider">Disposition (Sold)</CardTitle>
            <AlertCircle className="h-4 w-4 text-[#5A9E78]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#001529]">
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : soldStock}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-xl overflow-hidden rounded-xl">
        <CardHeader className="bg-[#001529] text-white py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-[#7FD1E3]" />
              <CardTitle className="text-lg font-bold tracking-tight">Active Stock Registry</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/10 text-xs font-bold gap-2"
                onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
              >
                <ArrowUpDown className="h-3 w-3" />
                Sort by Age ({sortOrder === 'oldest' ? 'Oldest First' : 'Newest First'})
              </Button>
              <Badge variant="outline" className="border-white/20 text-white/60 text-[10px] font-bold px-3">
                {filteredInventory.length} Tracking
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TooltipProvider>
          <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider">Brand</TableHead>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider">EHA Code</TableHead>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider">Item Name & Specification</TableHead>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider">Serial Number</TableHead>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider text-center">Category</TableHead>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider">Branch</TableHead>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider text-center">Status</TableHead>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider">Landed Cost</TableHead>
                <TableHead className="font-bold text-slate-500 text-[10px] tracking-wider text-right">Aging</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-xs font-bold text-slate-400 tracking-wider">Hydrating Registry...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <AlertOctagon className="h-10 w-10 text-slate-200" />
                      <p className="text-sm font-medium text-slate-400">No matching assets found in current perimeter.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredInventory.map((item) => {
                const days = calculateDaysInStock(item.created_at)
                return (
                  <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                    <TableCell className="font-bold text-slate-400 group-hover:text-slate-900 transition-colors">{item.product?.brand || "Generic"}</TableCell>
                    <TableCell>
                      <code className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono font-bold">
                        {item.product?.product_code || '---'}
                      </code>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#001529] tracking-tight">{item.product?.model_name || "Unknown Item"}</span>
                        <span className="text-[11px] text-slate-400 font-medium group-hover:text-slate-500 line-clamp-1">{item.product?.description || "No specs available"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-slate-100 text-[#001529] px-2 py-0.5 rounded font-mono text-sm font-bold border border-slate-200">
                        {item.serial_number}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[10px]">{item.product?.category || "Misc"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium text-slate-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                        {branches.find(b => b.id === item.branch_id)?.name || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        item.status === "Available"
                          ? "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-[#5A9E78] border border-green-100 tracking-wider"
                          : item.status === "In-Transit"
                          ? "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-[#D4860A] border border-amber-100 tracking-wider"
                          : "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-red-50 text-[#C0392B] border border-red-100 tracking-wider"
                      }>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-[#001529]">₹{(item.landed_cost || item.price).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Tooltip>
                        <TooltipTrigger>
                          <div className={`flex items-center justify-end gap-1.5 cursor-default ${getAgingColor(days)}`}>
                            {days > 60 && <AlertCircle className="h-3 w-3" />}
                            <Clock className="h-3 w-3 opacity-50" />
                            <span className="text-xs">{days}d</span>
                          </div>
                        </TooltipTrigger>
                        {days > 60 && (
                          <TooltipContent className="bg-[#DC2626] text-white border-none font-bold text-[10px]">
                            SLOW MOVER PROTOCOL ACTIVE
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      <ImportStockModal 
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={() => {
          // The real-time channel will handle refresh, but we can also manually trigger if needed
        }}
      />
    </div>
  )
}
