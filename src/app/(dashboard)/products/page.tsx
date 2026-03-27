"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  Search, 
  Plus, 
  ChevronDown, 
  Edit2, 
  Archive, 
  Loader2,
  Settings2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  History,
  FileSpreadsheet
} from "lucide-react"
import { exportToCSV } from "@/lib/export-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddProductModal } from "@/components/products/add-product-modal"
import { EditProductModal } from "@/components/products/edit-product-modal"
import { cn } from "@/lib/utils"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog"

interface Product {
  id: string
  model_name: string
  brand: string
  category: string
  product_code: string
  base_price: number
  hsn_code: string
  min_stock_level: number
  tracking_type: string
  description: string
  gst_rate?: number
  warranty_months?: number
  is_archived?: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState<string | null>(null)
  const [canExport, setCanExport] = useState(false)
  const [exporting, setExporting] = useState(false)

  const supabase = createClient()

  const fetchProducts = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check export permission
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const { data: permissions } = await supabase.from('user_permissions').select('*').eq('user_id', user.id).eq('module', 'accounting').eq('enabled', true)
      
      const isAdmin = profile?.role === 'Admin/Owner' || profile?.role === 'finance'
      const hasAccounting = permissions && permissions.length > 0
      setCanExport(isAdmin || hasAccounting)
    }

    const { data } = await supabase
      .from("products")
      .select("id, model_name, brand, category, product_code, base_price, hsn_code, min_stock_level, tracking_type, description, gst_rate, warranty_months, is_archived")
      .eq("is_archived", showArchived)
      .order("model_name")
    
    if (data) setProducts(data as Product[])
    setLoading(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data, error } = await supabase.rpc('get_export_data', { p_type: 'product_master' })
      if (error) throw error
      if (data) {
        exportToCSV(data as Record<string, any>[], 'Product_Master')
      }
    } catch (err) {
      console.error("Export failed", err)
      setToast({ message: "Export failed: Unauthorized access", type: "error" })
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  const handleArchive = async (id: string) => {
    setLoading(true)
    const { error } = await supabase.from("products").update({ is_archived: true }).eq("id", id)
    
    if (error) {
      setToast({ message: error.message, type: 'error' })
      setLoading(false)
    } else {
      setToast({ message: "Asset successfully decommissioned", type: 'success' })
      setTimeout(() => setToast(null), 3000)
      setConfirmingArchive(null)
      fetchProducts()
    }
  }

  const handleRestore = async (id: string) => {
    setLoading(true)
    const { error } = await supabase.from("products").update({ is_archived: false }).eq("id", id)
    
    if (error) {
      setToast({ message: error.message, type: 'error' })
      setLoading(false)
    } else {
      setToast({ message: "Asset successfully re-commissioned", type: 'success' })
      setTimeout(() => setToast(null), 3000)
      fetchProducts()
    }
  }

  const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort()
  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.product_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesBrand = selectedBrand === "all" || p.brand === selectedBrand
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory

    return matchesSearch && matchesBrand && matchesCategory
  })

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#001529]">Product Master Registry</h1>
          <p className="text-slate-500 text-xs mt-1">Centralized EHA Protocol & Global Stock Assets</p>
        </div>
        
        {/* Toast Notification Container */}
        {toast && (
          <div className={cn(
            "fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-10 duration-500 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border backdrop-blur-md transition-all",
            toast.type === 'success' ? "bg-emerald-500/90 border-emerald-400/50 text-white" : "bg-rose-500/90 border-rose-400/50 text-white"
          )}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 animate-bounce" />
            ) : (
              <XCircle className="h-5 w-5 animate-pulse" />
            )}
            <div className="flex flex-col">
              <span className="font-black text-[10px] uppercase tracking-widest opacity-70">
                {toast.type === 'success' ? "System Success" : "Protocol Deviation"}
              </span>
              <span className="font-bold text-sm tracking-tight">{toast.message}</span>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close notification"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowArchived(!showArchived)} 
            variant="outline"
            className={cn(
              "gap-2 font-bold transition-all h-10 px-4 text-xs",
              showArchived ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : "hover:bg-slate-50"
            )}
          >
            {showArchived ? (
              <><History className="h-4 w-4" /> View Active Assets</>
            ) : (
              <><Archive className="h-4 w-4" /> View Archived Assets</>
            )}
          </Button>
          {canExport && (
            <Button 
              onClick={handleExport} 
              variant="outline" 
              disabled={exporting}
              className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 gap-1.5 font-bold h-10 px-4 text-xs transition-all shadow-sm"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              Export Registry
            </Button>
          )}
          {!showArchived && (
            <Button onClick={() => setIsAddOpen(true)} className="bg-[#001529] hover:bg-[#002a52] gap-1.5 font-bold shadow-md h-10 px-6 text-xs">
              <Plus className="h-4 w-4" /> Add New Asset
            </Button>
          )}
        </div>
      </div>

      <Card className="border-slate-200 shadow-xl overflow-hidden rounded-xl py-0">
        <CardHeader className="bg-[#001529] text-white pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search Protocol ID, Model or Brand..." 
                className="pl-10 h-8 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/30 rounded-lg text-xs"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "text-white hover:bg-white/10 text-xs font-bold gap-2 hover:text-[#7FD1E3] transition-colors",
                  showFilters && "text-[#7FD1E3] bg-white/5 h-8"
                )}
              >
                <Settings2 className="h-3.5 w-3.5" /> Advance Filters
              </Button>
              <div className="text-[10px] font-bold text-white/40 tracking-wider">
                Live Sync: {filteredProducts.length} Entries
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Brand</span>
                <Select value={selectedBrand} onValueChange={(val) => { if (val) setSelectedBrand(val) }}>
                  <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001529] border-white/10 text-white">
                    <SelectItem value="all">All Brands</SelectItem>
                    {uniqueBrands.map((brand) => (
                      <SelectItem key={brand} value={brand} className="focus:bg-white/10 focus:text-[#7FD1E3]">
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Category</span>
                <Select value={selectedCategory} onValueChange={(val) => { if (val) setSelectedCategory(val) }}>
                  <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001529] border-white/10 text-white">
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="focus:bg-white/10 focus:text-[#7FD1E3]">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => {
                  setSelectedBrand("all")
                  setSelectedCategory("all")
                  setSearchTerm("")
                }}
                className="text-white/40 hover:text-white hover:bg-white/5 text-[9px] font-bold uppercase tracking-widest h-7"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <table className="w-full text-xs min-w-[1200px]">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b">
                <tr>
                  <th className="text-left py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Model Name</th>
                  <th className="text-left py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Brand</th>
                  <th className="text-left py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Category</th>
                  <th className="text-left py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">EHA Code</th>
                  <th className="text-left py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">HSN Code</th>
                  <th className="text-center py-2.5 px-1 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Tax</th>
                  <th className="text-right py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Unit Rate (Excl. Tax)</th>
                  <th className="text-center py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Min Stock</th>
                  <th className="text-center py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Tracking</th>
                  <th className="text-right py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 opacity-30" />
                        <p className="text-[10px] font-bold text-slate-300 tracking-wider">Synchronizing Encrypted Matrix...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400 font-bold text-[10px] tracking-wider">
                      No results found. Check search parameters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, i) => (
                    <tr key={p.id} className={cn(
                      "group hover:bg-slate-50 transition-all cursor-default",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    )}>
                      <td className="py-2 px-4 font-semibold text-slate-900 truncate max-w-[200px]">{p.model_name}</td>
                      <td className="py-2 px-4 font-semibold text-slate-500 tracking-tight">{p.brand}</td>
                      <td className="py-2 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold tracking-tighter">{p.category}</span>
                      </td>
                      <td className="py-2 px-4">
                        <code className="text-[10px] font-mono font-semibold text-[#001529] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{p.product_code || "---"}</code>
                      </td>
                      <td className="py-2 px-4 text-slate-400 font-semibold">{p.hsn_code || "---"}</td>
                      <td className="py-2 px-1 text-center font-bold text-slate-500 text-[10px]">{p.gst_rate ?? 18}%</td>
                      <td className="py-2 px-4 font-bold text-right text-[#001529] text-xs">₹{p.base_price.toLocaleString("en-IN")}</td>
                      <td className="py-2 px-4 text-center">
                        <span className="font-semibold text-slate-900 border border-slate-100 px-1.5 py-0.5 rounded bg-slate-50">{p.min_stock_level || 0}</span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <div className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider border",
                          p.tracking_type === 'Stocked' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          p.tracking_type === 'On-Demand' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          {p.tracking_type}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button className="bg-[#001529] text-white hover:bg-slate-800 border-none shadow-md font-bold h-8 text-[11px] gap-2 px-4 transition-all active:scale-95">
                              Actions <ChevronDown className="h-3 w-3" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-44 font-bold text-[10px] uppercase tracking-wider text-[#001529] border-slate-200 shadow-2xl">
                            <DropdownMenuItem onClick={() => setEditingProduct(p)} className="gap-3 cursor-pointer py-2.5 font-bold text-[10px] uppercase tracking-wider">
                              <Edit2 className="h-3.5 w-3.5 text-blue-500" /> Edit Metadata
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            {p.is_archived ? (
                              <DropdownMenuItem onClick={() => handleRestore(p.id)} className="gap-3 text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer py-2.5 font-bold text-[10px] uppercase tracking-wider">
                                <RefreshCw className="h-3.5 w-3.5" /> Re-commission Asset
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setConfirmingArchive(p.id)} className="gap-3 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer py-2.5 font-bold text-[10px] uppercase tracking-wider">
                                <Archive className="h-3.5 w-3.5" /> Decommission Asset
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddProductModal 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onSuccess={fetchProducts} 
      />

      {editingProduct && (
        <EditProductModal
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          onSuccess={fetchProducts}
          product={editingProduct}
        />
      )}

      {/* Confirmation Modal for Decommissioning */}
      <Dialog open={!!confirmingArchive} onOpenChange={(open) => !open && setConfirmingArchive(null)}>
        <DialogContent className="md:max-w-[400px] border-amber-200 shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-4 pt-4">
            <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
              <AlertTriangle className="h-8 w-8 text-amber-500 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-bold text-[#001529]">Decommission Asset?</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm leading-relaxed">
              This will remove the product from the <strong>active registry</strong> and sales terminal. Are you sure you want to proceed with this protocol?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setConfirmingArchive(null)}
              className="flex-1 font-bold border-slate-200 h-10"
            >
              Abort Protocol
            </Button>
            <Button 
              type="button" 
              onClick={() => confirmingArchive && handleArchive(confirmingArchive)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-10 shadow-lg shadow-red-200"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Decommission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
