"use client"

import React, { useState, useEffect, useRef } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { 
  History, 
  Receipt, 
  Printer, 
  Loader2, 
  Calendar,
  CreditCard,
  ShoppingBag
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { InvoiceTemplate } from '@/components/pos/InvoiceTemplate'
import { useReactToPrint } from 'react-to-print'

interface CustomerHistoryDrawerProps {
  open: boolean
  onClose: () => void
  customerId: string | null
  customerName: string | null
}

interface HistoricalInvoice {
  id: string
  invoice_number: string
  created_at: string
  total_amount: number
  item_count: number
}

interface HistoricalInvoiceResponse {
  id: string
  invoice_number: string
  created_at: string
  total_amount: number
  items: { count: number }[]
}

export function CustomerHistoryDrawer({ 
  open, 
  onClose, 
  customerId, 
  customerName 
}: CustomerHistoryDrawerProps) {
  const [invoices, setInvoices] = useState<HistoricalInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [printId, setPrintId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  })

  const fetchHistory = React.useCallback(async () => {
    if (!customerId) return
    
    // Fetch summary of invoices for this customer
    const { data, error } = await supabase
      .from('sales_invoices')
      .select(`
        id,
        invoice_number,
        created_at,
        total_amount,
        items:invoice_items(count)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const typedData = data as unknown as HistoricalInvoiceResponse[]
      setInvoices(typedData.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        created_at: inv.created_at,
        total_amount: Number(inv.total_amount),
        item_count: inv.items[0]?.count || 0
      })))
    }
  }, [customerId, supabase])

  useEffect(() => {
    let mounted = true
    async function init() {
      if (open && customerId) {
        setLoading(true)
        await fetchHistory()
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [open, customerId, fetchHistory])

  const triggerPrint = (id: string) => {
    setPrintingId(id)
    setPrintId(id)
  }

  const totalSpent = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[540px] w-full p-0 flex flex-col">
        <SheetHeader className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <SheetTitle className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                Purchase History
              </SheetTitle>
              <SheetDescription className="text-[10px] font-black uppercase tracking-widest text-[#001529]/60">
                Customer: {customerName}
              </SheetDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <ShoppingBag className="h-3 w-3" />
                Total Visited
              </div>
              <div className="text-xl font-black text-slate-900">{invoices.length} Invoices</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <CreditCard className="h-3 w-3" />
                Total Revenue
              </div>
              <div className="text-xl font-black text-blue-600">₹{totalSpent.toLocaleString()}</div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-8 pt-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Scanning Archive...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-300">
              <Receipt className="h-16 w-16 opacity-20" />
              <p className="text-sm font-bold opacity-50">No purchase records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((inv) => (
                <div 
                  key={inv.id}
                  className="group relative bg-white rounded-2xl border border-slate-100 p-5 hover:border-blue-200 hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-blue-600">
                          {inv.invoice_number}
                        </span>
                        <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-tighter">
                          Paid
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(inv.created_at).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="h-3 w-3" />
                          {inv.item_count} Items
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900">
                        ₹{inv.total_amount.toLocaleString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={printingId === inv.id}
                        className="h-8 rounded-lg mt-1 h-7 text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all shadow-none px-3"
                        onClick={() => triggerPrint(inv.id)}
                      >
                        {printingId === inv.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        ) : (
                          <Printer className="h-3 w-3 mr-1.5" />
                        )}
                        Print
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden Print Anchor */}
        <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none z-[-100]">
          {printId && (
            <InvoiceTemplate 
              ref={printRef} 
              invoiceId={printId} 
              onReady={() => {
                handlePrint()
                setTimeout(() => {
                  setPrintId(null)
                  setPrintingId(null)
                }, 1000)
              }} 
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
