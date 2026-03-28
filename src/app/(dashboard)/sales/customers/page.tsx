"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from "@/utils/supabase/client"
import { CustomerRegistryTable } from "@/components/admin/CustomerRegistryTable"
import { AddCustomerModal } from "@/components/admin/AddCustomerModal"
import { Users, Loader2 } from "lucide-react"
import { Customer } from "@/context/PosContext"

interface AdminCustomer extends Customer {
  created_at: string
}

export default function CustomerRegistryPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  const supabase = createClient()

  const fetchCustomers = useCallback(async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('full_name', { ascending: true })

    if (!error && data) {
      setCustomers(data as AdminCustomer[])
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    async function init() {
      setLoading(true)
      await fetchCustomers()
      if (mounted) setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, [fetchCustomers])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#001529] uppercase">Customer Registry</h1>
          </div>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Centralized Buyer Database & Engagement Hub</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{customers.length} Verified Profiles</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Synchronizing Customer Data...</p>
        </div>
      ) : (
        <CustomerRegistryTable 
          customers={customers} 
          onAddClick={() => setModalOpen(true)} 
        />
      )}

      <AddCustomerModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        onSuccess={fetchCustomers}
      />
    </div>
  )
}
