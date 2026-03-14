"use client"

import { useState, useEffect } from "react"
import { 
  Plus, 
  Search, 
  Package, 
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Archive
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AddProductModal } from "@/components/products/add-product-modal"

interface Product {
  id: string
  product_code: string
  model_name: string
  brand: string
  category: string
  hsn_code: string
  base_price: number
  min_stock_level: number
}

export default function ProductMasterPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/products")
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      console.error("Failed to load products", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const filteredProducts = products.filter(p => 
    p.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Archive className="h-8 w-8 text-primary" />
            Product Master
          </h1>
          <p className="text-muted-foreground mt-1">Manage your standardized product catalog and coding.</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#001529] hover:bg-[#002a52] text-white gap-2 shadow-lg"
        >
          <Plus className="h-4 w-4" /> Add New Product
        </Button>
      </div>

      <Card className="shadow-sm border-none bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">Standardized Catalog</CardTitle>
              <CardDescription>All products follow the EHA coding standard.</CardDescription>
            </div>
            <div className="relative w-full md:w-72 mt-2 md:mt-0">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <Input 
                 placeholder="Search by Code, Name, or Brand..." 
                 className="pl-10 h-10 border-slate-200 bg-white"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
          ) : (
            <div className="rounded-md border border-slate-100 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700 w-40">EHA Code</TableHead>
                    <TableHead className="font-semibold text-slate-700">Brand</TableHead>
                    <TableHead className="font-semibold text-slate-700">Item Name & Spec</TableHead>
                    <TableHead className="font-semibold text-slate-700">Category</TableHead>
                    <TableHead className="font-semibold text-slate-700">HSN</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700 whitespace-nowrap">Base Price</TableHead>
                    <TableHead className="text-center font-semibold text-slate-700">Min Stock</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-400 font-medium">
                        No products found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => (
                      <TableRow key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell>
                          <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200 py-1">
                            {p.product_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-600 truncate max-w-[100px]">{p.brand}</TableCell>
                        <TableCell className="font-bold text-slate-900">{p.model_name}</TableCell>
                        <TableCell className="text-slate-500">{p.category}</TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-400">{p.hsn_code}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-800 tabular-nums">
                          ₹{p.base_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-slate-600 font-medium px-2 py-0.5 bg-slate-100 rounded text-xs">
                             {p.min_stock_level}
                          </span>
                        </TableCell>
                        <TableCell>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                             <MoreVertical className="h-4 w-4" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddProductModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen}
        onSuccess={fetchProducts}
      />
    </div>
  )
}
