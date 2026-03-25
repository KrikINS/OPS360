"use client"

import React, { useState, useMemo } from 'react'
import { Search, Tag, Barcode, Plus, ShoppingCart, Info } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { usePos, Product } from '@/context/PosContext'
import { cn } from "@/lib/utils"

export function ProductGrid() {
  const { products, loading, addToCart } = usePos()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return products
    return products.filter(p => 
      p.model_name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.product_code.toLowerCase().includes(query)
    )
  }, [products, searchQuery])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Inventory Sync Active...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors duration-300">
      {/* Product Search Bar */}
      <div className="sticky top-0 z-10 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 flex gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input 
            id="pos-product-search"
            placeholder="Search Model, Brand or Code..." 
            className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl ring-offset-0 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all text-sm font-medium dark:text-slate-200 dark:placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5">
          <Tag className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{filteredProducts.length} Items</span>
        </div>
      </div>

      {/* Grid Display */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-700 py-12">
            <Search className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No products found for &quot;{searchQuery}&quot;</p>
            <p className="text-[10px] uppercase tracking-wider mt-1 opacity-60">Check criteria or sync inventory</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product, onAdd }: { product: Product, onAdd: () => void }) {
  const isOutOfStock = product.available_quantity <= 0
  const taxRatePercent = Math.round(product.gst_rate)

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 border-none shadow-sm hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-slate-800 ring-1 ring-slate-100 dark:ring-white/5",
      isOutOfStock && "opacity-75 grayscale-[0.5]"
    )}>
      {/* Visual Header */}
      <div className="p-4 pb-0 flex justify-between items-start">
        <Badge 
          variant="outline" 
          className={cn(
            "text-[9px] font-black tracking-widest border-none transition-colors",
            isOutOfStock 
              ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400" 
              : product.available_quantity < 5 
                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          )}
        >
          {isOutOfStock ? "OUT OF STOCK" : `${product.available_quantity} UNITS LEFT`}
        </Badge>
        
        <div className="p-1 px-2 border border-slate-100 dark:border-white/5 rounded-md bg-slate-50 dark:bg-slate-900 flex items-center gap-1">
          <Info className="h-3 w-3 text-slate-400 dark:text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{taxRatePercent}% GST</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pt-4 flex flex-col h-full">
        <div className="mb-2">
          <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest block mb-0.5">{product.brand}</span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 min-h-[2.5rem]">
            {product.model_name}
          </h3>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
            <Barcode className="h-3 w-3" />
            <span className="text-[10px] font-mono font-bold tracking-tight">{product.product_code}</span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Price Per Unit</span>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
              ₹{product.base_price.toLocaleString('en-IN')}
            </span>
          </div>

          <Button 
            onClick={onAdd}
            disabled={isOutOfStock}
            size="sm"
            className={cn(
              "h-10 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/10",
              isOutOfStock 
                ? "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-none cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white"
            )}
          >
            {isOutOfStock ? (
              <ShoppingCart className="h-4 w-4 opacity-50" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Selection Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  )
}
