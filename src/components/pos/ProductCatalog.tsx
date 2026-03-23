"use client"

import React, { useState, useRef } from 'react'
import { Search, Loader2, User, ArrowRight } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { usePos } from '@/context/PosContext'
import { ProductGrid } from './ProductGrid'

export function ProductCatalog() {
  const { 
    loading, 
    searchCustomers, 
    customerResults, 
    selectCustomer, 
    selectedCustomer 
  } = usePos()
  
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const customerSearchRef = useRef<HTMLInputElement>(null)

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
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-[10px] font-black tracking-widest uppercase">Syncing Inventory...</p>
          </div>
        ) : (
          <ProductGrid />
        )}
      </div>
    </section>
  )
}
