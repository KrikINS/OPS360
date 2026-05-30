"use client"

import React, { useState, useRef } from 'react'
import { Search, Loader2, ArrowRight, Phone, CheckCircle2, UserPlus, X, User } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { usePos, Customer } from '@/context/PosContext'
import { ProductGrid } from './ProductGrid'

import { PosAddCustomerModal } from './PosAddCustomerModal'

export function ProductCatalog() {
  
  const { 
    loading, 
    searchCustomers, 
    customerResults, 
    selectCustomer, 
    selectedCustomer,
    customerSearchQuery,
    setCustomerSearchQuery,
    phoneQuery,
    setPhoneQuery,
    resetCustomerContext,
    selectWalkInCustomer
  } = usePos()
  
  const customerSearchRef = useRef<HTMLInputElement>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Auto-verify phone as user types
  const handlePhoneChange = async (val: string) => {
    setPhoneQuery(val)
    if (val.length >= 10) {
      setVerifying(true)
      const { data, error } = await import("@/app/actions/generics").then(m => m.fetchData("customers"))
      if (!error && data && data.length > 0) {
        selectCustomer(data[0] as Customer)
      }
      setVerifying(false)
    }
  }

  return (
    <section className="flex-1 flex flex-col border-r border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-white/5 space-y-4">
        {/* Customer Quick-Entry Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              ref={customerSearchRef}
              id="pos-customer-search"
              placeholder="Search Customer (Name/Email)" 
              className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-xl shadow-sm focus:ring-blue-500/20 dark:text-slate-200"
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value)
                searchCustomers(e.target.value)
              }}
            />
            {customerResults.length > 0 && (
              <div className="absolute top-12 left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[60] max-h-60 overflow-y-auto">
                {customerResults.map(c => (
                  <button
                    key={c.id}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-50 dark:border-white/5 flex justify-between items-center transition-colors"
                    onClick={() => {
                      selectCustomer(c)
                      setCustomerSearchQuery("")
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.full_name}</span>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{c.phone_number}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl min-w-[300px] shadow-sm">
             <div className="relative flex-1 group">
               <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
               <Input 
                 placeholder="Verify Phone..." 
                 className="h-9 pl-9 border-none bg-transparent text-xs font-bold focus-visible:ring-0 placeholder:text-slate-300 dark:text-slate-200"
                 value={phoneQuery}
                 onChange={(e) => handlePhoneChange(e.target.value)}
                 maxLength={13}
               />
             </div>

              {selectedCustomer && selectedCustomer.phone_number !== '0000000000' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Returning Customer</span>
                      <CheckCircle2 className="h-2.5 w-2.5 text-blue-500" />
                    </div>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-300 truncate max-w-[120px]">{selectedCustomer.full_name}</span>
                  </div>
                  <Button 
                     variant="ghost" 
                     size="icon" 
                     onClick={(e) => {
                       e.stopPropagation()
                       resetCustomerContext()
                     }}
                     className="h-7 w-7 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-400 hover:text-blue-600 transition-all active:scale-90"
                   >
                     <X className="h-4 w-4" />
                   </Button>
                </div>
              ) : selectedCustomer && selectedCustomer.phone_number === '0000000000' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Session</span>
                      <User className="h-2.5 w-2.5 text-slate-400" />
                    </div>
                    <span className="text-xs font-black text-slate-600 dark:text-slate-400">Walk-in Customer</span>
                  </div>
                  <Button 
                     variant="ghost" 
                     size="icon" 
                     onClick={(e) => {
                       e.stopPropagation()
                       resetCustomerContext()
                     }}
                     className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition-all active:scale-90"
                   >
                     <X className="h-4 w-4" />
                   </Button>
                </div>
              ) : phoneQuery.length >= 10 && !verifying ? (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost"
                    onClick={() => selectWalkInCustomer()}
                    className="h-9 px-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-[9px] font-black uppercase tracking-widest rounded-lg"
                  >
                    Walk-in
                  </Button>
                  <Button 
                   onClick={() => setModalOpen(true)}
                   className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-emerald-500/10"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-2" />
                    + Add New
                  </Button>
                </div>
             ) : verifying ? (
               <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-4" />
             ) : null}
          </div>
        </div>
      </div>

      <PosAddCustomerModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        initialPhone={phoneQuery} 
      />

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300 dark:text-slate-700">
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
