"use client"
// v1.0.3 - RPC & Header API Definitive Fix
import React, { forwardRef, useEffect, useState, useContext } from 'react'
import { PosContext } from '@/context/PosContext'
import { cn } from '@/lib/utils'
import type { Branch, Customer, InvoiceData, CartItem } from '@/context/PosContext'
import { numberToWords } from '@/utils/numberToWords'

interface InvoiceTemplateProps {
  invoiceId?: string
  initialData?: InvoiceData | null
  onReady?: () => void
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ invoiceId, initialData, onReady }, ref) => {
  const posContext = useContext(PosContext)
  
  // Local state for archival/re-print mode
  const [archivalData, setArchivalData] = useState<{
    cart: { model_name: string; hsn_code: string; qty: number; base_price: number; gst_rate: number; gst_amount: number; serial_number?: string }[]
    totals: { subtotal: number; totalGst: number; cgst: number; sgst: number; grandTotal: number }
    branch: Branch | null
    customer: Customer | null
    invoiceNumber: string
    date: string
    paymentMethod?: string
  } | null>(null)
  const [loading, setLoading] = useState(!!invoiceId)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (initialData && Array.isArray(initialData.items) && initialData.items.length > 0) {
      setArchivalData({
        cart: initialData.items.map((item) => ({
          model_name: item.model_name || 'Unknown Product',
          hsn_code: item.hsn_code || '8415',
          qty: item.quantity,
          base_price: Number(item.unit_price),
          gst_rate: Number(item.gst_rate || 18),
          gst_amount: Number(item.gst_amount),
          serial_number: item.serial_number
        })),
        totals: {
          subtotal: Number(initialData.net_amount),
          totalGst: Number(initialData.tax_amount),
          cgst: Number(initialData.tax_amount) / 2,
          sgst: Number(initialData.tax_amount) / 2,
          grandTotal: Number(initialData.total_amount)
        },
        branch: initialData.branch || null,
        customer: initialData.customer || { id: 'walk-in', full_name: 'Walk-in Customer', phone_number: '' },
        invoiceNumber: initialData.invoice_number,
        date: new Date(initialData.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        paymentMethod: initialData.payment_method
      })
      setLoading(false)
      setIsReady(true)
    } else if (invoiceId && typeof invoiceId === 'string' && invoiceId !== 'undefined') {
      const fetchData = async () => {
        setArchivalData(null) // Reset for new ID
        setLoading(true)
        try {
          // 1. Fetch Items via Registry API (bypasses RLS issues)
          const itemsRes = await fetch(`/api/sales/registry/${invoiceId}/items`)
          if (!itemsRes.ok) throw new Error("Failed to fetch invoice items")
          const items = await itemsRes.json()

          // 2. We still need the header, branch, and customer.
          // Since the sales registry table already has this data, we could pass it in,
          // but for standalone re-print, let's fetch the header.
          // 2. Fetch Invoice Header via our new secure admin API
          const headerRes = await fetch(`/api/sales/registry/${invoiceId}`)
          if (!headerRes.ok) throw new Error("Failed to fetch invoice header")
          const invoice = await headerRes.json()

          const branch = invoice.branches
          const customer = invoice.customers

          const mappedCart = items.map((item: { name?: string; model_name?: string; hsn_code: string; qty?: number; quantity?: number; unit_price: number; gst_rate: number }) => ({
             model_name: item.name || item.model_name || 'Unknown Product',
             hsn_code: item.hsn_code || '8415',
             qty: Number(item.qty || item.quantity) || 0,
             base_price: Number(item.unit_price) || 0,
             gst_rate: Number(item.gst_rate) || 0,
             gst_amount: (Number(item.unit_price) || 0) * (Number(item.qty || item.quantity) || 0) * ((Number(item.gst_rate) || 0) / 100),
             serial_number: (item as any).serial_number
          }))

          setArchivalData({
            cart: mappedCart,
            totals: {
              subtotal: Number(invoice.subtotal) || 0,
              totalGst: (Number(invoice.cgst) || 0) + (Number(invoice.sgst) || 0) + (Number(invoice.igst) || 0),
              cgst: Number(invoice.cgst) || 0,
              sgst: Number(invoice.sgst) || 0,
              grandTotal: Number(invoice.total_amount) || 0
            },
            branch: branch,
            customer: customer || { full_name: 'Walk-in Customer', phone_number: '' },
            invoiceNumber: invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase(),
            date: new Date(invoice.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }),
            paymentMethod: invoice.payment_method
          })
        } catch (err) {
          console.error("Failed to fetch archival invoice:", err)
        } finally {
          setLoading(false)
          setIsReady(true)
        }
      }
      fetchData()
    } else {
      // If no invoiceId, we're printing from current context
      setIsReady(true)
    }
  }, [invoiceId, initialData])

  // Trigger onReady only after isReady is true
  useEffect(() => {
    if (isReady && !loading) {
      const timer = setTimeout(() => onReady?.(), 200)
      return () => clearTimeout(timer)
    }
  }, [isReady, loading, initialData?.id, onReady])

  // Use either context or archival data
  const cart = (invoiceId ? archivalData?.cart : posContext?.cart) || []
  const totals = (invoiceId ? archivalData?.totals : posContext?.totals) || { subtotal: 0, totalGst: 0, cgst: 0, sgst: 0, grandTotal: 0 }
  const branch = invoiceId ? archivalData?.branch : posContext?.currentBranchDetails
  const customer = invoiceId ? archivalData?.customer : posContext?.selectedCustomer
  const invoiceNo = invoiceId ? archivalData?.invoiceNumber : posContext?.invoiceNumber
  const displayDate = invoiceId ? archivalData?.date : posContext?.currentDate
  const paymentMethodRaw = invoiceId ? archivalData?.paymentMethod : posContext?.cart?.length ? 'cash' : undefined // Fallback for context is handled by initialData if available
  
  // Mapping for readable payment method
  const getPaymentMethodDisplay = (method?: string) => {
    switch(method) {
      case 'cash': return 'Cash'
      case 'card': return 'Credit/Debit Card'
      case 'upi': return 'UPI / QR Scan'
      case 'transfer': return 'Bank Transfer'
      default: return method || 'Cash'
    }
  }

  const isThermal = posContext?.printerType === 'Thermal'

  return (
    <div 
      ref={ref} 
      className={cn(
        "bg-white text-slate-800 font-sans mx-auto print:block shadow-2xl transition-all duration-300 overflow-hidden",
        isThermal ? "w-[80mm] max-w-[80mm] p-2 text-[10px]" : "w-[210mm] p-10 text-xs min-h-[297mm]",
        (!isReady || loading) ? 'opacity-0' : 'opacity-100'
      )}
    >
      {loading ? (
        <div className="p-20 text-center text-slate-300">Preparing invoice...</div>
      ) : (
        <>
          {/* Header */}
          <div className={cn(
            "flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-6",
            isThermal && "flex-col gap-4 text-center items-center pb-2 mb-4"
          )}>
            <div className={cn("flex items-center gap-4", isThermal && "flex-col")}>
              <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">EHA</div>
              <div className={cn("space-y-0.5", isThermal && "text-center")}>
                <h1 className={cn("text-2xl font-black tracking-tight text-slate-900 uppercase", isThermal && "text-lg")}>Ethan Home Appliances</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                  {branch?.full_address || 'Main Showroom'}<br />
                  {branch?.city}, {branch?.state}<br />
                  GSTIN: <span className="text-slate-900">{branch?.gstin || 'EXEMPTED'}</span>
                </p>
              </div>
            </div>
            <div className={cn("text-right space-y-0.5", isThermal && "text-center w-full pt-2 border-t border-slate-100")}>
              <h2 className="text-sm font-black text-slate-900 uppercase">{customer?.gstin ? 'Tax Invoice' : 'Retail Invoice'}</h2>
              <p className="font-bold text-slate-500">Invoice: <span className="text-slate-900">{invoiceNo}</span></p>
              <p className="font-bold text-slate-500">Date: <span className="text-slate-900">{displayDate}</span></p>
            </div>
          </div>

          {/* Customer & Billing Info */}
          <div className={cn(
            "grid gap-6 mb-6 pb-6 border-b border-slate-100",
            isThermal ? "grid-cols-1 gap-2" : "grid-cols-2 gap-10"
          )}>
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed To</span>
              <p className="text-xs font-black text-slate-900">{customer?.company_name || customer?.full_name || customer?.name || 'Walk-in Customer'}</p>
              {customer?.company_name && <p className="font-bold text-slate-700 text-[10px] mt-0.5">Attn: {customer?.full_name || customer?.name}</p>}
              <p className="font-bold text-slate-500 mt-1">Phone: {customer?.phone_number || 'N/A'}</p>
              {customer?.state && <p className="font-bold text-slate-500">State: {customer.state}</p>}
              {customer?.gstin && <p className="font-bold text-slate-500 mt-0.5">GSTIN: {customer.gstin}</p>}
            </div>
            <div className={cn(isThermal ? "text-left pt-2 border-t border-slate-50" : "text-right")}>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Mode</span>
              <p className="text-xs font-black text-slate-900 uppercase">
                {getPaymentMethodDisplay(paymentMethodRaw || initialData?.payment_method)}
              </p>
              <p className="font-bold text-slate-500 lowercase opacity-60 text-[9px]">status: settled</p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className={cn("w-full mb-6", isThermal && "table-fixed border-collapse")}>
            <thead>
              <tr className="border-b border-slate-900 text-[8px] font-black uppercase text-slate-400">
                <th className={cn("py-2 text-left", isThermal ? "w-[45%]" : "w-[40%]")}>Description</th>
                {!isThermal && <th className="py-2 text-center w-[15%]">HSN</th>}
                <th className={cn("py-2 text-center", isThermal ? "w-[15%]" : "w-[10%]")}>Qty</th>
                <th className={cn("py-2 text-right", isThermal ? "w-[20%]" : "w-[15%]")}>Price</th>
                {!isThermal && <th className="py-2 text-center w-[10%]">GST</th>}
                <th className={cn("py-2 text-right font-black text-slate-900", isThermal ? "w-[20%]" : "w-[10%]")}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cart.map((item, idx) => (
                <tr key={idx} className="font-bold text-[9px]">
                  <td className="py-2 text-slate-900 break-words pr-2">
                    <div>{item.model_name}</div>
                    {/* Serial Numbers (Archival or Draft) */}
                    {item.serial_number && (
                      <div className="text-[7px] text-slate-400 font-mono mt-0.5 leading-tight">S/N: {item.serial_number}</div>
                    )}
                    {!(item as { serial_number?: string }).serial_number && (item as CartItem).selectedUnits && Object.values((item as CartItem).selectedUnits || {}).some((u) => u !== null) && (
                      <div className="mt-0.5 space-y-0.5">
                        {Object.values((item as CartItem).selectedUnits || {})
                          .filter((u): u is { id: string; serial: string } => u !== null && typeof u.serial === 'string')
                          .map((u, sIdx) => (
                            <div key={sIdx} className="text-[7px] text-slate-400 font-mono leading-tight">
                              S/N: {u.serial}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </td>
                  {!isThermal && <td className="py-2 text-center text-slate-500">{item.hsn_code || '8415'}</td>}
                  <td className="py-2 text-center">{item.qty}</td>
                  <td className="py-2 text-right">₹{item.base_price.toLocaleString()}</td>
                  {!isThermal && <td className="py-2 text-center">{item.gst_rate}%</td>}
                  <td className="py-2 text-right text-slate-900 font-extrabold">₹{((item.base_price * item.qty) + (item.gst_amount || 0)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals & Tax Summary */}
          <div className={cn(
            "grid gap-6 mb-6",
            isThermal ? "grid-cols-1" : "grid-cols-2 gap-10"
          )}>
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Tax Breakdown (HSN Slabs)</span>
                <div className="space-y-2">
                  {Object.entries(
                    cart.reduce((acc, item) => {
                      const rate = item.gst_rate;
                      if (!acc[rate]) acc[rate] = { taxable: 0, tax: 0 };
                      acc[rate].taxable += item.base_price * item.qty;
                      acc[rate].tax += (item.base_price * item.qty * rate) / 100;
                      return acc;
                    }, {} as Record<number, { taxable: number, tax: number }>)
                  ).map(([rate, data]) => (
                    <div key={rate} className="border-b border-slate-200/50 last:border-0 pb-1.5 last:pb-0">
                      <div className="flex justify-between items-center text-[8px] mb-1">
                        <span className="text-slate-400 font-bold uppercase tracking-tighter">GST {rate}% Slab (Taxable: ₹{Math.round(data.taxable).toLocaleString()})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-slate-500 uppercase font-black">CGST ({Number(rate) / 2}%)</span>
                          <span className="font-black text-slate-900">₹{(data.tax / 2).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-slate-500 uppercase font-black">SGST ({Number(rate) / 2}%)</span>
                          <span className="font-black text-slate-900">₹{(data.tax / 2).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-1 italic text-slate-500 text-[9px] leading-relaxed break-words">
                <strong className="not-italic text-slate-400 uppercase text-[8px] block mb-0.5">Total in Words</strong>
                {numberToWords(totals.grandTotal)}
              </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-slate-100 border-dashed">
              <div className="flex justify-between font-bold text-[9px]">
                <span className="text-slate-400">Subtotal</span>
                <span>₹{totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-[9px] border-b border-slate-100 pb-2">
                <span className="text-slate-400">Total Tax</span>
                <span>₹{totals.totalGst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] font-black uppercase text-slate-900 tracking-wider">Net Amount</span>
                <span className={cn("font-black text-slate-900 tracking-tighter font-mono", isThermal ? "text-xl" : "text-3xl")}>₹{Math.round(totals.grandTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer / Terms */}
          <div className={cn(
            "mt-auto pt-6 border-t border-slate-200 border-dashed",
            isThermal && "pt-4"
          )}>
            <div className={cn(
              "grid gap-6",
              isThermal ? "grid-cols-1" : "grid-cols-2"
            )}>
              <div className="text-[8px] text-slate-400 space-y-1 break-words">
                <p className="font-black uppercase text-slate-500 mb-1">Terms & Conditions</p>
                <p>1. No returns/exchange once sold.</p>
                <p>2. Subject to Ethan Home Appliances local Jurisdiction.</p>
                <p>3. Computer-generated; no signature required.</p>
              </div>
              <div className={cn("flex flex-col", isThermal ? "items-center text-center pt-4 border-t border-slate-50" : "items-end text-right")}>
                <div className={cn("h-12 w-32 border-b border-slate-300 mb-2", isThermal && "w-40")}></div>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Authorized Signatory</p>
              </div>
            </div>
            <div className={cn("mt-6 text-center py-3 bg-slate-900 rounded-lg", isThermal && "mt-4 py-2")}>
              <p className="text-white text-[8px] font-black uppercase tracking-[0.2em]">Thank you for shopping with EHA</p>
            </div>

            {/* Loyalty points earned */}
            {customer?.id && customer.id !== '00000000-0000-0000-0000-000000000000' && (
              <div className="text-center text-xs text-slate-500 border-t pt-2 mt-3">
                <p>
                  Points earned on this purchase:{' '}
                  <span className="font-bold text-purple-700">
                    +{Math.floor(Number(totals.grandTotal ?? 0) * 0.01)} pts
                  </span>
                </p>
                {(customer as any)?.loyalty_balance != null && (
                  <p>
                    Your loyalty balance:{' '}
                    <span className="font-bold">
                      {(customer as any).loyalty_balance + Math.floor(Number(totals.grandTotal ?? 0) * 0.01)} pts
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
})

InvoiceTemplate.displayName = 'InvoiceTemplate'
