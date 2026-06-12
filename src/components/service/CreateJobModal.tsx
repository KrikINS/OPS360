"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, User, Package, Wrench, Loader2, CheckCircle2 } from "lucide-react"
import { useService } from "@/context/ServiceContext"
import { useSession } from "next-auth/react"
import { checkWarranty } from '@/actions/service'


interface Customer {
  id: string
  full_name: string
  phone_number: string
}

interface Product {
  id: string
  model_name: string
  brand: string
}

interface CreateJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateJobModal({ open, onOpenChange }: CreateJobModalProps) {
  const { technicians, createJob } = useService()
  

  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [productSearch, setProductSearch] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [serialNumber, setSerialNumber]     = useState('')
  const [warrantyInfo, setWarrantyInfo]     = useState<Awaited<ReturnType<typeof checkWarranty>> | null>(null)
  const [checkingWarranty, setCheckingWarranty] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium')
  const [technicianId, setTechnicianId] = useState<string>("")

  const { data: session } = useSession()

  // Search Customers
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (customerSearch.length > 1) {
        try {
          const mod = await import("@/app/actions/service")
          const result = await mod.searchPosCustomersAction(customerSearch)
          if (result.data) setCustomers(result.data as unknown as Customer[])
        } catch { setCustomers([]) }
      } else {
        setCustomers([])
      }
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [customerSearch])

  // Search Products
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (productSearch.length > 1) {
        try {
          const mod = await import("@/app/actions/service")
          const result = await mod.searchProductsAction(productSearch)
          if (result.data) setProducts(result.data as unknown as Product[])
        } catch { setProducts([]) }
      } else {
        setProducts([])
      }
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [productSearch])

  const handleSubmit = async () => {
    if (!selectedCustomer || !title || !technicianId) {
       alert("Please fill required fields (Customer, Title, Technician)")
       return
    }

    setLoading(true)
    try {
      const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(session?.user?.id || ''))

      await createJob({
        customerId: selectedCustomer.id,
        productId: selectedProduct?.id || undefined,
        technicianId: technicianId || undefined,
        title,
        description,
        priority,
        serial_number: serialNumber.trim() || undefined,
        invoice_id: (warrantyInfo?.success && warrantyInfo.found) ? (warrantyInfo.invoiceId ?? undefined) : undefined,
        warranty_status: (warrantyInfo?.success && warrantyInfo.found) ? warrantyInfo.warrantyStatus : 'unknown',
      })
      onOpenChange(false)
      // Reset form
      setSelectedCustomer(null)
      setSelectedProduct(null)
      setSerialNumber('')
      setWarrantyInfo(null)
      setTitle("")
      setDescription("")
      setTechnicianId("")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl">
        <DialogHeader className="p-6 bg-[#001529] text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg ring-4 ring-blue-500/10">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">New Job Card</DialogTitle>
              <DialogDescription className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Initiate Repair or Installation Ticket</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Customer Selection *</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{selectedCustomer.full_name}</p>
                    <p className="text-xs text-emerald-600 font-medium">{selectedCustomer.phone_number}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="text-emerald-700 hover:bg-emerald-100">Change</Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search by name or phone..." 
                  className="pl-10 h-11 bg-slate-50 border-slate-100 rounded-xl text-sm"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden">
                    {customers.map(c => (
                      <button 
                        key={c.id} 
                        className="w-full p-3 text-left hover:bg-slate-50 flex flex-col gap-0.5"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <span className="font-bold text-sm text-slate-800">{c.full_name}</span>
                        <span className="text-xs text-slate-500">{c.phone_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product/Unit Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-slate-400/80">Unit Details (Optional)</label>
            {selectedProduct ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{selectedProduct.model_name}</p>
                    <p className="text-xs text-blue-600 font-medium">{selectedProduct.brand}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)} className="text-blue-700 hover:bg-blue-100">Clear</Button>
              </div>
            ) : (
              <div className="relative">
                <Package className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search model name..." 
                  className="pl-10 h-11 bg-slate-50 border-slate-100 rounded-xl text-sm"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {products.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden">
                    {products.map(p => (
                      <button 
                        key={p.id} 
                        className="w-full p-3 text-left hover:bg-slate-50 flex flex-col gap-0.5 border-b last:border-0"
                        onClick={() => setSelectedProduct(p)}
                      >
                        <span className="font-bold text-sm text-slate-800">{p.model_name}</span>
                        <span className="text-xs text-slate-500">{p.brand}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Serial Number
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter serial number..."
                value={serialNumber}
                onChange={e => { setSerialNumber(e.target.value); setWarrantyInfo(null) }}
                className="flex-1 h-10 rounded-xl border-slate-200"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 px-4 rounded-xl"
                disabled={!serialNumber.trim() || checkingWarranty}
                onClick={async () => {
                  setCheckingWarranty(true)
                  const result = await checkWarranty(serialNumber.trim())
                  setWarrantyInfo(result)
                  setCheckingWarranty(false)
                  // Auto-fill product if found
                  if (result.success && result.found && result.productId && result.productName) {
                    setSelectedProduct({ id: result.productId, model_name: result.productName, brand: result.productBrand ?? '' })
                  }
                }}
              >
                {checkingWarranty ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
              </Button>
            </div>

            {/* Warranty status banner */}
            {warrantyInfo && warrantyInfo.success && warrantyInfo.found && (
              <div className={`rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                warrantyInfo.warrantyStatus === 'in_warranty'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : warrantyInfo.warrantyStatus === 'out_of_warranty'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className="text-base">
                  {warrantyInfo.warrantyStatus === 'in_warranty' ? '✅' : warrantyInfo.warrantyStatus === 'out_of_warranty' ? '❌' : '⚠️'}
                </span>
                <div>
                  <div>
                    {warrantyInfo.warrantyStatus === 'in_warranty' && `IN WARRANTY — expires ${warrantyInfo.warrantyExpiresAt}`}
                    {warrantyInfo.warrantyStatus === 'out_of_warranty' && `WARRANTY EXPIRED — ${warrantyInfo.warrantyExpiresAt}`}
                    {warrantyInfo.warrantyStatus === 'unknown' && 'No warranty record found'}
                  </div>
                  {warrantyInfo.productName && (
                    <div className="font-normal opacity-80">{warrantyInfo.productBrand} {warrantyInfo.productName}</div>
                  )}
                  {warrantyInfo.customerName && (
                    <div className="font-normal opacity-80">Owner: {warrantyInfo.customerName}</div>
                  )}
                </div>
              </div>
            )}
            {warrantyInfo && warrantyInfo.success && !warrantyInfo.found && (
              <div className="rounded-lg px-3 py-2 text-xs bg-slate-50 text-slate-500 border border-slate-200">
                ⚠️ Serial number not found in inventory
              </div>
            )}
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Job Title / Issue Heading *</label>
              <Input 
                placeholder="e.g. AC Gas Leak, Installation..." 
                className="h-11 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Detailed Description</label>
              <Textarea 
                placeholder="Provide specific details about the issue or task..." 
                className="min-h-[100px] bg-slate-50 border-slate-100 rounded-xl text-sm resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Priority</label>
               <Select value={priority} onValueChange={(val) => setPriority(val as 'Low' | 'Medium' | 'High' | 'Urgent')}>
                 <SelectTrigger className="h-11 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Low">Low</SelectItem>
                   <SelectItem value="Medium">Medium</SelectItem>
                   <SelectItem value="High">High</SelectItem>
                   <SelectItem value="Urgent">Urgent</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lead Technician *</label>
               <Select value={technicianId} onValueChange={(val) => setTechnicianId(val || "")}>
                 <SelectTrigger className="h-11 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold">
                   <SelectValue placeholder="Assign Tech" />
                 </SelectTrigger>
                 <SelectContent>
                   {technicians.map(t => (
                     <SelectItem key={t.id} value={t.id}>{t.full_name || 'Unnamed Tech'}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
           <div className="flex gap-3 w-full">
             <Button variant="ghost" className="flex-1 h-12 text-xs font-bold uppercase tracking-widest text-slate-500" onClick={() => onOpenChange(false)}>Cancel</Button>
             <Button 
               className="flex-1 h-12 bg-[#001529] hover:bg-black text-white text-xs font-bold uppercase tracking-widest shadow-xl"
               onClick={handleSubmit}
               disabled={loading}
             >
               {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
               Finalize Job Card
             </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
