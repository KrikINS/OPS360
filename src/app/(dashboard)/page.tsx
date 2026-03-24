"use client"

import React, { useEffect, useState, useMemo } from "react"
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
  Clock,
  Settings2,
  ChevronRight,
  ChevronDown
} from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Upload } from "lucide-react"
import { ImportStockModal } from "@/components/inventory/import-stock-modal"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/utils/format"

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
  available_quantity: number
  product: ProductMetadata
}

interface InventoryGroup {
  key: string;
  product?: ProductMetadata;
  branch_id: string;
  branch_name: string;
  total_stock: number;
  items: InventoryItem[];
  status: string;
  max_aging: number;
  total_landed_cost: number;
  brand: string;
  product_code: string;
  model_name: string;
  category: string;
}

export default function InventoryDashboard() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'active' | 'dispositions'>('active')

  const toggleRow = (key: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

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
          product:products!inventory_product_id_fkey (
            id,
            brand,
            model_name,
            category,
            description,
            product_code,
            min_stock_level,
            tracking_type
          ),
          branch:branches!left (*),
          available_quantity
        `)
      
      // Condition branch filtering
      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch)
      }
      
      const { data: dbInventory, error: invErr } = await query
      if (invErr) {
        console.error("DEBUG INVENTORY ERROR:", invErr.message, invErr.details, invErr.hint, invErr.code)
      }
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

  // Get unique brands from inventory for filtering
  const uniqueBrands = Array.from(new Set(inventory.map(item => item.product?.brand).filter(Boolean))).sort()


  const filteredInventory = inventory.filter(item => {
    // 1. Tab Level Filtering
    const isActiveTab = activeTab === 'active'
    const isItemActive = (item.status === 'Available' || item.status === 'In-Transit') && (item.available_quantity > 0)
    
    if (isActiveTab && !isItemActive) return false
    if (!isActiveTab && isItemActive) return false

    // 2. Search & UI Filtering
    const brand = item.product?.brand?.toLowerCase() || ""
    const model = item.product?.model_name?.toLowerCase() || ""
    const serial = item.serial_number?.toLowerCase() || ""
    const query = searchQuery.toLowerCase()
    
    const matchesSearch = brand.includes(query) || model.includes(query) || serial.includes(query)
    const matchesBrand = selectedBrand === "all" || item.product?.brand === selectedBrand

    return matchesSearch && matchesBrand
  })

  const groupedInventory = useMemo(() => {
    const groups: Record<string, InventoryGroup> = {};
    filteredInventory.forEach(item => {
      const key = `${item.branch_id}-${item.product?.product_code}-${item.status}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          product: item.product,
          branch_id: item.branch_id,
          branch_name: branches.find(b => b.id === item.branch_id)?.name || "—",
          total_stock: 0,
          items: [],
          status: item.status,
          max_aging: 0,
          total_landed_cost: 0,
          brand: item.product?.brand || "Generic",
          product_code: item.product?.product_code || '---',
          model_name: item.product?.model_name || "Unknown Item",
          category: item.product?.category || "Misc"
        };
      }
      groups[key].items.push(item);
      groups[key].total_stock += (item.available_quantity || 0);
      const days = calculateDaysInStock(item.created_at);
      if (days > groups[key].max_aging) groups[key].max_aging = days;
      groups[key].total_landed_cost += (item.landed_cost || item.price);
    });

    return Object.values(groups).sort((a, b) => {
      return sortOrder === 'oldest' ? b.max_aging - a.max_aging : a.max_aging - b.max_aging;
    });
  }, [filteredInventory, branches, sortOrder]);

  const availableStock = inventory.filter(i => i.status === "Available").reduce((sum, item) => sum + (item.available_quantity || 0), 0)
  const inTransit = inventory.filter(i => i.status === "In-Transit").reduce((sum, item) => sum + (item.available_quantity || 0), 0)
  const soldStock = inventory.filter(i => i.status === "Sold").reduce((sum, item) => sum + (item.available_quantity || 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Inventory Register</h1>
          <p className="text-slate-500 mt-1">Real-time assets & aging protocols across the network.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[#001529] hover:bg-[#002a52] gap-1.5 font-bold shadow-md h-10 px-6 text-xs"
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


      <div className="flex border-b border-slate-200 mt-6 mb-4">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
            activeTab === 'active' ? "border-[#001529] text-[#001529]" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Active Stock
        </button>
        <button
          onClick={() => setActiveTab('dispositions')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
            activeTab === 'dispositions' ? "border-[#D4860A] text-[#D4860A]" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Dispositions (Sold/Returned)
        </button>
      </div>

      <Card className="border-slate-200 shadow-xl overflow-hidden rounded-xl py-0">
        <CardHeader className="bg-[#001529] text-white pt-4 pb-2 mb-0 rounded-t-lg">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-[#7FD1E3]" />
                <CardTitle className="text-lg font-bold tracking-tight">
                  {activeTab === 'active' ? 'Active Stock Registry' : 'Historical Dispositions'}
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "text-white hover:bg-white/10 text-xs font-bold gap-2 hover:text-[#7FD1E3] transition-colors h-10",
                    showFilters && "text-[#7FD1E3] bg-white/5"
                  )}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Settings2 className="h-3.5 w-3.5" /> Advance Filters
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10 text-xs font-bold gap-2 h-10"
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

            {showFilters && (
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                <div className="relative group flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 group-focus-within:text-[#7FD1E3] transition-colors" />
                  <Input 
                    placeholder="Search Brand, Item or SN..." 
                    className="pl-9 h-8 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/40 rounded-lg text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                  <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Brand</span>
                  <Select value={selectedBrand} onValueChange={(val) => { if (val) setSelectedBrand(val) }}>
                    <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                      <SelectValue>
                        {selectedBrand === "all" ? "All Brands" : selectedBrand}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#001529] border-white/10 text-white">
                      <SelectItem value="all">All Brands</SelectItem>
                      {uniqueBrands.map((brand) => (
                        <SelectItem key={brand} value={brand!} className="focus:bg-white/10 focus:text-[#7FD1E3]">
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                  <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Branch</span>
                  <Select value={selectedBranch} onValueChange={(val) => { if (val) setSelectedBranch(val) }}>
                    <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                      <SelectValue>
                        {selectedBranch === "all" ? "All Branches" : branches.find(b => b.id === selectedBranch)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#001529] border-white/10 text-white">
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="focus:bg-white/10 focus:text-[#7FD1E3]">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSelectedBrand("all")
                    setSelectedBranch("all")
                    setSearchQuery("")
                  }}
                  className="text-white/40 hover:text-white hover:bg-white/5 text-[9px] font-bold uppercase tracking-widest h-9 ml-auto"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TooltipProvider>
          <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-10"></TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-24">Brand</TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-28">EHA Code</TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Item Name & Specification</TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center w-24">Total Stock</TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center w-28">Category</TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-32">Branch</TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center w-24">Status</TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-28">Value (LC)</TableHead>
                <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] text-right w-24">Primary Aging</TableHead>
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
              ) : groupedInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <AlertOctagon className="h-10 w-10 text-slate-200" />
                      <p className="text-sm font-medium text-slate-400">No matching assets found in current perimeter.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : groupedInventory.map((group) => {
                const isExpanded = expandedRows[group.key]
                const avgLandedCost = group.total_landed_cost / group.total_stock
                const formattedCount = new Intl.NumberFormat('en-IN').format(group.total_stock)

                return (
                  <React.Fragment key={group.key}>
                    <TableRow 
                      className={cn(
                        "group hover:bg-slate-50/80 transition-all border-b last:border-0 cursor-pointer",
                        isExpanded && "bg-slate-50/50"
                      )}
                      onClick={() => toggleRow(group.key)}
                    >
                      <TableCell className="py-3 px-4 text-center border-r border-slate-100/50">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-200 rounded-full">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-[#001529]" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </Button>
                      </TableCell>
                      <TableCell className="py-3 px-4 font-semibold text-slate-500 tracking-tight group-hover:text-slate-900">{group.brand}</TableCell>
                      <TableCell className="py-3 px-4 border-r border-slate-100/50">
                        <code className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono font-bold">
                          {group.product_code}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-[250px] py-3 px-4 border-r border-slate-100/50">
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-semibold text-[#001529] tracking-tight break-words line-clamp-2" title={group.model_name}>
                            {group.model_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center border-r border-slate-100/50">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-black text-[#001529]">{formattedCount}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Units</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center border-r border-slate-100/50">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-semibold text-[9px] px-1.5 py-0">{group.category}</Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 border-r border-slate-100/50">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-600 text-[11px]">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                          {group.branch_name}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center border-r border-slate-100/50">
                        <span className={cn(
                          "inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-bold tracking-wider",
                          group.status === "Available" ? "bg-green-50 text-[#5A9E78] border border-green-100" :
                          group.status === "In-Transit" ? "bg-amber-50 text-[#D4860A] border border-amber-100" :
                          "bg-red-50 text-[#C0392B] border border-red-100"
                        )}>
                          {group.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 font-bold text-[#001529] text-xs border-r border-slate-100/50">
                        {formatCurrency(avgLandedCost)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right pr-6">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={cn("flex items-center justify-end gap-1.5 cursor-default", getAgingColor(group.max_aging))}>
                              {group.max_aging > 60 && <AlertCircle className="h-3 w-3" />}
                              <Clock className="h-3 w-3 opacity-50" />
                              <span className="text-xs">{group.max_aging}d</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 text-white border-none font-bold text-[10px]">
                            {group.max_aging > 60 ? "SLOW MOVER PROTOCOL ACTIVE" : "Active Stock Aging Overview"}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-slate-50/30 border-b border-slate-100">
                        <TableCell colSpan={10} className="p-0">
                          <div className="px-16 py-4 bg-white/50 animate-in slide-in-from-top-2 duration-300">
                            {group.product?.description && (
                              <div className="mb-4 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Model Specification / Description</h4>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{group.product.description}</p>
                              </div>
                            )}
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                              <Table>
                                <TableHeader className="bg-slate-100/50">
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-8 text-[8px] font-black text-slate-500 uppercase tracking-widest px-4">Serial Number</TableHead>
                                    <TableHead className="h-8 text-[8px] font-black text-slate-500 uppercase tracking-widest px-4">Landed Cost</TableHead>
                                    <TableHead className="h-8 text-[8px] font-black text-slate-500 uppercase tracking-widest px-4">Registry Date</TableHead>
                                    <TableHead className="h-8 text-[8px] font-black text-slate-500 uppercase tracking-widest px-4 text-right">Aging</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.items.map((item: InventoryItem) => {
                                    const days = calculateDaysInStock(item.created_at)
                                    return (
                                      <TableRow key={item.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                                        <TableCell className="py-2 px-4">
                                          <code className="bg-[#001529]/5 text-[#001529] px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                                            {item.serial_number}
                                          </code>
                                        </TableCell>
                                        <TableCell className="py-2 px-4 text-[10px] font-bold text-slate-600">{formatCurrency(item.landed_cost || item.price)}</TableCell>
                                        <TableCell className="py-2 px-4 text-[10px] text-slate-400 font-medium">
                                          {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell className="py-2 px-4 text-right pr-6">
                                          <div className={cn("inline-flex items-center gap-1 font-bold text-[10px]", getAgingColor(days))}>
                                            <Clock className="h-2.5 w-2.5 opacity-50" />
                                            {days} Days
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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
