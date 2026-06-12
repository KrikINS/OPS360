"use client"

import React, { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { 
  History, 
  Loader2, 
  RefreshCcw,
  ShoppingBag, 
  TrendingUp, 
  Users, 
  ArrowUpRight
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { usePos } from '@/context/PosContext'
import { SalesRegistryTable } from '@/components/sales/SalesRegistryTable'

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
  const [stats, setStats] = useState({
    totalSales: 0,
    invoiceCount: 0,
    avgTicket: 0
  })

  const fetchSales = useCallback(async () => {
    if (!selectedBranch) return
    setLoading(true)
    try {
      const res = await fetch(`/api/sales/registry?branchId=${selectedBranch}`)
      if (!res.ok) throw new Error("Failed to fetch sales history")
      const data = await res.json()
      setSales(data)
      
      const total = data.reduce((acc: number, s: Sale) => acc + Number(s.total_amount), 0)
      setStats({
        totalSales: total,
        invoiceCount: data.length,
        avgTicket: data.length > 0 ? total / data.length : 0
      })
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
        className="w-full sm:!w-[80vw] lg:!w-[75vw] sm:!max-w-none bg-white border-l shadow-2xl flex flex-col p-0 overflow-hidden"
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

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50/50">
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
              <Card className="border-none shadow-md bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden relative">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="relative z-10 space-y-1 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-indigo-100 text-[8px] sm:text-[10px] lg:text-xs font-black uppercase tracking-widest truncate">Total Revenue</p>
                    </div>
                    <h3 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tighter truncate">₹{stats.totalSales.toLocaleString()}</h3>
                    <div className="hidden sm:flex items-center gap-1 text-[8px] lg:text-[10px] bg-white/10 w-fit px-2 py-1 rounded-full border border-white/10 truncate mt-2">
                      <ArrowUpRight className="h-3 w-3" />
                      Live from active branch
                    </div>
                  </div>
                  <ShoppingBag className="absolute -right-4 -bottom-4 h-16 w-16 lg:h-24 lg:w-24 text-white/10 rotate-12" />
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-white overflow-hidden relative group hover:shadow-xl transition-all">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="relative z-10 space-y-1 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-[8px] sm:text-[10px] lg:text-xs font-black uppercase tracking-widest truncate">Invoice Volume</p>
                    </div>
                    <h3 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tighter text-slate-900 truncate">{stats.invoiceCount}</h3>
                    <p className="hidden sm:block text-[8px] lg:text-[10px] text-slate-500 font-medium truncate mt-2">Completed Transactions</p>
                  </div>
                  <TrendingUp className="absolute -right-4 -bottom-4 h-16 w-16 lg:h-24 lg:w-24 text-slate-50 group-hover:text-slate-100 transition-colors rotate-12" />
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-white overflow-hidden relative group hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="relative z-10 space-y-1 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-[8px] sm:text-[10px] lg:text-xs font-black uppercase tracking-widest truncate">Average Ticket</p>
                    </div>
                    <h3 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tighter text-slate-900 truncate">₹{Math.round(stats.avgTicket).toLocaleString()}</h3>
                    <p className="hidden sm:block text-[8px] lg:text-[10px] text-emerald-600 font-bold uppercase tracking-wider truncate mt-2">Per Sale Value</p>
                  </div>
                  <Users className="absolute -right-4 -bottom-4 h-16 w-16 lg:h-24 lg:w-24 text-slate-50 group-hover:text-slate-100 transition-colors rotate-12" />
                </CardContent>
              </Card>
            </div>

            {loading && sales.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Registry...</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <SalesRegistryTable sales={sales} onPrint={triggerInvoicePrint} />
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
