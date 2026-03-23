"use client"

import React from 'react'
import { Printer, CheckCircle2, User, Phone, AlertCircle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePos } from '@/context/PosContext'

export function CheckoutModal({ open, onOpenChange }: { open: boolean, onOpenChange: (val: boolean) => void }) {
  const { totals, selectedCustomer, executeCheckout, loading } = usePos()

  const handleCheckout = async () => {
    await executeCheckout()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 bg-[#001529] text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg ring-4 ring-blue-500/10"><Printer className="h-5 w-5" /></div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Final Settlement</DialogTitle>
              <DialogDescription className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Verify Details & Seal Invoice</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Customer</label>
               <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                 <Input readOnly className="pl-10 h-10 bg-slate-50 border-slate-100 rounded-lg text-xs font-bold" value={selectedCustomer?.name || 'Walk-in'} />
               </div>
             </div>
             <div className="space-y-1.5">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Phone</label>
               <div className="relative">
                 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                 <Input readOnly className="pl-10 h-10 bg-slate-50 border-slate-100 rounded-lg text-xs font-bold" value={selectedCustomer?.phone || '0000000000'} />
               </div>
             </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3 font-bold text-[11px]">
             <div className="flex justify-between text-slate-500 font-medium lowercase"><span>Taxable amount</span><span>₹{Math.round(totals.subtotal).toLocaleString()}</span></div>
             <div className="flex justify-between text-slate-400 font-medium lowercase"><span>CGST ({totals.totalGst > 0 ? "Split" : "0%"})</span><span>₹{Math.round(totals.cgst).toLocaleString()}</span></div>
             <div className="flex justify-between text-slate-400 font-medium lowercase"><span>SGST ({totals.totalGst > 0 ? "Split" : "0%"})</span><span>₹{Math.round(totals.sgst).toLocaleString()}</span></div>
             <div className="h-px bg-slate-200" />
             <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Payable</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter font-mono">₹{Math.round(totals.grandTotal).toLocaleString()}</span>
             </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-[9px] font-bold text-amber-700 leading-tight uppercase">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Confirming physical serial number verification & GST accuracy before printing.</span>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0">
          <div className="flex gap-3 w-full">
            <Button variant="ghost" className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest text-slate-400" onClick={() => onOpenChange(false)}>Abort</Button>
            <Button className="flex-1 h-12 bg-[#001529] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest" onClick={handleCheckout} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Seal Invoice
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
