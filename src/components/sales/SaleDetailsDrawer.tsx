"use client"

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Loader2, Package, RotateCcw } from "lucide-react"
import { fmtINR } from '@/lib/utils'
import { SalesReturnDrawer } from './SalesReturnDrawer'

interface SaleDetailsDrawerProps {
  saleId: string | null
  invoiceNumber?: string | null
  invoiceStatus?: string | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface SaleItem {
  id: string
  invoice_id: string
  product_id: string
  qty: number
  unit_price: number
  discount_amount: number | null
  discount_pct: number | null
  name: string
  hsn_code: string
  gst_rate: number
  serial_number?: string
}

const MANAGER_ROLES = ['manager', 'admin', 'super_admin', 'admin/owner']

export function SaleDetailsDrawer({
  saleId,
  invoiceNumber,
  invoiceStatus,
  open,
  onClose,
  onSuccess,
}: SaleDetailsDrawerProps) {
  const { data: session } = useSession()
  const [items, setItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)

  const userRole = (session?.user?.role ?? '').toLowerCase()
  const canReturn = MANAGER_ROLES.includes(userRole)
  const alreadyReversed = invoiceStatus === 'returned' || invoiceStatus === 'voided'

  useEffect(() => {
    if (saleId && open && saleId !== 'undefined') {
      const fetchItems = async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/sales/registry/${saleId}/items`)
          if (!res.ok) throw new Error("Failed to fetch items")
          const data = await res.json()
          setItems(data)
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      fetchItems()
    }
  }, [saleId, open])

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-md bg-white border-l shadow-2xl flex flex-col p-0">
          <SheetHeader className="p-6 border-b shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Invoice Details
                </SheetTitle>
                <SheetDescription>
                  {invoiceNumber || (saleId && saleId !== 'undefined' ? `Registry #INV-${saleId.slice(0, 8).toUpperCase()}` : 'Viewing line items')}
                </SheetDescription>
              </div>

              {/* Return button — manager+ only, hidden if already reversed */}
              {canReturn && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={alreadyReversed}
                  onClick={() => setReturnOpen(true)}
                  className="shrink-0 gap-1.5 text-orange-700 border-orange-300
                    hover:bg-orange-50 disabled:opacity-50"
                  title={alreadyReversed ? `Invoice is ${invoiceStatus}` : 'Process a return for this invoice'}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Return
                </Button>
              )}
            </div>

            {/* Status badge */}
            {invoiceStatus && invoiceStatus !== 'active' && (
              <div className="pt-1">
                <Badge
                  variant="outline"
                  className={
                    invoiceStatus === 'voided'   ? 'bg-red-50 text-red-700 border-red-200' :
                    invoiceStatus === 'returned' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-slate-100 text-slate-600'
                  }
                >
                  {invoiceStatus.charAt(0).toUpperCase() + invoiceStatus.slice(1)}
                </Badge>
              </div>
            )}
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {items.map((item) => (
                <div key={item.id} className="group flex flex-col gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {item.name || 'Unknown Product'}
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
                          {item.gst_rate ? `${item.gst_rate}% GST` : 'TAX INCL'}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                          HSN: {item.hsn_code || '8415'}
                        </Badge>
                      </div>
                    </div>
                    <p className="font-black text-slate-900">{fmtINR(Number(item.unit_price))}</p>
                  </div>

                  <Separator className="opacity-50" />

                  <div className="flex justify-between items-center text-sm">
                    <div className="text-slate-500">
                      Quantity: <span className="font-bold text-slate-900">{item.qty}</span>
                    </div>
                    <div className="text-right">
                      {item.serial_number && (
                        <p className="text-[10px] text-blue-600 font-bold font-mono mb-1 underline decoration-dotted">SN: {item.serial_number}</p>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Line Total (incl. Tax)</p>
                      <p className="font-black text-slate-900">{fmtINR(Number(item.qty) * Number(item.unit_price))}</p>
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No items found for this invoice.</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Return drawer — mounted outside the details sheet to avoid nesting */}
      <SalesReturnDrawer
        open={returnOpen}
        invoiceId={saleId}
        invoiceNumber={invoiceNumber ?? undefined}
        onClose={() => setReturnOpen(false)}
        onSuccess={() => {
          setReturnOpen(false)
          onClose()
          onSuccess?.()
        }}
      />
    </>
  )
}
