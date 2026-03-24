"use client"
// v1.0.3 - RPC & Header API Definitive Fix
import React, { forwardRef, useEffect, useState, useContext } from 'react'
import { PosContext } from '@/context/PosContext'
import type { Branch, Customer } from '@/context/PosContext'
import { numberToWords } from '@/utils/numberToWords'

interface InvoiceTemplateProps {
  invoiceId?: string
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ invoiceId }, ref) => {
  const posContext = useContext(PosContext)
  
  // Local state for archival/re-print mode
  const [archivalData, setArchivalData] = useState<{
    cart: { model_name: string; hsn_code: string; qty: number; base_price: number; gst_rate: number; gst_amount: number }[]
    totals: { subtotal: number; totalGst: number; cgst: number; sgst: number; grandTotal: number }
    branch: Branch | null
    customer: Customer | null
    invoiceNumber: string
    date: string
  } | null>(null)
  const [loading, setLoading] = useState(!!invoiceId)

  useEffect(() => {
    if (invoiceId && typeof invoiceId === 'string' && invoiceId !== 'undefined') {
      const fetchData = async () => {
        setLoading(true)
        try {
          // 1. Fetch Items via Admin API (bypasses RLS issues)
          const itemsRes = await fetch(`/api/admin/sales/${invoiceId}/items`)
          if (!itemsRes.ok) throw new Error("Failed to fetch invoice items")
          const items = await itemsRes.json()

          // 2. We still need the header, branch, and customer.
          // Since the sales registry table already has this data, we could pass it in,
          // but for standalone re-print, let's fetch the header.
          // 2. Fetch Invoice Header via our new secure admin API
          const headerRes = await fetch(`/api/admin/sales/${invoiceId}`)
          if (!headerRes.ok) throw new Error("Failed to fetch invoice header")
          const invoice = await headerRes.json()

          const branch = invoice.branches
          const customer = invoice.customers

          const mappedCart = items.map((item: { model_name: string; hsn_code: string; quantity: number; unit_price: number; gst_rate: number; gst_amount: number }) => ({
             model_name: item.model_name || 'Unknown Product',
             hsn_code: item.hsn_code || '8415',
             qty: item.quantity,
             base_price: Number(item.unit_price),
             gst_rate: Number(item.gst_rate || 18),
             gst_amount: Number(item.gst_amount)
          }))

          setArchivalData({
            cart: mappedCart,
            totals: {
              subtotal: Number(invoice.net_amount),
              totalGst: Number(invoice.tax_amount),
              cgst: Number(invoice.tax_amount) / 2,
              sgst: Number(invoice.tax_amount) / 2,
              grandTotal: Number(invoice.total_amount)
            },
            branch: branch,
            customer: customer || { full_name: 'Walk-in Customer' },
            invoiceNumber: invoice.id.slice(0, 8).toUpperCase(),
            date: new Date(invoice.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          })
        } catch (err) {
          console.error("Failed to fetch archival invoice:", err)
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    }
  }, [invoiceId])

  // Use either context or archival data
  const cart = (invoiceId ? archivalData?.cart : posContext?.cart) || []
  const totals = (invoiceId ? archivalData?.totals : posContext?.totals) || { subtotal: 0, totalGst: 0, cgst: 0, sgst: 0, grandTotal: 0 }
  const branch = invoiceId ? archivalData?.branch : posContext?.currentBranchDetails
  const customer = invoiceId ? archivalData?.customer : posContext?.selectedCustomer
  const invoiceNo = invoiceId ? archivalData?.invoiceNumber : posContext?.invoiceNumber
  const displayDate = invoiceId ? archivalData?.date : posContext?.currentDate

  return (
    <div ref={ref} className={`p-10 bg-white text-slate-800 font-sans text-xs w-[210mm] min-h-[297mm] mx-auto print:block shadow-2xl ${(!invoiceId || loading) ? 'opacity-0 h-0 w-0 pointer-events-none' : ''}`}>
      {loading ? (
        <div className="p-20 text-center text-slate-300">Preparing invoice...</div>
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-10">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl">EHA</div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Ethan Home Appliances</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-tight">
                  {branch?.full_address || 'Main Showroom'}<br />
                  {branch?.city}, {branch?.state} - {branch?.pincode}<br />
                  GSTIN: <span className="text-slate-900">{branch?.gstin || 'EXEMPTED'}</span>
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <h2 className="text-xl font-black text-slate-900 uppercase">Tax Invoice</h2>
              <p className="font-bold text-slate-500">Invoice: <span className="text-slate-900">{invoiceNo}</span></p>
              <p className="font-bold text-slate-500">Date: <span className="text-slate-900">{displayDate}</span></p>
            </div>
          </div>

          {/* Customer & Billing Info */}
          <div className="grid grid-cols-2 gap-10 mb-8 pb-8 border-b border-slate-100">
            <div>
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed To</span>
              <p className="text-sm font-black text-slate-900">{customer?.full_name || customer?.name || 'Walk-in Customer'}</p>
              <p className="font-bold text-slate-500">Phone: {customer?.phone || 'N/A'}</p>
              {customer?.gstin && <p className="font-bold text-slate-500">GSTIN: {customer.gstin}</p>}
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Mode</span>
              <p className="text-sm font-black text-slate-900 uppercase">Verified Transaction</p>
              <p className="font-bold text-slate-500 lowercase">status: paid / settled</p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full mb-10">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[9px] font-black uppercase text-slate-400">
                <th className="py-3 text-left">Description</th>
                <th className="py-3 text-center">HSN</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-right">Unit Price</th>
                <th className="py-3 text-center">GST %</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cart.map((item, idx) => (
                <tr key={idx} className="font-bold">
                  <td className="py-4 text-slate-900">{item.model_name}</td>
                  <td className="py-4 text-center text-slate-500">{item.hsn_code || '8415'}</td>
                  <td className="py-4 text-center">{item.qty}</td>
                  <td className="py-4 text-right">₹{item.base_price.toLocaleString()}</td>
                  <td className="py-4 text-center">{item.gst_rate}%</td>
                  <td className="py-4 text-right text-slate-900 font-black">₹{(item.base_price * item.qty).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals & Tax Summary */}
          <div className="grid grid-cols-2 gap-10 mb-10">
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Tax Analysis (50/50 Split)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">CGST ({(cart[0]?.gst_rate || 18) / 2}%)</p>
                    <p className="font-black text-slate-900">₹{totals.cgst.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">SGST ({(cart[0]?.gst_rate || 18) / 2}%)</p>
                    <p className="font-black text-slate-900">₹{totals.sgst.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="px-1 italic text-slate-500 text-[10px]">
                <strong>Total in Words:</strong> {numberToWords(totals.grandTotal)}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between font-bold">
                <span className="text-slate-400 capitalize">Subtotal (Excl. Tax)</span>
                <span>₹{totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-b border-slate-100 pb-3">
                <span className="text-slate-400 capitalize">Total Tax (GST)</span>
                <span>₹{totals.totalGst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Grand Total</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter font-mono">₹{Math.round(totals.grandTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer / Terms */}
          <div className="mt-auto pt-10 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-10">
              <div className="text-[8px] text-slate-400 space-y-1">
                <p className="font-black uppercase text-slate-500">Terms & Conditions</p>
                <p>1. Goods once sold will not be taken back or exchanged.</p>
                <p>2. Subject to Kochi Jurisdiction only.</p>
                <p>3. This is a computer-generated invoice and requires no physical signature.</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="h-16 w-32 border-b border-slate-300 mb-2"></div>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Authorized Signatory</p>
              </div>
            </div>
            <div className="mt-8 text-center py-4 bg-slate-900 rounded-lg">
              <p className="text-white text-[9px] font-black uppercase tracking-[0.3em]">Thank you for choosing Ethan Home Appliances</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
})

InvoiceTemplate.displayName = 'InvoiceTemplate'
