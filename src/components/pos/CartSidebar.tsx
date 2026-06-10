import React, { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, Printer, ArrowRight, Scan, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePos, SelectedUnit, SYSTEM_WALKIN_ID } from '@/context/PosContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ManagerDiscountModal } from "./ManagerDiscountModal"
import { fmtINR } from '@/lib/utils'

function SerialSelector({ productId, index, onSelect }: { productId: string, index: number, onSelect: (unit: SelectedUnit | null) => void }) {
  const { fetchAvailableSerials, cart } = usePos()
  const [serials, setSerials] = useState<{id: string, serial_number: string}[]>([])
  const [loading, setLoading] = useState(false)

  const currentItem = cart.find(i => i.id === productId)
  const currentUnit = currentItem?.selectedUnits?.[index]

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await fetchAvailableSerials(productId)
      const alreadySelected = Object.values(currentItem?.selectedUnits || {})
        .filter((u, i) => u !== null && i !== index)
        .map(u => u?.id)
      const available = data.filter(s => !alreadySelected.includes(s.id))
      setSerials(available)
      if (available.length === 1 && !currentUnit) {
        onSelect({ id: available[0].id, serial: available[0].serial_number })
      }
      setLoading(false)
    }
    load()
  }, [productId, fetchAvailableSerials, currentItem?.selectedUnits, index, currentUnit, onSelect])

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">
        Unit #{index + 1}
      </span>
      {currentUnit ? (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] h-4 px-1.5 gap-0.5 shrink-0">
          <CheckCircle2 className="h-2.5 w-2.5" /> Linked
        </Badge>
      ) : (
        <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-[9px] h-4 px-1.5 gap-0.5 shrink-0">
          <AlertCircle className="h-2.5 w-2.5" /> Pending
        </Badge>
      )}
      <Select
        value={currentUnit ? `${currentUnit.id}|${currentUnit.serial}` : "none"}
        onValueChange={(val) => {
          if (!val || val === "none") {
            onSelect(null)
          } else {
            const [id, ...serialParts] = val.split('|')
            const serial = serialParts.join('|')
            onSelect({ id, serial })
          }
        }}
      >
        <SelectTrigger className="h-7 text-[10px] font-mono bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 flex-1 min-w-0">
          <SelectValue placeholder={loading ? "Loading..." : "Assign serial no..."}>
            {currentUnit?.serial}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-[10px]">— Deselect —</SelectItem>
          {serials.map((s, idx) => (
            <SelectItem
              key={`${s.id}-${s.serial_number}-${idx}`}
              value={`${s.id}|${s.serial_number}`}
              className="text-[10px] font-mono"
            >
              {s.serial_number}
            </SelectItem>
          ))}
          {serials.length === 0 && !loading && (
            <div className="p-2 text-[10px] text-slate-400 italic">No available serials</div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CartSidebar({ onCheckout }: { onCheckout: () => void }) {
  const {
    cart, updateQty, removeFromCart, clearCart, invoiceNumber, currentDate, loading, totals,
    assignSerialToUnit, isCartValid, applyItemDiscount,
    selectedCustomer, loyaltyBalance, loyaltyRedeem, setLoyaltyRedeem
  } = usePos()

  const finalTotal = Math.max(
    0,
    (Number(totals.grandTotal) || 0) - (Number(loyaltyRedeem) || 0)
  )

  const [discountModalOpen, setDiscountModalOpen] = useState(false)
  const [pendingDiscount, setPendingDiscount] = useState<{ productId: string, productName: string, pct: number, maxPct: number } | null>(null)

  const handleDiscountChange = async (productId: string, productName: string, pctString: string) => {
    const pct = parseFloat(pctString) || 0
    const item = cart.find(i => i.id === productId)
    if (item && item.discountPct === pct) return
    const res = await applyItemDiscount(productId, pct)
    if (res?.needsApproval) {
      setPendingDiscount({ productId, productName, pct, maxPct: res.maxAutoApproval || 10 })
      setDiscountModalOpen(true)
    }
  }

  const handleManagerConfirm = async (pin: string) => {
    if (!pendingDiscount) return
    const res = await applyItemDiscount(pendingDiscount.productId, pendingDiscount.pct, pin)
    if (!res?.success) {
      throw new Error(res?.error || 'Manager approval failed')
    }
    setDiscountModalOpen(false)
    setPendingDiscount(null)
  }

  return (
    <section className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/5 h-full transition-colors duration-300">

      {/* Header */}
      <div className="px-4 py-3.5 bg-slate-900 flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-white text-[10px] font-medium uppercase tracking-widest flex items-center gap-2">
            <ShoppingCart className="h-3 w-3 text-blue-400" />
            Active Register
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">{invoiceNumber}</span>
            <span className="text-slate-700">·</span>
            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">{currentDate}</span>
          </div>
        </div>
        <button
          className="text-[9px] font-medium text-rose-400 uppercase tracking-wide hover:text-rose-300 transition-colors disabled:opacity-30"
          onClick={clearCart}
          disabled={cart.length === 0}
        >
          Flush
        </button>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-300 opacity-40">
            <ShoppingCart className="h-10 w-10" />
            <p className="text-[10px] font-medium uppercase tracking-widest text-center">
              Register empty<br />
              <span className="text-[9px] normal-case font-normal opacity-70">Scan or search for products</span>
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const unitPriceAfterDisc = Math.max(0, (Number(item.mrp) || 0) - (Number(item.discountAmount) || 0))
            const finalAmount = unitPriceAfterDisc * item.qty
            const isSerial = item.tracking_type?.toLowerCase() === 'serial'

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col gap-0"
              >
                {/* Row 1: Name + Amount */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                    {item.model_name}
                  </span>
                  <span className="text-[13px] font-medium text-slate-900 dark:text-white whitespace-nowrap tabular-nums shrink-0">
                    {fmtINR(Math.round(finalAmount))}
                  </span>
                </div>

                {/* Row 2: Badges */}
                <div className="flex items-center gap-1.5 mb-3">
                  <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-none text-[9px] h-4 px-1.5 font-medium">
                    {Math.round(item.gst_rate)}% GST incl.
                  </Badge>
                  {item.discountAmount ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 line-through tabular-nums">{fmtINR(item.mrp)}</span>
                      <span className="text-[9px] font-medium text-emerald-600 tabular-nums">{fmtINR(unitPriceAfterDisc)}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-400 tabular-nums">{fmtINR(item.mrp)}</span>
                  )}
                </div>

                {/* Row 3: Controls */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-white/5">
                  {/* Qty stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      title="Decrease quantity"
                      onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="text-[12px] font-medium text-slate-900 dark:text-white tabular-nums w-4 text-center">{item.qty}</span>
                    <button
                      title="Increase quantity"
                      onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  {/* Discount input */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Disc</span>
                    <input
                      type="number"
                      defaultValue={item.discountPct || ''}
                      onBlur={(e) => handleDiscountChange(item.id, item.model_name, e.target.value)}
                      placeholder="0"
                      className="w-10 h-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-1.5 text-right text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[9px] text-slate-400">%</span>
                  </div>

                  {/* Remove */}
                  <button
                    title="Remove item"
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-300 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Serial selectors */}
                {isSerial && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
                    {Array.from({ length: item.qty }).map((_, idx) => (
                      <SerialSelector
                        key={idx}
                        productId={item.id}
                        index={idx}
                        onSelect={(unit) => assignSerialToUnit(item.id, idx, unit)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/5 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)]">
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            <span>Subtotal (taxable)</span>
            <span className="tabular-nums">{fmtINR(totals.taxableValue)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            <span>GST included</span>
            <span className="tabular-nums">{fmtINR(totals.totalGst)}</span>
          </div>
          {(Number(totals.discount) || 0) > 0 && (
            <div className="flex justify-between text-[11px] font-medium text-rose-400 uppercase tracking-wide">
              <span>Discount</span>
              <span className="tabular-nums">−{fmtINR(totals.discount)}</span>
            </div>
          )}
        </div>

        {/* Loyalty */}
        {selectedCustomer &&
          selectedCustomer.id !== SYSTEM_WALKIN_ID &&
          loyaltyBalance > 0 && (
          <div className="flex items-center justify-between py-2.5 mb-3 border-y border-dashed border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-purple-700 dark:text-purple-400">
                Loyalty
              </span>
              <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 font-medium">
                {loyaltyBalance} pts = {fmtINR(loyaltyBalance)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={Math.min(loyaltyBalance, Math.floor(Number(totals.grandTotal) || 0))}
                value={loyaltyRedeem || ''}
                onChange={e => {
                  const val = Math.min(
                    Number(e.target.value) || 0,
                    loyaltyBalance,
                    Math.floor(Number(totals.grandTotal) || 0)
                  )
                  setLoyaltyRedeem(val)
                }}
                placeholder="0"
                className="w-14 h-6 text-right text-[10px] font-medium border border-purple-200 rounded-md px-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white dark:bg-white/5"
              />
              <button
                onClick={() => setLoyaltyRedeem(Math.min(loyaltyBalance, Math.floor(Number(totals.grandTotal) || 0)))}
                className="text-[9px] font-medium text-purple-600 hover:text-purple-800 underline uppercase"
              >
                Use all
              </button>
            </div>
          </div>
        )}

        {loyaltyRedeem > 0 && (
          <div className="flex justify-between text-[11px] text-purple-600 font-medium uppercase tracking-wide mb-3">
            <span>Loyalty discount</span>
            <span className="tabular-nums">−{fmtINR(loyaltyRedeem)}</span>
          </div>
        )}

        {/* Grand total */}
        <div className="flex items-end justify-between pt-3 border-t border-slate-200 dark:border-white/5 mb-4">
          <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Grand total</span>
          <span className="text-2xl font-medium text-slate-900 dark:text-white tracking-tight leading-none tabular-nums">
            {fmtINR(Math.round(finalTotal))}
          </span>
        </div>

        <Button
          className={`w-full h-12 rounded-xl shadow-sm group transition-all active:scale-[0.98] ${
            isCartValid && cart.length > 0
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"
          }`}
          disabled={!isCartValid || cart.length === 0 || loading}
          onClick={onCheckout}
        >
          <div className="flex items-center justify-between w-full px-1">
            <div className="flex items-center gap-2.5">
              {isCartValid ? <Printer className="h-4 w-4" /> : <Scan className="h-4 w-4" />}
              <span className="text-[12px] font-medium uppercase tracking-widest">
                {!isCartValid ? "Assign serials" : "Checkout"}
              </span>
            </div>
            {isCartValid && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
          </div>
        </Button>
      </div>

      <ManagerDiscountModal
        isOpen={discountModalOpen}
        onClose={() => {
          setDiscountModalOpen(false)
          setPendingDiscount(null)
        }}
        onConfirm={handleManagerConfirm}
        productName={pendingDiscount?.productName || ''}
        requestedPct={pendingDiscount?.pct || 0}
        maxAllowedPct={pendingDiscount?.maxPct || 10}
      />
    </section>
  )
}
