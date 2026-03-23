"use client"

import React, { useState } from 'react'
import { CheckCircle2, XCircle, ShoppingCart } from 'lucide-react'
import { PosProvider, usePos } from '@/context/PosContext'
import { PosHeader } from '@/components/pos/PosHeader'
import { ProductCatalog } from '@/components/pos/ProductCatalog'
import { CartSidebar } from '@/components/pos/CartSidebar'
import { CheckoutModal } from '@/components/pos/CheckoutModal'
import { TerminalLockOverlay } from '@/components/pos/TerminalLockOverlay'
import { usePosHotkeys } from '@/hooks/usePosHotkeys'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function POSContent() {
  const { toast, cart, clearCart } = usePos()
  const [showCheckout, setShowCheckout] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // Hotkeys Configuration
  usePosHotkeys([
    { key: 's', alt: true, action: () => document.getElementById('pos-product-search')?.focus() },
    { key: 'n', alt: true, action: () => document.getElementById('pos-customer-search')?.focus() },
    { key: 'Enter', alt: true, action: () => cart.length > 0 && setShowCheckout(true) },
    { key: 'c', alt: true, action: () => clearCart() },
    { key: 'Escape', action: () => {
      setShowCheckout(false)
      setMobileCartOpen(false)
    }}
  ])

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden relative">
      <TerminalLockOverlay />
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-[100] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border-l-4 animate-in slide-in-from-right-8 duration-300",
          toast.type === 'success' ? "bg-white border-emerald-500" : "bg-white border-rose-500"
        )}>
          <div className={cn("p-2 rounded-full", toast.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">{toast.message}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Protocol Active</span>
          </div>
        </div>
      )}

      <PosHeader />

      <main className="flex-1 flex overflow-hidden relative">
        <ProductCatalog />
        
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-[400px]">
          <CartSidebar onCheckout={() => setShowCheckout(true)} />
        </div>

        {/* Mobile Cart Overlay */}
        <div className={cn(
          "fixed inset-0 z-50 lg:hidden transition-transform duration-300",
          mobileCartOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileCartOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[90%] max-w-sm bg-white shadow-2xl">
            <CartSidebar onCheckout={() => {
              setShowCheckout(true)
              setMobileCartOpen(false)
            }} />
          </div>
        </div>
      </main>

      {/* Mobile Cart Toggle Button */}
      <Button 
        variant="default"
        className="fixed bottom-6 right-6 lg:hidden h-14 w-14 rounded-full shadow-2xl bg-blue-600 text-white z-40 p-0"
        onClick={() => setMobileCartOpen(true)}
      >
        <div className="relative">
          <ShoppingCart className="h-6 w-6" />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              {cart.length}
            </span>
          )}
        </div>
      </Button>

      <CheckoutModal open={showCheckout} onOpenChange={setShowCheckout} />
    </div>
  )
}

export default function RetailFastPOS() {
  return (
    <PosProvider>
      <POSContent />
    </PosProvider>
  )
}
