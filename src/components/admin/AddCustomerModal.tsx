"use client"

import React, { useState } from 'react'
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

import { Loader2, UserPlus, Phone, Mail, MapPin, AlertTriangle, Edit } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Customer } from "@/context/PosContext"

interface AddCustomerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  customer?: Customer
}

export function AddCustomerModal({ open, onOpenChange, onSuccess, customer }: AddCustomerModalProps) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: customer?.full_name || '',
    phone_number: customer?.phone_number || '',
    email: customer?.email || '',
    address_line_1: '',
    address_line_2: '',
    city: customer?.city || '',
    pincode: ''
  })

  React.useEffect(() => {
    if (open) {
      setFormData({
        full_name: customer?.full_name || '',
        phone_number: customer?.phone_number || '',
        email: customer?.email || '',
        address_line_1: '', // Assuming these aren't returned currently, or modify mapper to return them
        address_line_2: '',
        city: customer?.city || '',
        pincode: ''
      })
      setErrorMsg(null)
    }
  }, [open, customer])

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name || !formData.phone_number) {
      setErrorMsg("Name and Phone Number are required")
      return
    }

    setLoading(true)
    let error;
    if (customer?.id) {
      const res = await import("@/app/actions/customers").then(m => m.updateCustomerAction(customer.id, formData))
      error = res.error
    } else {
      const res = await import("@/app/actions/customers").then(m => m.createCustomerAction(formData))
      error = res.error
    }

    setLoading(false)

    if (error) {
      if (error.code === '23505') {
        setErrorMsg("Customer with this phone number already exists")
      } else {
        setErrorMsg(error.message)
      }
      return
    }

    // Success - close and reset (maybe show success indicator later)
    setFormData({
      full_name: '',
      phone_number: '',
      email: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      pincode: ''
    })
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900">
        <DialogHeader className="p-6 bg-[#001529] dark:bg-black text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-xl shadow-lg ring-4 ring-blue-500/10">
              {customer ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                {customer ? "Update Customer" : "Onboard New Customer"}
              </DialogTitle>
              <DialogDescription className="text-blue-200 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                {customer ? "Modify existing buyer profile" : "Create permanent buyer profile"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 py-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-300 text-[10px] font-bold uppercase leading-tight">
                {errorMsg}
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Full Name *</Label>
              <Input 
                required
                placeholder="John Doe"
                className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                value={formData.full_name}
                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  required
                  placeholder="9876543210"
                  className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                  value={formData.phone_number}
                  onChange={e => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  type="email"
                  placeholder="john@example.com"
                  className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Address Line 1</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Street address, P.O. box, etc."
                  className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                  value={formData.address_line_1}
                  onChange={e => setFormData(prev => ({ ...prev, address_line_1: e.target.value }))}
                />
              </div>
            </div>

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
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pincode</Label>
              <Input 
                placeholder="600001"
                className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200"
                value={formData.pincode}
                onChange={e => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <div className="flex gap-3 w-full">
              <Button 
                type="button" 
                variant="ghost" 
                className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/10" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (customer ? <Edit className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />)}
                {customer ? "Update Customer" : "Add Customer"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
