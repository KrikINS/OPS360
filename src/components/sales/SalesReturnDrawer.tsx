'use client'

import { useState, useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2, AlertTriangle, CheckCircle2,
  RotateCcw, Minus, Plus,
} from 'lucide-react'
import { fmtINR } from '@/lib/utils'
import { processReturn } from '@/actions/pos'
import { getInvoiceItemsForReturnAction } from '@/app/actions/pos'

// ── Types ───────────────────────────────────────────

type ReturnItem = {
  invoiceItemId: string
  productId:     string
  modelName:     string
  brand:         string
  qty:           number
  unitPrice:     number
  costPrice:     number
  cgstPerUnit:   number
  sgstPerUnit:   number
  igstPerUnit:   number
  inventoryId?:  string
  serialNumber?: string
}

type RefundMethod = 'cash' | 'bank' | 'loyalty_points'

// ── Main Component ──────────────────────────────────

export function SalesReturnDrawer({
  open,
  invoiceId,
  invoiceNumber,
  onClose,
  onSuccess,
}: {
  open:            boolean
  invoiceId:       string | null
  invoiceNumber?:  string
  onClose:         () => void
  onSuccess:       () => void
}) {
  const [items, setItems]         = useState<ReturnItem[]>([])
  const [loading, setLoading]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]         = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form state
  const [reason, setReason]               = useState('')
  const [refundMethod, setRefundMethod]   = useState<RefundMethod | null>(null)
  const [selected, setSelected]           = useState<Map<string, number>>(new Map())
  // Map<invoiceItemId, returnQty>

  // Fetch items on open
  useEffect(() => {
    if (!open || !invoiceId) return
    let active = true
    setLoading(true)
    setItems([])
    setSelected(new Map())
    setReason('')
    setRefundMethod(null)
    setToast(null)

    getInvoiceItemsForReturnAction(invoiceId).then(res => {
      if (!active) return
      if (res.error) {
        setToast({ type: 'error', message: res.error.message })
      } else {
        setItems(res.data ?? [])
      }
      setLoading(false)
    })

    return () => { active = false }
  }, [open, invoiceId])

  // Dismiss toast after 5s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // Toggle item selection
  const toggleItem = (itemId: string, maxQty: number) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.set(itemId, maxQty)
      }
      return next
    })
  }

  // Adjust return qty for an item
  const adjustQty = (itemId: string, delta: number, maxQty: number) => {
    setSelected(prev => {
      const next = new Map(prev)
      const cur = next.get(itemId) ?? 0
      const newQty = Math.max(1, Math.min(maxQty, cur + delta))
      next.set(itemId, newQty)
      return next
    })
  }

  // Computed summary
  const selectedItems = items.filter(i => selected.has(i.invoiceItemId))
  const totalRefund   = selectedItems.reduce((s, i) => s + i.unitPrice * (selected.get(i.invoiceItemId) ?? 0), 0)
  const returnCGST    = selectedItems.reduce((s, i) => s + i.cgstPerUnit * (selected.get(i.invoiceItemId) ?? 0), 0)
  const returnSGST    = selectedItems.reduce((s, i) => s + i.sgstPerUnit * (selected.get(i.invoiceItemId) ?? 0), 0)
  const returnGST     = returnCGST + returnSGST
  const returnSubtotal = totalRefund - returnGST

  const canSubmit = (
    reason.trim().length > 0 &&
    selected.size > 0 &&
    refundMethod !== null &&
    !submitting
  )

  const handleSubmit = async () => {
    if (!canSubmit || !invoiceId || !refundMethod) return
    setSubmitting(true)

    const returnItems = selectedItems.map(i => ({
      invoiceItemId: i.invoiceItemId,
      productId:     i.productId,
      inventoryId:   i.inventoryId,
      qty:           selected.get(i.invoiceItemId) ?? 1,
      unitPrice:     i.unitPrice,
      costPrice:     i.costPrice,
      cgst:          i.cgstPerUnit,
      sgst:          i.sgstPerUnit,
      igst:          i.igstPerUnit,
    }))

    const result = await processReturn({
      invoiceId,
      reason: reason.trim(),
      refundMethod,
      items: returnItems,
    })

    setSubmitting(false)

    if (result.success) {
      setToast({ type: 'success', message: `Return processed — refund of ${fmtINR(result.refundAmount)} recorded` })
      setTimeout(() => {
        onClose()
        onSuccess()
      }, 1500)
    } else {
      setToast({ type: 'error', message: result.error ?? 'Failed to process return' })
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent
        side="right"
        className="!w-[50vw] !max-w-[50vw] !min-w-[520px] flex flex-col p-0 overflow-hidden"
        showCloseButton={true}
      >
        {/* ── Header ─────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/80">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <RotateCcw className="h-4 w-4 text-orange-600" />
            </div>
            Process Return
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {invoiceNumber ? `Invoice ${invoiceNumber}` : 'Select items to return and refund method.'}
            {' '}Inventory will be restored automatically.
          </SheetDescription>
        </SheetHeader>

        {/* ── Body ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Toast */}
          {toast && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm
              ${toast.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {toast.type === 'success'
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {toast.message}
            </div>
          )}

          {/* Section 1 — Reason */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">
              Reason for Return <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer received wrong model, defective unit…"
              className="text-sm min-h-[72px] max-h-[120px] resize-none"
              rows={2}
            />
          </div>

          <Separator />

          {/* Section 2 — Items */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">
              Items to Return <span className="text-red-500">*</span>
            </Label>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading invoice items…
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No items found for this invoice.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map(item => {
                  const isChecked = selected.has(item.invoiceItemId)
                  const returnQty = selected.get(item.invoiceItemId) ?? item.qty
                  const lineTotal = isChecked ? item.unitPrice * returnQty : 0

                  return (
                    <div
                      key={item.invoiceItemId}
                      onClick={() => toggleItem(item.invoiceItemId, item.qty)}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer
                        transition-colors
                        ${isChecked
                          ? 'border-orange-300 bg-orange-50/60'
                          : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      {/* Checkbox */}
                      <div className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center
                        ${isChecked ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                        {isChecked && (
                          <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-slate-900 truncate">
                              {item.modelName}
                            </p>
                            <p className="text-xs text-slate-500">{item.brand}</p>
                            {item.serialNumber && (
                              <p className="text-[10px] font-mono text-blue-600 mt-0.5">
                                SN: {item.serialNumber}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-slate-400">Unit price</p>
                            <p className="font-bold text-sm text-slate-900">{fmtINR(item.unitPrice)}</p>
                          </div>
                        </div>

                        {isChecked && (
                          <div
                            className="flex items-center justify-between mt-3"
                            onClick={e => e.stopPropagation()}
                          >
                            {/* Qty stepper */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 mr-1">Qty to return:</span>
                              <button
                                type="button"
                                onClick={() => adjustQty(item.invoiceItemId, -1, item.qty)}
                                disabled={returnQty <= 1}
                                className="h-7 w-7 rounded-lg border flex items-center justify-center
                                  hover:bg-slate-100 disabled:opacity-40 transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-bold text-sm w-6 text-center">{returnQty}</span>
                              <button
                                type="button"
                                onClick={() => adjustQty(item.invoiceItemId, +1, item.qty)}
                                disabled={returnQty >= item.qty}
                                className="h-7 w-7 rounded-lg border flex items-center justify-center
                                  hover:bg-slate-100 disabled:opacity-40 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <span className="text-xs text-slate-400">/ {item.qty}</span>
                            </div>
                            {/* Line return amount */}
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Return amount</p>
                              <p className="font-bold text-sm text-orange-700">{fmtINR(lineTotal)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Section 3 — Refund method */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">
              Refund Method <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-3">
              {([ 'cash', 'bank', 'loyalty_points'] as RefundMethod[]).map(method => {
                const label = method === 'cash' ? 'Cash'
                  : method === 'bank' ? 'Bank Transfer'
                  : 'Loyalty Points'
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setRefundMethod(method)}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-semibold
                      transition-colors
                      ${refundMethod === method
                        ? 'border-orange-400 bg-orange-50 text-orange-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 4 — Summary */}
          {selected.size > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Return Summary</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Items selected</span>
                  <span className="font-semibold">{selected.size}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxable amount</span>
                  <span className="font-semibold">{fmtINR(returnSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST reversed (CGST + SGST)</span>
                  <span className="font-semibold">{fmtINR(returnGST)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between text-slate-900 font-bold text-base">
                  <span>Total Refund</span>
                  <span className="text-orange-700">{fmtINR(totalRefund)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────── */}
        <SheetFooter className="border-t bg-slate-50/80 px-6 py-4 flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Process Return {selected.size > 0 ? fmtINR(totalRefund) : ''}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
