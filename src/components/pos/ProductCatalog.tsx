"use client"

import React, { useState, useRef } from 'react'
import { Search, Loader2, UserPlus, X, User, Phone, Mail, Building2, FileText, Sparkles } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { usePos, Customer } from '@/context/PosContext'
import { ProductGrid } from './ProductGrid'
import { PosAddCustomerModal } from './PosAddCustomerModal'

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ProductCatalog() {
  const {
    loading,
    searchCustomers,
    customerResults,
    selectCustomer,
    selectedCustomer,
    customerSearchQuery,
    setCustomerSearchQuery,
    resetCustomerContext,
    selectWalkInCustomer,
    searchingCustomer,
    loyaltyBalance
  } = usePos()

  const customerSearchRef = useRef<HTMLInputElement>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitialPhone, setModalInitialPhone] = useState('')

  const isWalkIn = selectedCustomer && selectedCustomer.phone_number === '0000000000'
  const isRealCustomer = selectedCustomer && selectedCustomer.phone_number !== '0000000000'
  const isBusiness = selectedCustomer?.customer_type === 'business'

  const handleSearchChange = (val: string) => {
    setCustomerSearchQuery(val)
    searchCustomers(val)
  }

  return (
    <section className="flex-1 flex flex-col border-r border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-white/5">

        {/* No customer selected → unified search */}
        {!selectedCustomer && (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={customerSearchRef}
                id="pos-customer-search"
                placeholder="Search customer by name, phone, or email"
                className="pl-11 pr-32 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-xl shadow-sm focus:ring-blue-500/20 dark:text-slate-200 text-sm"
                value={customerSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {searchingCustomer && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                <span className="hidden sm:inline text-[9px] font-medium text-slate-400 uppercase tracking-wide bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                  Name · Phone · Email
                </span>
              </div>
            </div>

            {/* Live results */}
            {customerResults.length > 0 && (
              <div className="absolute top-14 left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[60] max-h-72 overflow-y-auto custom-scrollbar">
                {customerResults.map(c => {
                  const business = c.customer_type === 'business'
                  return (
                    <button
                      key={c.id}
                      className="w-full px-3.5 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-50 dark:border-white/5 last:border-0 flex items-center gap-3 transition-colors"
                      onClick={() => {
                        selectCustomer(c)
                        setCustomerSearchQuery("")
                      }}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        business
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                      }`}>
                        {getInitials(business ? (c.company_name || c.full_name) : c.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{c.full_name}</span>
                          {business && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 text-[8px] font-bold uppercase rounded tracking-wide shrink-0">Business</span>
                          )}
                          {c.customer_type === 'registered' && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 text-[8px] font-bold uppercase rounded tracking-wide shrink-0">Registered</span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate block">
                          {business ? `${c.gstin || 'No GSTIN'} · ${c.company_name || 'No company'}` : c.phone_number}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* No match → add */}
            {customerSearchQuery.length >= 2 &&
             customerResults.length === 0 &&
             !searchingCustomer && (
              <div className="absolute top-14 left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[60] p-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  No customer found for "{customerSearchQuery}"
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectWalkInCustomer()}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wide rounded-lg"
                  >
                    Walk-in
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setModalInitialPhone(/^\+?[\d\s-]+$/.test(customerSearchQuery) ? customerSearchQuery : '')
                      setModalOpen(true)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs rounded-lg"
                  >
                    <UserPlus className="h-3 w-3" />
                    Add customer
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real customer selected → card */}
        {isRealCustomer && (
          <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-4 animate-in fade-in slide-in-from-top-1 duration-200 ${
            isBusiness ? 'border-l-[3px] border-l-blue-500 dark:border-l-blue-400' : ''
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                isBusiness
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
              }`}>
                {getInitials(isBusiness ? (selectedCustomer.company_name || selectedCustomer.full_name) : selectedCustomer.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-slate-900 dark:text-white truncate">{selectedCustomer.full_name}</span>
                  {isBusiness ? (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 text-[8px] font-bold uppercase rounded tracking-wide shrink-0">Business</span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 text-[8px] font-bold uppercase rounded tracking-wide shrink-0">Returning</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  {isBusiness ? (
                    <>
                      {selectedCustomer.company_name && (
                        <span className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {selectedCustomer.company_name}
                        </span>
                      )}
                      {selectedCustomer.gstin && (
                        <span className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 font-mono">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          {selectedCustomer.gstin}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {selectedCustomer.phone_number}
                      </span>
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {selectedCustomer.email}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); resetCustomerContext() }}
                className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-all active:scale-90 shrink-0"
                title="Clear customer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!isBusiness && loyaltyBalance > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Loyalty</span>
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                  {loyaltyBalance.toLocaleString('en-IN')} pts available = ₹{loyaltyBalance.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Walk-in selected → neutral card */}
        {isWalkIn && (
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-slate-600 dark:text-slate-300">Walk-in customer</div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Guest session</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); resetCustomerContext() }}
              className="h-8 w-8 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-all active:scale-90 shrink-0"
              title="Clear customer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <PosAddCustomerModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setModalInitialPhone('')
        }}
        initialPhone={modalInitialPhone}
      />

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300 dark:text-slate-700">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-[10px] font-bold tracking-widest uppercase">Syncing inventory...</p>
          </div>
        ) : (
          <ProductGrid />
        )}
      </div>
    </section>
  )
}
