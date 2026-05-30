"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"

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
  ChevronDown,
  Send,
  FileSpreadsheet
} from "lucide-react"
import { exportToExcel } from "@/lib/export-utils"
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
import { useIsSmallMobile } from "@/hooks/use-mobile"

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
  base_price: number
  min_stock_level: number
  low_stock_threshold: number | null
  categories: {
    low_stock_threshold: number
  } | null
  tracking_type: string
  purchase_price: number | null
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
  current_balance: number
  serial_numbers: string[]
  product: ProductMetadata
}

interface BranchGroup {
  branch_id: string;
  branch_name: string;
  total_stock: number;
  total_landed_cost: number;
  max_aging: number;
  items: InventoryItem[];
  status: string;
}

interface ProductGroup {
  key: string; // product_code
  product?: ProductMetadata;
  total_network_stock: number;
  total_network_landed_cost: number;
  max_network_aging: number;
  branches: BranchGroup[];
  brand: string;
  product_code: string;
  model_name: string;
  category: string;
  status: string; // Aggregate status
}

import { useGlobalContext } from "@/context/GlobalContext"

export default function InventoryDashboard() {
  const { activeBranch } = useGlobalContext()
  const [branches, setBranches] = useState<Branch[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest')
  const isSmallMobile = useIsSmallMobile()
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({})
  const [canExport, setCanExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab')
    if (tab === 'inventory-register' || tab === 'active') return 'active'
    if (tab === 'dispositions') return 'dispositions'
    return 'active'
  }, [searchParams])

  const toggleRow = (key: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const toggleBranch = (key: string) => {
    setExpandedBranches(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Hook-like separation for inventory fetching logic
  useEffect(() => {
    
    const fetchInventoryData = async () => {
      setLoading(true)
      
      const branchRes = await fetch("/api/branches")
      if (branchRes.ok) {
        const dbBranches = await branchRes.json()
        setBranches(dbBranches)
      }

      const session = await import("next-auth/react").then(m => m.getSession())
      const user = session?.user
      if (!user) return

      // Check export permission
      const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))
      const { data: permissionsData } = await import("@/app/actions/user").then(m => m.getUserPermissionsAction(user.id))
      const permissions = Array.isArray(permissionsData) ? (permissionsData as unknown as typeof import("@/db/schema").user_permissions.$inferSelect[]).filter((p) => p.module === 'accounting' && p.enabled) : []
      
      const isAdmin = (profile as typeof import("@/db/schema").profiles.$inferSelect)?.role === 'Admin/Owner' || (profile as typeof import("@/db/schema").profiles.$inferSelect)?.role === 'SUPER_ADMIN' || (profile as typeof import("@/db/schema").profiles.$inferSelect)?.role === 'finance'
      const hasAccounting = permissions.length > 0
      setCanExport(isAdmin || hasAccounting)

      // Fetch Inventory with Product join
      // Determine what base branch to use if not overridden by the UI filter
      const effectiveBranchId = selectedBranch === "all" ? (activeBranch?.id || "all") : selectedBranch;

      const { data: dbInventory, error: invErr } = await import("@/app/actions/generics").then(m => m.fetchData("inventory"))
      if (invErr) {
        console.error("DEBUG INVENTORY ERROR:", invErr)
      }
      
      let finalInventory: Record<string, unknown>[] = []
      if (!invErr && dbInventory && Array.isArray(dbInventory)) {
        finalInventory = dbInventory
        if (effectiveBranchId !== "all" && effectiveBranchId !== "ALL_000") {
          finalInventory = finalInventory.filter(i => (i as Record<string, unknown>)['branch_id'] === effectiveBranchId)
        }
      }
      
      setInventory(finalInventory as unknown as InventoryItem[])
      setLoading(false)
    }

    fetchInventoryData()

    // Disabling realtime sync since supabase is removed.
    // Instead we rely on SWR or manual refresh if needed.
    return () => {}
  }, [selectedBranch, activeBranch?.id])

  const handleExport = async () => {
    
    setExporting(true)
    try {
      const { data, error } = await (Promise.resolve({ data: [] }) as unknown as Promise<{ data: unknown[], error: Error | null }>)
      if (error) throw error
      if (data) {
        exportToExcel(data as Record<string, unknown>[], 'Inventory')
      }
    } catch (err) {
      console.error("Export failed", err)
    } finally {
      setExporting(false)
    }
  }

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
    const isItemActive = (item.status === 'Available' || item.status === 'In-Transit') && (item.current_balance > 0)
    
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
    const productGroups: Record<string, ProductGroup> = {};
    
    filteredInventory.forEach(item => {
      const pCode = item.product?.product_code || '---';
      const bId = item.branch_id;
      const status = item.status;
      
      // Initialize Product Group
      if (!productGroups[pCode]) {
        productGroups[pCode] = {
          key: pCode,
          product: item.product,
          total_network_stock: 0,
          total_network_landed_cost: 0,
          max_network_aging: 0,
          branches: [],
          brand: item.product?.brand || "Generic",
          product_code: pCode,
          model_name: item.product?.model_name || "Unknown Item",
          category: item.product?.category || "Misc",
          status: status
        };
      }
      
      const pg = productGroups[pCode];
      pg.total_network_stock += (item.current_balance || 0);
      pg.total_network_landed_cost += (item.landed_cost || item.price);
      const days = calculateDaysInStock(item.created_at);
      if (days > pg.max_network_aging) pg.max_network_aging = days;

      // Find or Create Branch Group within Product
      let bg = pg.branches.find(b => b.branch_id === bId && b.status === status);
      if (!bg) {
        bg = {
          branch_id: bId,
          branch_name: branches.find(b => b.id === bId)?.name || "—",
          total_stock: 0,
          total_landed_cost: 0,
          max_aging: 0,
          items: [],
          status: status
        };
        pg.branches.push(bg);
      }
      
      bg.items.push(item);
      bg.total_stock += (item.current_balance || 0);
      bg.total_landed_cost += (item.landed_cost || item.price);
      if (days > bg.max_aging) bg.max_aging = days;
    });

    return Object.values(productGroups).sort((a, b) => {
      return sortOrder === 'oldest' ? b.max_network_aging - a.max_network_aging : a.max_network_aging - b.max_network_aging;
    });
  }, [filteredInventory, branches, sortOrder]);

  // Real-time Summary Stats for the Summary Strip
  const summaryStats = useMemo(() => {
    const stats = {
      totalCost: 0,
      totalRevenue: 0,
      lowStockSKUs: 0
    };

    // Calculate Financials from the currently filtered dataset
    filteredInventory.forEach(item => {
      const qty = item.current_balance || 0;
      stats.totalCost += (item.landed_cost || item.price || 0) * qty;
      stats.totalRevenue += (item.product?.base_price || 0) * qty;
    });

    // Calculate Low Stock SKUs from the grouped (per-product) view
    groupedInventory.forEach(group => {
      const threshold = group.product?.low_stock_threshold ?? group.product?.categories?.low_stock_threshold ?? 10;
      if (group.total_network_stock <= threshold) {
        stats.lowStockSKUs += 1;
      }
    });

    return stats;
  }, [filteredInventory, groupedInventory]);

  return (
    <div className="p-6 pb-0 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Inventory Register</h1>
          <p className="text-slate-500 mt-1">Real-time assets & aging protocols across the network.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canExport && (
            <Button 
              onClick={handleExport} 
              variant="outline" 
              disabled={exporting}
              className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 gap-1.5 font-bold h-10 px-4 text-xs transition-all shadow-sm"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              Export Ledger
            </Button>
          )}
          <Button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[#001529] hover:bg-[#002a52] gap-1.5 font-bold shadow-md h-10 px-6 text-xs"
          >
            <Upload className="h-4 w-4" /> Import Opening Stock
          </Button>
        </div>
      </div>      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Inventory Cost (Valuation) */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden group hover:border-[#001529]/20 transition-all">
          <div className="h-1 bg-[#001529]/10 w-full" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Inventory Cost</CardTitle>
              {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">Consolidated</span>}
            </div>
            <div className="h-7 w-7 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
              <Package className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-black text-[#001529] tracking-tight">
              {loading ? <Loader2 className="animate-spin h-5 w-5 text-slate-300" /> : formatCurrency(summaryStats.totalCost)}
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Total Capital Portfolio</p>
          </CardContent>
        </Card>

        {/* Card 2: Potential Revenue (MSRP) */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden group hover:border-[#7FD1E3]/20 transition-all">
          <div className="h-1 bg-[#7FD1E3]/20 w-full" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Potential Revenue</CardTitle>
              {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">Consolidated</span>}
            </div>
            <div className="h-7 w-7 bg-[#7FD1E3]/5 rounded-lg flex items-center justify-center border border-[#7FD1E3]/10">
              <TrendingUp className="h-3.5 w-3.5 text-[#7FD1E3]" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-black text-[#001529] tracking-tight">
              {loading ? <Loader2 className="animate-spin h-5 w-5 text-slate-300" /> : formatCurrency(summaryStats.totalRevenue)}
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Expected Maturity Value</p>
          </CardContent>
        </Card>

        {/* Card 3: System Health (Low Stock) */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden group hover:border-rose-200 transition-all">
          <div className="h-1 bg-rose-500/10 w-full" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">SKUs Below Threshold</CardTitle>
              {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">Consolidated</span>}
            </div>
            <div className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center border transition-all",
              summaryStats.lowStockSKUs > 0 ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"
            )}>
              <AlertOctagon className={cn("h-3.5 w-3.5", summaryStats.lowStockSKUs > 0 ? "text-rose-500 animate-pulse" : "text-slate-300")} />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className={cn(
              "text-2xl font-black tracking-tight",
              summaryStats.lowStockSKUs > 0 ? "text-rose-600" : "text-[#001529]"
            )}>
              {loading ? <Loader2 className="animate-spin h-5 w-5 text-slate-300" /> : `${summaryStats.lowStockSKUs} Asset Lines`}
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Replenishment Required</p>
          </CardContent>
        </Card>
      </div>


      <div className="flex border-b border-slate-200 mt-6 mb-4">
        <button
          onClick={() => router.push('?tab=active', { scroll: false })}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
            activeTab === 'active' ? "border-[#001529] text-[#001529]" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Active Stock
        </button>
        <button
          onClick={() => router.push('?tab=dispositions', { scroll: false })}
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
            {isSmallMobile ? (
              <div className="p-4 space-y-4 bg-slate-50/50">
                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Hydrating Registry...</p>
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3">
                    <AlertOctagon className="h-10 w-10 text-slate-200" />
                    <p className="text-sm font-medium text-slate-400">No matching assets found.</p>
                  </div>
                ) : (
                  filteredInventory.map((item) => {
                    const days = calculateDaysInStock(item.created_at)
                    return (
                      <Card key={item.id} className="border border-slate-200 shadow-sm overflow-hidden bg-white hover:border-[#7FD1E3] transition-colors">
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.product?.brand}</span>
                                <Badge variant="outline" className="text-[8px] font-bold py-0 h-4">{item.product?.category}</Badge>
                              </div>
                              <h3 className="font-bold text-slate-900 text-sm leading-tight truncate pr-2">{item.product?.model_name}</h3>
                              <code className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1 rounded">{item.product?.product_code}</code>
                            </div>
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
                              item.status === "Available" ? "bg-green-100 text-[#5A9E78]" :
                              item.status === "In-Transit" ? "bg-amber-100 text-[#D4860A]" :
                              "bg-red-100 text-[#C0392B]"
                            )}>
                              {item.status}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Serial Number</p>
                              <p className="text-xs font-mono font-bold text-[#001529]">{item.serial_number || "[NON-SERIALIZED]"}</p>
                            </div>
                            <div className="text-right space-y-0.5">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Branch Location</p>
                              <p className="text-xs font-bold text-slate-700">{branches.find(b => b.id === item.branch_id)?.name || "—"}</p>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between bg-slate-50 -mx-4 px-4 py-2 border-t border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Landed Cost</span>
                              <span className="text-sm font-black text-[#001529]">{formatCurrency(item.landed_cost || item.price)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={cn("flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200", getAgingColor(days))}>
                                <Clock className="h-3 w-3 opacity-60" />
                                <span className="text-xs font-bold">{days} Days</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-slate-50 border-b">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-10"></TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-24">Brand</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-28">EHA Code</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Item Name & Specification</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center w-24">Network Stock</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center w-28">Category</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-32">Distribution</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center w-24">Status</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-28">Avg Value (LC)</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] text-right w-24">Max Aging</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Hydrating Registry...</p>
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
                      const avgLandedCost = group.total_network_stock > 0 ? group.total_network_landed_cost / group.total_network_stock : 0
                      const formattedCount = new Intl.NumberFormat('en-IN').format(group.total_network_stock)

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
                                <span className={cn(
                                  "text-xs font-black",
                                  group.total_network_stock <= (group.product?.low_stock_threshold ?? group.product?.categories?.low_stock_threshold ?? 10) 
                                    ? "text-rose-600 animate-pulse" 
                                    : "text-blue-600"
                                )}>
                                  {formattedCount}
                                </span>
                                {group.total_network_stock <= (group.product?.low_stock_threshold ?? group.product?.categories?.low_stock_threshold ?? 10) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-5 w-5 p-0 hover:bg-rose-50 text-rose-500 mt-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/transfer?tab=requests&demand=${group.product?.id}`);
                                    }}
                                  >
                                    <Send className="h-3 w-3" />
                                  </Button>
                                )}
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Network</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center border-r border-slate-100/50">
                              <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-semibold text-[9px] px-1.5 py-0">{group.category}</Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 border-r border-slate-100/50">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-600 text-[11px]">
                                <Badge variant="outline" className="text-[9px] font-bold py-0">{group.branches.length} Branches</Badge>
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
                                  <div className={cn("flex items-center justify-end gap-1.5 cursor-default", getAgingColor(group.max_network_aging))}>
                                    {group.max_network_aging > 60 && <AlertCircle className="h-3 w-3" />}
                                    <Clock className="h-3 w-3 opacity-50" />
                                    <span className="text-xs">{group.max_network_aging}d</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 text-white border-none font-bold text-[10px]">
                                  {group.max_network_aging > 60 ? "SLOW MOVER PROTOCOL ACTIVE" : "Active Stock Aging Overview"}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow className="bg-slate-50/30 border-b border-slate-100">
                              <TableCell colSpan={10} className="p-0">
                                <div className="px-4 md:px-12 py-3 bg-white/50 animate-in slide-in-from-top-2 duration-300">
                                    <Table className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                                      <TableHeader className="bg-slate-50">
                                        <TableRow className="hover:bg-transparent h-8">
                                          <TableHead className="w-8 md:w-10"></TableHead>
                                          <TableHead className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-4">Branch Outlet</TableHead>
                                          <TableHead className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-4 text-center">Branch Stock</TableHead>
                                          <TableHead className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-4">Landed Cost (Avg)</TableHead>
                                          <TableHead className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Aging</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {group.branches.map((branch) => {
                                          const branchKey = `${group.key}-${branch.branch_id}`;
                                          const isBranchExpanded = expandedBranches[branchKey];
                                          return (
                                            <React.Fragment key={branchKey}>
                                              <TableRow 
                                                className="hover:bg-slate-50/50 transition-colors cursor-pointer border-slate-100"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleBranch(branchKey);
                                                }}
                                              >
                                                <TableCell className="py-2 px-2 text-center w-8">
                                                  {isBranchExpanded ? <ChevronDown className="h-3 w-3 text-blue-600" /> : <ChevronRight className="h-3 w-3 text-slate-300" />}
                                                </TableCell>
                                                <TableCell className="py-2 px-4 whitespace-nowrap">
                                                  <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[10px]">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                                    {branch.branch_name}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="py-2 px-4 text-center font-black text-[#001529] text-[10px] whitespace-nowrap">
                                                  {branch.total_stock} Units
                                                </TableCell>
                                                <TableCell className="py-2 px-4 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                                  {formatCurrency(branch.total_stock > 0 ? branch.total_landed_cost / branch.total_stock : 0)}
                                                </TableCell>
                                                <TableCell className="py-2 px-4 text-right whitespace-nowrap">
                                                  <span className={cn("text-[10px] font-bold", getAgingColor(branch.max_aging))}>
                                                    {branch.max_aging} Days
                                                  </span>
                                                </TableCell>
                                              </TableRow>

                                              {isBranchExpanded && (
                                                <TableRow className="bg-slate-50/20">
                                                  <TableCell colSpan={5} className="p-0">
                                                    <Table className="px-4 md:px-10 py-2 border-l-2 border-blue-100 bg-slate-50/10">
                                                        <TableHeader className="bg-slate-100/30">
                                                          <TableRow className="h-7 border-0">
                                                            <TableHead className="py-1 px-4 text-[7px] font-black uppercase text-slate-400 whitespace-nowrap">Serial Number</TableHead>
                                                            <TableHead className="py-1 px-4 text-[7px] font-black uppercase text-slate-400 whitespace-nowrap">Landed Cost (LCI)</TableHead>
                                                            <TableHead className="py-1 px-4 text-[7px] font-black uppercase text-slate-400 whitespace-nowrap">Status</TableHead>
                                                            <TableHead className="py-1 px-4 text-[7px] font-black uppercase text-slate-400 text-right whitespace-nowrap">Aging</TableHead>
                                                          </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                          {branch.items.flatMap((item) => {
                                                            const units = [];
                                                            const days = calculateDaysInStock(item.created_at);
                                                            if (item.serial_numbers && item.serial_numbers.length > 0) {
                                                              item.serial_numbers.forEach(sn => {
                                                                units.push({
                                                                  id: `${item.id}-${sn}`,
                                                                  sn: sn,
                                                                  lc: item.landed_cost || item.price,
                                                                  status: item.status,
                                                                  days: days
                                                                });
                                                              });
                                                            } else {
                                                              const count = item.current_balance || 1;
                                                              for(let i=0; i<count; i++) {
                                                                units.push({
                                                                  id: `${item.id}-${i}`,
                                                                  sn: item.serial_number || "[NOT SERIALIZED]",
                                                                  lc: item.landed_cost || item.price,
                                                                  status: item.status,
                                                                  days: days
                                                                });
                                                              }
                                                            }
                                                            return units;
                                                          }).map((unit) => (
                                                            <TableRow key={unit.id} className="hover:bg-white border-b border-slate-100/50 last:border-0">
                                                              <TableCell className="py-1.5 px-4">
                                                                <code className="text-[9px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded whitespace-nowrap">
                                                                  {unit.sn}
                                                                </code>
                                                              </TableCell>
                                                              <TableCell className="py-1.5 px-4 text-[9px] font-bold text-slate-600 whitespace-nowrap">
                                                                {formatCurrency(unit.lc)}
                                                              </TableCell>
                                                              <TableCell className="py-1.5 px-4">
                                                                <span className={cn(
                                                                  "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter whitespace-nowrap",
                                                                  unit.status === "Available" ? "bg-green-100 text-green-700" : 
                                                                  unit.status === "Reserved" ? "bg-amber-100 text-amber-700" :
                                                                  "bg-slate-100 text-slate-700"
                                                                )}>
                                                                  {unit.status}
                                                                </span>
                                                              </TableCell>
                                                              <TableCell className="py-1.5 px-4 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                                                {unit.days}d
                                                              </TableCell>
                                                            </TableRow>
                                                          ))}
                                                        </TableBody>
                                                    </Table>
                                                  </TableCell>
                                                </TableRow>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </>
            )}
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
