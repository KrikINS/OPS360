"use client"

import React, { useState, useRef } from 'react'
import { Search, Badge as BadgeIcon, Barcode, Tag, Plus, Loader2, User, ArrowRight } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { usePos } from './PosContext'
import { cn } from "@/lib/utils"

export function ProductCatalog() {
  const { products, loading, addToCart, searchCustomers, customerResults, searchingCustomer, selectCustomer, selectedCustomer } = usePos()
  const [searchQuery, setSearchQuery] = useState("")
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  
  const productSearchRef = useRef<HTMLInputElement>(null)
  const customerSearchRef = useRef<HTMLInputElement>(null)

  const filteredProducts = products.filter(p => 
    p.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <section className="flex-1 flex flex-col border-r border-slate-200 bg-white overflow-hidden">
      <div className="p-4 bg-slate-50/50 border-b space-y-4">
        {/* Customer Search Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              ref={customerSearchRef}
              id="pos-customer-search"
              placeholder="Search Customer (Alt+N)" 
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm"
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value)
                searchCustomers(e.target.value)
              }}
            />
            {customerResults.length > 0 && (
              <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] max-h-60 overflow-y-auto">
                {customerResults.map(c => (
                  <button
                    key={c.id}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 flex justify-between items-center"
                    onClick={() => {
                      selectCustomer(c)
                      setCustomerSearchQuery("")
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{c.name}</span>
                      <span className="text-[10px] font-medium text-slate-500">{c.phone}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center px-4 bg-blue-50 border border-blue-100 rounded-xl min-w-[200px]">
             <User className="h-4 w-4 text-blue-500 mr-2" />
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-blue-400 uppercase leading-none">Customer</span>
               <span className="text-xs font-bold text-blue-700 truncate max-w-[150px]">{selectedCustomer?.name || 'Walk-in'}</span>
             </div>
          </div>
        </div>

        {/* Product Search Row */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            ref={productSearchRef}
            id="pos-product-search"
            placeholder="Search Model or Scan (Alt+S)" 
            className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-[10px] font-black tracking-widest uppercase">Syncing Inventory...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="group relative flex flex-col p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-blue-500 hover:shadow-xl transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <Tag className="h-4 w-4" />
                  </div>
                  <Badge variant="secondary" className={cn(
                    "text-[9px] font-bold px-2 py-0.5 border-none",
                    product.available_stock < 5 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {product.available_stock} IN STOCK
                  </Badge>
                </div>
                
                <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight h-8 mb-1">{product.model_name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                  <Barcode className="h-3 w-3" />
                  {product.product_code}
                </p>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm font-black text-slate-900 tracking-tight">₹{product.base_price.toLocaleString('en-IN')}</span>
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Plus className="h-4 w-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
