"use client"
// v1.0.3 - Universal Dark Mode Implementation
import React, { useState, useMemo, useEffect } from 'react'
import { Printer, CheckCircle2, Loader2, Banknote, CreditCard, Smartphone, Building2, Check, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "../ui/alert"
import { usePos, type InvoiceData } from '@/context/PosContext'
import { useReactToPrint } from 'react-to-print'
import { InvoiceTemplate } from '@/components/pos/InvoiceTemplate'
import { fmtINR } from '@/lib/utils'

type CheckoutStatus = 'idle' | 'loading' | 'success' | 'error'

export function CheckoutModal({ open, onOpenChange }: { open: boolean, onOpenChange: (val: boolean) => void }) {
  const { totals, executeCheckout, cart } = usePos()
  const [status, setStatus] = useState<CheckoutStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [invoiceNumberDisplay, setInvoiceNumberDisplay] = useState<string | null>(null)
  const [receivedAmount, setReceivedAmount] = useState<string>("")
  const [isPrinting, setIsPrinting] = useState(false)
  const [printStatus, setPrintStatus] = useState("")
  const [isTemplateReady, setIsTemplateReady] = useState(false)
  const componentRef = React.useRef<HTMLDivElement>(null)
  const shouldManualPrintRef = React.useRef(false)
  const [paymentMethod, setPaymentMethod] = useState<string | null>("cash")

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    onAfterPrint: () => {
      setIsPrinting(false)
      setPrintStatus('')
    }
  })

  const handleTemplateReady = React.useCallback(() => {
    setIsTemplateReady(true)
    if (shouldManualPrintRef.current) {
      shouldManualPrintRef.current = false
      handlePrint()
      setIsPrinting(false)
      setPrintStatus('')
    }
  }, [handlePrint])

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStatus('idle')
        setErrorMsg(null)
        setInvoiceId(null)
        setInvoiceNumberDisplay(null)
        setIsTemplateReady(false)
        setReceivedAmount("")
        setPrintStatus("")
        shouldManualPrintRef.current = false
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
    
    const result = await executeCheckout(paymentMethod || 'cash')
    
    if (result.success && result.invoiceData) {
      setInvoiceId(result.invoiceData.id)
      setInvoiceNumberDisplay(result.invoiceData.invoice_number)
      setStatus('success')
    }
 else {
      setErrorMsg(result.error || "Transaction failed")
      setStatus('error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`md:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl transition-all duration-500 ${status === 'success' ? 'bg-emerald-600' : 'bg-white dark:bg-slate-900'}`}>
        
        {status !== 'success' ? (
          <>
            <DialogHeader className="p-6 bg-[#001529] dark:bg-black text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-xl shadow-lg ring-4 ring-blue-500/10"><Printer className="h-5 w-5" /></div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight">Final Settlement</DialogTitle>
                  <DialogDescription className="text-blue-200 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest">Verify Details & Seal Invoice</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {status === 'error' && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 animate-in slide-in-from-top-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-800 dark:text-red-300 text-xs font-bold leading-tight uppercase">
                    {errorMsg}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Payment Method</label>
                   <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                     <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-lg text-xs font-bold dark:text-slate-200">
                       <div className="flex items-center gap-2">
                         {paymentMethod === 'cash' && <Banknote className="h-3.5 w-3.5 text-emerald-500" />}
                         {paymentMethod === 'card' && <CreditCard className="h-3.5 w-3.5 text-blue-500" />}
                         {paymentMethod === 'upi' && <Smartphone className="h-3.5 w-3.5 text-orange-500" />}
                         {paymentMethod === 'transfer' && <Building2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />}
                         <SelectValue />
                       </div>
                     </SelectTrigger>
                     <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10">
                       <SelectItem value="cash" className="text-xs font-bold dark:text-slate-200">Cash Payment</SelectItem>
                       <SelectItem value="card" className="text-xs font-bold dark:text-slate-200">Credit/Debit Card</SelectItem>
                       <SelectItem value="upi" className="text-xs font-bold dark:text-slate-200">UPI / QR Scan</SelectItem>
                       <SelectItem value="transfer" className="text-xs font-bold dark:text-slate-200">Bank Transfer</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Received Amount (₹)</label>
                   <Input 
                    type="number"
                    placeholder="0.00"
                    className="h-10 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 rounded-lg text-xs font-bold tabular-nums dark:text-slate-200"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    disabled={paymentMethod !== 'cash'}
                   />
                 </div>
              </div>

              {paymentMethod === 'cash' && parseFloat(receivedAmount) > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-4 flex justify-between items-center animate-in zoom-in-95 duration-200">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Change Due</span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tracking-tighter">{fmtINR(Math.round(changeDue))}</span>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/5 p-4 space-y-3 font-bold text-[11px]">
                 <div className="space-y-2">
                   <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                     <span>Subtotal</span>
                     <span>{fmtINR(Math.round(totals.subtotal))}</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] uppercase font-bold text-rose-500 tracking-widest">
                     <span>Discount</span>
                     <span>-{fmtINR(totals.discount)}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs uppercase font-black text-slate-700 dark:text-slate-200 tracking-widest pt-2 border-t border-slate-100 dark:border-white/5">
                     <span>Taxable Value</span>
                     <span>{fmtINR(Math.round(totals.taxableValue))}</span>
                   </div>
                   
                   {/* Dynamic Tax Slabs with Kerala GST 50/50 Split */}
                   {Object.entries(
                     cart.reduce((acc, item) => {
                       const rate = item.gst_rate;
                       if (!acc[rate]) acc[rate] = 0;
                       acc[rate] += (item.base_price * item.qty * rate) / 100;
                       return acc;
                     }, {} as Record<number, number>)
                   ).map(([rate, tax]) => (
                     <div key={rate} className="py-2 border-y border-slate-100/50 dark:border-white/5 first:border-t-0 last:border-b-0 animate-in fade-in slide-in-from-left-2 duration-300">
                       <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                         <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest">TOTAL GST ({rate}%)</span>
                         <span className="text-slate-700 dark:text-slate-200 font-extrabold text-[10px]">{fmtINR(Math.round(tax as number))}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 opacity-80 pt-1 border-t border-slate-100 dark:border-white/5">
                         <div className="flex justify-between items-center text-[9px] uppercase tracking-widest px-1">
                           <span className="font-bold text-slate-400 dark:text-slate-500">CGST (Central)</span>
                           <span className="font-bold text-slate-500 dark:text-slate-400">{fmtINR(Math.round(tax as number) / 2)}</span>
                         </div>
                         <div className="flex justify-between items-center text-[9px] uppercase tracking-widest px-1">
                           <span className="font-bold text-slate-400 dark:text-slate-500">SGST (State/UT)</span>
                           <span className="font-bold text-slate-500 dark:text-slate-400">{fmtINR(Math.round(tax as number) / 2)}</span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>

                 <div className="h-px bg-slate-200 dark:bg-white/5" />
                 
                 <div className="pt-1.5 space-y-1">
                   <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                     <span>SGST (Kerala)</span>
                     <span>{fmtINR(Math.round(totals.sgst))}</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                     <span>CGST (Central)</span>
                     <span>{fmtINR(Math.round(totals.cgst))}</span>
                   </div>
                 </div>

                  <div className="flex justify-between items-end">
                    <span className="text-xs uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">Grand Total</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter font-mono">{fmtINR(Math.round(totals.grandTotal))}</span>
                  </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <div className="flex gap-3 w-full">
                <Button variant="ghost" className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 dark:hover:bg-white/5" onClick={() => onOpenChange(false)} disabled={status === 'loading'}>Abort</Button>
                <Button 
                  className="flex-1 h-12 bg-[#001529] dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/10" 
                  onClick={handleCheckout} 
                  disabled={status === 'loading' || (paymentMethod === 'cash' && (!receivedAmount || parseFloat(receivedAmount) < totals.grandTotal))}
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
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Transaction Seal: {status === 'success' && invoiceNumberDisplay ? invoiceNumberDisplay : invoiceId?.slice(0, 16).toUpperCase()}</p>
            
            <div className="bg-black/10 rounded-2xl p-6 w-full mb-8 border border-white/10">
              <span className="text-white/60 text-[9px] font-black uppercase tracking-widest block mb-4">Invoice Generated</span>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Printer className="h-4 w-4 text-emerald-200" />
                <span className="text-white text-lg font-mono font-black">{invoiceNumberDisplay || invoiceId?.slice(0, 12).toUpperCase()}</span>
              </div>
              <span className="text-emerald-200 text-[8px] font-bold uppercase">{printStatus || 'Invoice Ready'}</span>
            </div>

            <div className="flex gap-3 w-full mb-4">
              <Button 
                variant="outline"
                className="flex-1 h-14 bg-white/10 border-white/20 text-white hover:bg-white/20 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl"
                onClick={() => {
                  setIsPrinting(true)
                  setPrintStatus('Preparing document...')
                  
                  if (isTemplateReady) {
                    handlePrint()
                  } else {
                    shouldManualPrintRef.current = true
                    // fallback: if onReady doesn't fire within 2s, print anyway
                    setTimeout(() => {
                      if (shouldManualPrintRef.current) {
                        shouldManualPrintRef.current = false
                        handlePrint()
                        setIsPrinting(false)
                        setPrintStatus('')
                      }
                    }, 2000)
                  }
                }}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                {isPrinting ? "Processing..." : "Print Invoice"}
              </Button>
              <Button 
                className="flex-1 h-14 bg-white text-emerald-700 hover:bg-emerald-50 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl shadow-2xl"
                onClick={() => onOpenChange(false)}
              >
                Next Sale
              </Button>
            </div>
            
            {/* Off-screen template for reliable printing */}
            <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none z-[-100]">
              <InvoiceTemplate 
                ref={componentRef} 
                invoiceId={invoiceId || undefined} 
                onReady={handleTemplateReady}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
