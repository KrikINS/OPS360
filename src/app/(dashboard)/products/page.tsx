"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  Package, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Archive, 
  Loader2,
  Filter
} from "lucide-react"
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
import { AddProductModal } from "@/components/products/add-product-modal"
import { EditProductModal } from "@/components/products/edit-product-modal"
import { cn } from "@/lib/utils"

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
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const supabase = createClient()

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("products")
      .select("id, model_name, brand, category, product_code, base_price, hsn_code, min_stock_level, tracking_type, description")
      .eq("is_archived", false)
      .order("model_name")
    
    if (data) setProducts(data as Product[])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this product?")) return
    const { error } = await supabase.from("products").update({ is_archived: true }).eq("id", id)
    if (error) alert(error.message)
    else fetchProducts()
  }

  const filteredProducts = products.filter(p => 
    p.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.product_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#001529] uppercase">Product Master Registry</h1>
          <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Centralized EHA Protocol & Global Stock Assets</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="h-10 border-slate-200 border-dashed gap-2 text-xs font-bold">
            <Filter className="h-3.5 w-3.5" /> Advance Filters
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="bg-[#001529] hover:bg-[#002a52] gap-1.5 font-bold shadow-md h-10 px-6 uppercase text-xs">
            <Plus className="h-4 w-4" /> Add New Asset
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-xl overflow-hidden rounded-xl">
        <CardHeader className="bg-[#001529] text-white py-4 px-6 border-b-0 space-y-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search Protocol ID, Model or Brand..." 
                className="pl-10 h-10 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/30 rounded-lg text-xs"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                Live Sync: {filteredProducts.length} Entries
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <table className="w-full text-xs min-w-[1200px]">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b">
                <tr>
                  <th className="text-left py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] border-r border-slate-100">Model Name</th>
                  <th className="text-left py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] border-r border-slate-100">Brand</th>
                  <th className="text-left py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] border-r border-slate-100">Category</th>
                  <th className="text-left py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] border-r border-slate-100">EHA Code</th>
                  <th className="text-left py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] border-r border-slate-100">HSN Code</th>
                  <th className="text-left py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] border-r border-slate-100">Price</th>
                  <th className="text-center py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] border-r border-slate-100">Min Stock</th>
                  <th className="text-center py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] border-r border-slate-100">Tracking</th>
                  <th className="text-right py-4 px-6 font-black text-slate-400 uppercase tracking-widest text-[9px] w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 opacity-30" />
                        <p className="text-[10px] uppercase font-black text-slate-300 tracking-widest">Synchronizing Encrypted Matrix...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                      Null results found. Check search parameters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, i) => (
                    <tr key={p.id} className={cn(
                      "group hover:bg-slate-50 transition-all cursor-default",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    )}>
                      <td className="py-4 px-6 font-bold text-slate-900 uppercase truncate max-w-[200px]">{p.model_name}</td>
                      <td className="py-4 px-6 font-black text-slate-500 uppercase tracking-tight">{p.brand}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tighter">{p.category}</span>
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-[11px] font-mono font-black text-[#001529] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase">{p.product_code || "---"}</code>
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-black">{p.hsn_code || "---"}</td>
                      <td className="py-4 px-6 font-black text-[#001529] text-[13px]">₹{p.base_price.toLocaleString("en-IN")}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-black text-slate-900 border border-slate-200 px-2 py-1 rounded bg-slate-50">{p.min_stock_level || 0}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          p.tracking_type === 'Stocked' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          p.tracking_type === 'On-Demand' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          {p.tracking_type}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-colors" />
                          }>
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 font-black text-[10px] uppercase tracking-widest text-[#001529] border-slate-200 shadow-2xl">
                            <DropdownMenuItem onClick={() => setEditingProduct(p)} className="gap-3 cursor-pointer py-2.5">
                              <Edit2 className="h-3.5 w-3.5 text-blue-500" /> Edit Metadata
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem onClick={() => handleArchive(p.id)} className="gap-3 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer py-2.5 font-black">
                              <Archive className="h-3.5 w-3.5" /> Decommission Asset
                            </DropdownMenuItem>
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
    </div>
  )
}
