"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { CustomerRegistryTable } from "@/components/admin/CustomerRegistryTable"
import { AddCustomerModal } from "@/components/admin/AddCustomerModal"
import { CustomerHistoryDrawer } from "@/components/admin/CustomerHistoryDrawer"
import { LoyaltyRegistryTable } from '@/components/admin/LoyaltyRegistryTable'
import { LoyaltyAdjustModal } from '@/components/admin/LoyaltyAdjustModal'
import { Users, Loader2, Star, UserSquare, X } from "lucide-react"
import { Customer } from "@/context/PosContext"
import { updateCustomerCredit } from '@/actions/finance'

interface AdminCustomer extends Customer {
  created_at: string
  loyalty_balance?: number
}

export default function CustomerManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "registry"

  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<Customer | undefined>()
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [customerForHistory, setCustomerForHistory] = useState<Customer | null>(null)
  const [customerToAdjust, setCustomerToAdjust] = useState<Customer | null>(null)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  
  const [creditCustomer, setCreditCustomer]   = useState<AdminCustomer | null>(null)
  const [creditForm, setCreditForm]           = useState({ eligible: false, limit: '', terms: '30 days' })
  const [savingCredit, setSavingCredit]       = useState(false)
  const [creditToast, setCreditToast]         = useState<string | null>(null)

  const handleSaveCredit = async () => {
    if (!creditCustomer) return
    setSavingCredit(true)
    const result = await updateCustomerCredit({
      customerId:         creditCustomer.id,
      isCreditEligible:   creditForm.eligible,
      creditLimit:        parseFloat(creditForm.limit) || 0,
      creditPaymentTerms: creditForm.terms,
    })
    setSavingCredit(false)
    if (result.success) {
      setCreditToast('Credit settings saved')
      setCreditCustomer(null)
      fetchCustomers()
    } else {
      setCreditToast(result.error ?? 'Failed')
    }
    setTimeout(() => setCreditToast(null), 3000)
  }

  const fetchCustomers = useCallback(async () => {
    const { getCustomersWithLoyaltyAction } = await import("@/app/actions/customers")
    const { data, error } = await getCustomersWithLoyaltyAction()

    if (!error && data && Array.isArray(data)) {
      const { mapToCustomer } = await import("@/utils/data-mappers")
      const mappedCustomers = data.map(mapToCustomer) as AdminCustomer[]
      mappedCustomers.sort((a, b) => (a.full_name as string || "").localeCompare(b.full_name as string || ""))
      setCustomers(mappedCustomers)
    }
  }, [])

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
            <h1 className="text-3xl font-black tracking-tight text-[#001529] uppercase">Customer Management</h1>
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

      <Tabs value={activeTab} onValueChange={(v) => router.push(`/sales/customers?tab=${v}`)} className="w-full space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-2">
          <TabsTrigger 
            value="registry"
            className="data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:shadow-md rounded-t-lg rounded-b-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider gap-2"
          >
            <UserSquare className="h-4 w-4" />
            Customer Registry
          </TabsTrigger>
          <TabsTrigger 
            value="loyalty"
            className="data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:shadow-md rounded-t-lg rounded-b-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider gap-2"
          >
            <Star className="h-4 w-4" />
            Loyalty Points
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="mt-0 outline-none space-y-4">
          {loading ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Synchronizing Customer Data...</p>
            </div>
          ) : (
            <CustomerRegistryTable 
              customers={customers} 
              onAddClick={() => {
                setCustomerToEdit(undefined)
                setModalOpen(true)
              }} 
              onEditClick={(customer) => {
                setCustomerToEdit(customer)
                setModalOpen(true)
              }}
              onHistoryClick={(customer) => {
                setCustomerForHistory(customer)
                setHistoryDrawerOpen(true)
              }}
              onCreditClick={(customer) => {
                setCreditCustomer(customer as AdminCustomer)
                setCreditForm({
                  eligible: (customer as any).is_credit_eligible ?? false,
                  limit:    String((customer as any).credit_limit ?? ''),
                  terms:    (customer as any).credit_payment_terms ?? '30 days',
                })
              }}
            />
          )}

          <AddCustomerModal 
            open={modalOpen} 
            onOpenChange={(open) => {
              setModalOpen(open)
              if (!open) setTimeout(() => setCustomerToEdit(undefined), 200)
            }} 
            onSuccess={fetchCustomers}
            customer={customerToEdit}
          />

          <CustomerHistoryDrawer
            open={historyDrawerOpen}
            onClose={() => {
              setHistoryDrawerOpen(false)
              setTimeout(() => setCustomerForHistory(null), 200)
            }}
            customerId={customerForHistory?.id || null}
            customerName={customerForHistory?.full_name || null}
          />
        </TabsContent>

        <TabsContent value="loyalty" className="mt-0 outline-none">
          <LoyaltyRegistryTable 
            customers={customers} 
            onAdjustClick={(c) => { 
              setCustomerToAdjust(c); 
              setAdjustModalOpen(true); 
            }} 
          />
          {customerToAdjust && (
            <LoyaltyAdjustModal
              open={adjustModalOpen}
              onOpenChange={setAdjustModalOpen}
              customer={customerToAdjust}
              onSuccess={fetchCustomers}
            />
          )}
        </TabsContent>
      </Tabs>

      {creditCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCreditCustomer(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Credit Settings</h2>
                <p className="text-sm text-slate-500">{creditCustomer.full_name}</p>
              </div>
              <button onClick={() => setCreditCustomer(null)} className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            {creditToast && <div className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold">{creditToast}</div>}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="eligible" checked={creditForm.eligible}
                onChange={e => setCreditForm(f => ({ ...f, eligible: e.target.checked }))} className="h-4 w-4 rounded" />
              <label htmlFor="eligible" className="text-sm font-semibold cursor-pointer">Enable Credit Sales for this customer</label>
            </div>
            {creditForm.eligible && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Credit Limit (₹)</label>
                  <Input type="number" min={0} placeholder="e.g. 50000" value={creditForm.limit}
                    onChange={e => setCreditForm(f => ({ ...f, limit: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment Terms</label>
                  <select value={creditForm.terms} onChange={e => setCreditForm(f => ({ ...f, terms: e.target.value }))}
                    className="w-full h-9 border rounded-lg px-3 text-sm bg-white">
                    <option value="15 days">15 days</option>
                    <option value="30 days">30 days</option>
                    <option value="45 days">45 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                  </select>
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreditCustomer(null)}>Cancel</Button>
              <Button className="flex-1 bg-[#001529] hover:bg-[#002545] text-white"
                onClick={handleSaveCredit} disabled={savingCredit}>
                {savingCredit ? 'Saving...' : 'Save Credit Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
