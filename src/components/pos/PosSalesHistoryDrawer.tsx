"use client"

import React, { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { History, Loader2, RefreshCcw } from "lucide-react"
import { usePos } from '@/context/PosContext'
import { SalesRegistryTable } from '@/components/admin/SalesRegistryTable'

interface PosSalesHistoryDrawerProps {
  open: boolean
  onClose: () => void
}

interface Sale {
  sale_id: string;
  created_at: string;
  total_amount: number;
  customer_id: string;
  customer_name: string;
  branch_id: string;
  branch_name: string;
  staff_id: string;
  staff_name: string;
  net_amount: number;
  tax_amount: number;
  invoice_number?: string;
}

export function PosSalesHistoryDrawer({ open, onClose }: PosSalesHistoryDrawerProps) {
  const { selectedBranch, currentBranchDetails, triggerInvoicePrint } = usePos()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSales = useCallback(async () => {
    if (!selectedBranch) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sales?branchId=${selectedBranch}`)
      if (!res.ok) throw new Error("Failed to fetch sales history")
      const data = await res.json()
      setSales(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    if (open && selectedBranch) {
      fetchSales()
    }
  }, [open, selectedBranch, fetchSales])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:!w-[80vw] lg:!w-[50vw] sm:!max-w-none bg-white border-l shadow-2xl flex flex-col p-0 overflow-hidden"
      >
        <SheetHeader className="p-8 border-b bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-2xl font-black flex items-center gap-3 text-slate-900">
                <History className="h-6 w-6 text-primary" />
                Sales Register
              </SheetTitle>
              <SheetDescription className="font-medium text-slate-500">
                Audit trail for {currentBranchDetails?.name || 'Current Branch'}
              </SheetDescription>
            </div>
            <button 
              onClick={fetchSales}
              disabled={loading}
              title="Refresh Sales History"
              className="p-2 rounded-xl border bg-white shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-slate-500"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-white">
          {loading && sales.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Registry...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SalesRegistryTable sales={sales} onPrint={triggerInvoicePrint} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
