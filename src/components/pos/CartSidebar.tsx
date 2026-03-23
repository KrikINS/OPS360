"use client"

import React from 'react'
import { ShoppingCart, Plus, Minus, Trash2, Printer, ArrowRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePos } from '@/context/PosContext'

export function CartSidebar({ onCheckout }: { onCheckout: () => void }) {
  const { cart, updateQty, removeFromCart, clearCart, invoiceNumber, currentDate, loading, totals } = usePos()

  return (
    <section className="w-full lg:w-[400px] flex flex-col bg-white border-l border-slate-200 h-full">
      <div className="p-4 bg-slate-900 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <ShoppingCart className="h-3 w-3 text-blue-400" />
            Active Register
          </h2>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase">{invoiceNumber}</span>
            <span className="text-[9px] text-slate-400 font-medium opacity-50">•</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase">{currentDate}</span>
          </div>
        </div>
        <button 
          className="text-[9px] font-black text-rose-400 p-0 h-auto uppercase hover:text-rose-300 transition-colors" 
          onClick={clearCart} 
          disabled={cart.length === 0}
        >
          Flush
        </button>
      </div>

      {/* Item List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-300 opacity-50">
            <ShoppingCart className="h-10 w-10" />
            <p className="text-[10px] font-black uppercase tracking-widest text-center">Register Empty<br/><span className="text-[8px] font-medium italic">Scanning or searching for products...</span></p>
          </div>
        ) : (
          <Table>
            <TableBody>
              {cart.map((item) => {
                const lineTotal = item.base_price * item.qty
                const lineGst = (lineTotal * item.gst_rate) / 100
                const finalAmount = lineTotal + lineGst

                return (
                  <TableRow key={item.id} className="border-b border-slate-50 group hover:bg-slate-50/50">
                    <TableCell className="w-8 py-4 pl-0 shrink-0">
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          title="Increase Quantity"
                          onClick={() => updateQty(item.id, 1)} 
                          className="bg-slate-100 p-1 rounded hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                        <span className="text-[10px] font-black tabular-nums">{item.qty}</span>
                        <button 
                          title="Decrease Quantity"
                          onClick={() => updateQty(item.id, -1)} 
                          className="bg-slate-100 p-1 rounded hover:bg-rose-600 hover:text-white transition-colors"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-2">
                      <div className="flex flex-col gap-0.5 max-w-[180px]">
                        <span className="text-xs font-bold text-slate-800 leading-tight truncate">{item.model_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400">₹{item.base_price.toLocaleString()}</span>
                          <Badge className="bg-blue-50 text-blue-600 text-[8px] px-1.5 border-none h-4">{Math.round(item.gst_rate)}% GST</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-0 font-black text-slate-900 tabular-nums shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-black">₹{Math.round(finalAmount).toLocaleString()}</span>
                        <button 
                          title="Remove item"
                          onClick={() => removeFromCart(item.id)} 
                          className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Footer - Always Visible */}
      <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="space-y-2 mb-6 text-[11px] font-bold text-slate-500">
          <div className="flex justify-between uppercase"><span>Taxable Value</span><span>₹{Math.round(totals.subtotal).toLocaleString()}</span></div>
          <div className="flex justify-between uppercase text-slate-400 border-l-2 border-slate-200 pl-3"><span>CGST ({totals.totalGst > 0 ? 'Split' : '0%'})</span><span>₹{Math.round(totals.cgst).toLocaleString()}</span></div>
          <div className="flex justify-between uppercase text-slate-400 border-l-2 border-slate-200 pl-3"><span>SGST ({totals.totalGst > 0 ? 'Split' : '0%'})</span><span>₹{Math.round(totals.sgst).toLocaleString()}</span></div>
          <div className="h-px bg-slate-200 my-2" />
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">₹{Math.round(totals.grandTotal).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Button 
          className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg group transition-all active:scale-[0.98] ring-offset-2 focus:ring-2 focus:ring-blue-500" 
          disabled={cart.length === 0 || loading} 
          onClick={onCheckout}
        >
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-3">
              <Printer className="h-5 w-5" />
              <div className="text-left">
                <span className="block text-xs font-black uppercase tracking-widest">Execute Checkout</span>
                <span className="text-[9px] font-bold text-blue-200 uppercase tracking-widest leading-none">Finalize & Print Invoice</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
          </div>
        </Button>
      </div>
    </section>
  )
}
