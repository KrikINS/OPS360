"use client"

import React, { useState, useRef, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Loader2, UserPlus, Phone, MapPin, ChevronDown, ChevronUp, AlertTriangle, Building2 } from "lucide-react"
import { usePos, Customer } from '@/context/PosContext'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
]

interface PosAddCustomerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPhone?: string
}

export function PosAddCustomerModal({ open, onOpenChange, initialPhone }: PosAddCustomerModalProps) {
  const { selectCustomer } = usePos()
  const [loading, setLoading] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showBusiness, setShowBusiness] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: initialPhone || '',
    address_line_1: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    company_name: ''
  })
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus name field on open
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Sync initialPhone if it changes while modal is open (or just when opened)
  React.useEffect(() => {
    if (initialPhone) {
      setFormData(prev => ({ ...prev, phone_number: initialPhone }))
    }
  }, [initialPhone])

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name || !formData.phone_number) {
      setErrorMsg("Name and Phone are mandatory")
      return
    }
    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
      setErrorMsg("Invalid GSTIN format")
      return
    }

    setLoading(true)
    
    let customer_type = 'walk_in'
    if (formData.gstin) {
      customer_type = 'business'
    } else if (formData.phone_number) {
      customer_type = 'registered'
    }

    const payload = {
      full_name: formData.full_name,
      phone_number: formData.phone_number,
      city: formData.city || undefined,
      state: formData.state || undefined,
      pincode: formData.pincode || undefined,
      address: formData.address_line_1 || undefined,
      gstin: formData.gstin || undefined,
      company_name: formData.company_name || undefined,
      customer_type: customer_type
    }

    const { data: resData, error } = await import("@/app/actions/generics").then(m => m.insertData("customers", [payload]))
    const data = resData && Array.isArray(resData) ? resData[0] : resData

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    if (data) {
      selectCustomer(data as Customer)
      onOpenChange(false)
      setFormData({
        full_name: '',
        phone_number: '',
        address_line_1: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        company_name: ''
      })
      setShowAddress(false)
      setShowBusiness(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] border-none shadow-2xl bg-white dark:bg-slate-900">
        <DialogHeader className="p-6 bg-blue-600 dark:bg-blue-700 text-white">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5" />
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight">Quick Register</DialogTitle>
              <DialogDescription className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">New POS Customer Profile</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 py-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-300 text-[10px] font-bold uppercase">
                {errorMsg}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Full Name</Label>
                <div className="relative group">
                  <Input 
                    ref={nameInputRef}
                    id="full_name" 
                    placeholder="Enter Customer Name" 
                    className="h-11 bg-slate-50 dark:bg-black border-slate-200 dark:border-white/5 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all pl-10"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                  <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                required
                placeholder="10-digit mobile"
                className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                value={formData.phone_number}
                onChange={e => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
              />
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setShowAddress(!showAddress)}
            className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors pt-1"
          >
            {showAddress ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showAddress ? "Hide Address Details" : "Add Address Details (Delivery)"}
          </button>

          {showAddress && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Floor, Building, Street"
                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                    value={formData.address_line_1}
                    onChange={e => setFormData(prev => ({ ...prev, address_line_1: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">City</Label>
                  <Input 
                    placeholder="City"
                    className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                    value={formData.city}
                    onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">State</Label>
                  <Select onValueChange={(v) => setFormData(prev => ({ ...prev, state: v || '' }))} value={formData.state}>
                    <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pincode</Label>
                <Input 
                  placeholder="Pincode"
                  className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                  value={formData.pincode}
                  onChange={e => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                />
              </div>
            </div>
          )}

          <button 
            type="button"
            onClick={() => setShowBusiness(!showBusiness)}
            className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors pt-1"
          >
            {showBusiness ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showBusiness ? "Hide Business Details" : "Add Business Details (B2B)"}
          </button>

          {showBusiness && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">GSTIN</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="22AAAAA0000A1Z5"
                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200 uppercase"
                    value={formData.gstin}
                    onChange={e => setFormData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
              {formData.gstin && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Company Name</Label>
                  <Input 
                    placeholder="Enter Company Name"
                    className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                    value={formData.company_name}
                    onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button 
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/10 rounded-xl" 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Register & Select Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
