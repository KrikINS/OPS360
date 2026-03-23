import React, { useState, useMemo, useEffect } from 'react'
import { Printer, CheckCircle2, Loader2, Banknote, CreditCard, Smartphone, Building2, Check, RotateCcw, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { usePos } from '@/context/PosContext'

type CheckoutStatus = 'idle' | 'loading' | 'success' | 'error'

export function CheckoutModal({ open, onOpenChange }: { open: boolean, onOpenChange: (val: boolean) => void }) {
  const { totals, executeCheckout } = usePos()
  const [status, setStatus] = useState<CheckoutStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>("cash")
  const [receivedAmount, setReceivedAmount] = useState<string>("")

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStatus('idle')
        setErrorMsg(null)
        setInvoiceId(null)
        setReceivedAmount("")
      }, 300)
    }
  }, [open])

  const changeDue = useMemo(() => {
    const received = parseFloat(receivedAmount) || 0
    return Math.max(0, received - totals.grandTotal)
  }, [receivedAmount, totals.grandTotal])

  const handleCheckout = async () => {
    setStatus('loading')
    setErrorMsg(null)
    
    const result = await executeCheckout()
    
    if (result.success) {
      setInvoiceId(result.invoiceId!)
      setStatus('success')
      // Trigger print after success screen is visible
      setTimeout(() => window.print(), 1000)
    } else {
      setErrorMsg(result.error || "Transaction failed")
      setStatus('error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl transition-all duration-500 ${status === 'success' ? 'bg-emerald-600' : 'bg-white'}`}>
        
        {status !== 'success' ? (
          <>
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
              {status === 'error' && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 animate-in slide-in-from-top-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-xs font-bold leading-tight uppercase">
                    {errorMsg}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Method</label>
                   <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                     <SelectTrigger className="h-10 bg-slate-50 border-slate-100 rounded-lg text-xs font-bold">
                       <div className="flex items-center gap-2">
                         {paymentMethod === 'cash' && <Banknote className="h-3.5 w-3.5 text-emerald-500" />}
                         {paymentMethod === 'card' && <CreditCard className="h-3.5 w-3.5 text-blue-500" />}
                         {paymentMethod === 'upi' && <Smartphone className="h-3.5 w-3.5 text-orange-500" />}
                         {paymentMethod === 'transfer' && <Building2 className="h-3.5 w-3.5 text-slate-500" />}
                         <SelectValue />
                       </div>
                     </SelectTrigger>
                     <SelectContent className="bg-white border-slate-200">
                       <SelectItem value="cash" className="text-xs font-bold">Cash Payment</SelectItem>
                       <SelectItem value="card" className="text-xs font-bold">Credit/Debit Card</SelectItem>
                       <SelectItem value="upi" className="text-xs font-bold">UPI / QR Scan</SelectItem>
                       <SelectItem value="transfer" className="text-xs font-bold">Bank Transfer</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Received Amount (₹)</label>
                   <Input 
                    type="number"
                    placeholder="0.00"
                    className="h-10 bg-slate-50 border-slate-100 rounded-lg text-xs font-bold tabular-nums"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    disabled={paymentMethod !== 'cash'}
                   />
                 </div>
              </div>

              {paymentMethod === 'cash' && parseFloat(receivedAmount) > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center animate-in zoom-in-95 duration-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Change Due</span>
                  <span className="text-2xl font-black text-emerald-700 tracking-tighter">₹{Math.round(changeDue).toLocaleString()}</span>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3 font-bold text-[11px]">
                 <div className="flex justify-between text-slate-500 font-medium lowercase"><span>Taxable amount</span><span>₹{Math.round(totals.subtotal).toLocaleString()}</span></div>
                 <div className="flex justify-between text-slate-400 font-medium lowercase"><span>Total GST</span><span>₹{Math.round(totals.totalGst).toLocaleString()}</span></div>
                 <div className="h-px bg-slate-200" />
                 <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Grand Total</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter font-mono">₹{Math.round(totals.grandTotal).toLocaleString()}</span>
                 </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0">
              <div className="flex gap-3 w-full">
                <Button variant="ghost" className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest text-slate-400" onClick={() => onOpenChange(false)} disabled={status === 'loading'}>Abort</Button>
                <Button 
                  className="flex-1 h-12 bg-[#001529] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/10" 
                  onClick={handleCheckout} 
                  disabled={status === 'loading' || (paymentMethod === 'cash' && changeDue < 0 && parseFloat(receivedAmount) > 0)}
                >
                  {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Seal Invoice
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
            <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center ring-8 ring-white/10 mb-8 animate-bounce">
              <Check className="h-12 w-12 text-white stroke-[4px]" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Sale Confirmed</h2>
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Transaction Seal: {invoiceId?.slice(0, 16).toUpperCase()}</p>
            
            <div className="bg-black/10 rounded-2xl p-6 w-full mb-8 border border-white/10">
              <span className="text-white/60 text-[9px] font-black uppercase tracking-widest block mb-4">Invoice Generated</span>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Printer className="h-4 w-4 text-emerald-200" />
                <span className="text-white text-lg font-mono font-black">{invoiceId?.slice(0, 12).toUpperCase()}</span>
              </div>
              <span className="text-emerald-200 text-[8px] font-bold uppercase">Physical Copy Preparing...</span>
            </div>

            <Button 
              className="w-full h-14 bg-white text-emerald-700 hover:bg-emerald-50 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl shadow-2xl"
              onClick={() => onOpenChange(false)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              New Sale / Next Counter
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
