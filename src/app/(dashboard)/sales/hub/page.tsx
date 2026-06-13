"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { SalesRegistryTable } from '@/components/sales/SalesRegistryTable'
import { 
  ShoppingBag, 
  TrendingUp, 
  Users,
  Loader2,
  RefreshCcw
} from 'lucide-react'

import { exportToExcel } from "@/lib/export-utils"
import { useGlobalContext } from "@/context/GlobalContext"

interface Sale {
  sale_id: string;
  invoice_number?: string;
  created_at: string;
  total_amount: number;
  customer_id: string;
  customer_name: string;
  branch_name: string;
  items_sold?: {
    name: string;
    quantity: number;
    serial_number: string;
  }[];
  payment_method?: string;
  search_meta?: string;
}

export default function SalesRegistryPage() {
  const { activeBranch } = useGlobalContext()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSales: 0,
    invoiceCount: 0,
    avgTicket: 0
  })
  const [canExport, setCanExport] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchSales = useCallback(async () => {
    setLoading(true)
    
    try {
      const { data: { user } } = await import("@/app/actions/user").then(m => m.getUserAction())
      if (user) {
        const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))
        const { data: permissionsData } = await import("@/app/actions/user").then(m => m.getUserPermissionsAction(user.id))
        const permissions = permissionsData && Array.isArray(permissionsData) ? permissionsData.filter(p => p.module === 'accounting' && p.enabled === true) : []
        
        const isAdmin = profile?.role?.toLowerCase().trim() === 'admin/owner' || profile?.role?.toLowerCase().trim() === 'finance'
        const hasAccounting = permissions && permissions.length > 0
        setCanExport(isAdmin || hasAccounting)
      }

      const url = activeBranch?.id ? `/api/sales/registry?branchId=${activeBranch.id}` : '/api/sales/registry'
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch sales")
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
  }, [activeBranch?.id])

  const handleExport = async () => {
    
    setExporting(true)
    try {
      const { data, error } = await (Promise.resolve({ data: [] }) as unknown as Promise<{ data: unknown[], error: Error | null }>)
      if (error) throw error
      if (data) {
        exportToExcel(data as Record<string, unknown>[], 'Sales')
      }
    } catch (err) {
      console.error("Export failed", err)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  return (
    <div className="p-8 pb-0 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Sales Registry</h1>
          <p className="text-slate-500 font-medium">Comprehensive audit trail of all showroom transactions.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchSales}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border shadow-sm font-bold text-sm text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <div className="relative overflow-hidden group bg-[#001529] border border-transparent rounded-xl p-5 hover:border-[#7FD1E3]/30 transition-all duration-500 shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingBag className="w-16 h-16 text-[#7FD1E3] -mt-2 -mr-2" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 truncate">Total Revenue</p>
              {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 rounded bg-[#7FD1E3]/10 text-[#7FD1E3] border border-[#7FD1E3]/20">Consolidated</span>}
            </div>
            <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-white group-hover:text-[#7FD1E3] transition-colors">
              ₹{stats.totalSales.toLocaleString()}
            </h3>
            <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-tight truncate">
              {activeBranch?.id === "ALL_000" ? "Live from all branches" : "Live from active branch"}
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </div>

        <div className="relative overflow-hidden group bg-[#001529] border border-transparent rounded-xl p-5 hover:border-[#7FD1E3]/30 transition-all duration-500 shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-[#7FD1E3] -mt-2 -mr-2" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 truncate">Invoice Volume</p>
              {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 rounded bg-[#7FD1E3]/10 text-[#7FD1E3] border border-[#7FD1E3]/20">Consolidated</span>}
            </div>
            <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-white group-hover:text-[#7FD1E3] transition-colors">
              {stats.invoiceCount}
            </h3>
            <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-tight truncate">
              Completed Transactions
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </div>

        <div className="relative overflow-hidden group bg-[#001529] border border-transparent rounded-xl p-5 hover:border-[#7FD1E3]/30 transition-all duration-500 shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-[#7FD1E3] -mt-2 -mr-2" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 truncate">Average Ticket</p>
              {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 rounded bg-[#7FD1E3]/10 text-[#7FD1E3] border border-[#7FD1E3]/20">Consolidated</span>}
            </div>
            <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-white group-hover:text-[#7FD1E3] transition-colors">
              ₹{Math.round(stats.avgTicket).toLocaleString()}
            </h3>
            <p className="text-[9px] font-bold text-[#7FD1E3] mt-1 uppercase tracking-tight truncate">
              Per Sale Value
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-slate-500 font-bold animate-pulse">Syncing Sales Registry...</p>
        </div>
      ) : (
        <SalesRegistryTable 
          sales={sales} 
          onExport={handleExport} 
          canExport={canExport} 
          exporting={exporting}
          onRefresh={fetchSales}
        />
      )}
    </div>
  )
}
