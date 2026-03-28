"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { SalesRegistryTable } from '@/components/sales/SalesRegistryTable'
import { 
  ShoppingBag, 
  TrendingUp, 
  Users, 
  ArrowUpRight,
  Loader2,
  RefreshCcw
} from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
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
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        const { data: permissions } = await supabase.from('user_permissions').select('*').eq('user_id', user.id).eq('module', 'accounting').eq('enabled', true)
        
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
    const supabase = createClient()
    setExporting(true)
    try {
      const { data, error } = await supabase.rpc('get_export_data', { p_type: 'sales_registry' })
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-indigo-100 text-xs font-black uppercase tracking-widest">Total Revenue</p>
                {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-2 rounded-full bg-white/20 text-white border border-white/10">Consolidated</span>}
              </div>
              <h3 className="text-4xl font-black tracking-tighter">₹{stats.totalSales.toLocaleString()}</h3>
              <div className="flex items-center gap-1 text-[10px] bg-white/10 w-fit px-2 py-1 rounded-full border border-white/10">
                <ArrowUpRight className="h-3 w-3" />
                {activeBranch?.id === "ALL_000" ? "Live from all branches" : "Live from active branch"}
              </div>
            </div>
            <ShoppingBag className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 rotate-12" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white overflow-hidden relative group hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Invoice Volume</p>
                {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Consolidated</span>}
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-slate-900">{stats.invoiceCount}</h3>
              <p className="text-[10px] text-slate-500 font-medium">Completed Transactions</p>
            </div>
            <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 text-slate-50 group-hover:text-slate-100 transition-colors rotate-12" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white overflow-hidden relative group hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
          <CardContent className="p-6">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Average Ticket</p>
                {activeBranch?.id === "ALL_000" && <span className="text-[8px] font-bold uppercase py-0.5 px-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Consolidated</span>}
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-slate-900">₹{Math.round(stats.avgTicket).toLocaleString()}</h3>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Per Sale Value</p>
            </div>
            <Users className="absolute -right-4 -bottom-4 h-32 w-32 text-slate-50 group-hover:text-slate-100 transition-colors rotate-12" />
          </CardContent>
        </Card>
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
        />
      )}
    </div>
  )
}
