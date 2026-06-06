import React, { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, Printer, ArrowRight, Scan, CheckCircle2, AlertCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
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
      // Filter out serials already selected in other slots of THIS item
      const alreadySelected = Object.values(currentItem?.selectedUnits || {})
        .filter((u, i) => u !== null && i !== index)
        .map(u => u?.id)
      
      const available = data.filter(s => !alreadySelected.includes(s.id))
      setSerials(available)
      
      // Auto-populate if only one serial is available and nothing is selected yet
      if (available.length === 1 && !currentUnit) {
        onSelect({ id: available[0].id, serial: available[0].serial_number })
      }
      
      setLoading(false)
    }
    load()
  }, [productId, fetchAvailableSerials, currentItem?.selectedUnits, index, currentUnit, onSelect])

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Unit #{index + 1}</span>
        {currentUnit ? (
          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] h-4 px-1 gap-1">
            <CheckCircle2 className="h-2 w-2" /> Linked
          </Badge>
        ) : (
          <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[8px] h-4 px-1 gap-1">
            <AlertCircle className="h-2 w-2" /> Select Serial
          </Badge>
        )}
      </div>
      <Select 
        value={currentUnit ? `${currentUnit.id}|${currentUnit.serial}` : "none"} 
        onValueChange={(val) => {
          if (!val || val === "none") {
            onSelect(null)
          } else {
            const [id, ...serialParts] = val.split('|')
            const serial = serialParts.join('|') // Handle serials that might contain pipes
            onSelect({ id, serial })
          }
        }}
      >
        <SelectTrigger className="h-8 text-[10px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
          <SelectValue placeholder={loading ? "Loading..." : "Assign Serial..."}>
            {currentUnit?.serial}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-[10px]">-- Deselect --</SelectItem>
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
    if (item && item.discountPct === pct) return // no change
    
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
                const unitPriceAfterDisc = Math.max(0, item.base_price - (item.discountAmount || 0))
                const lineTotal = unitPriceAfterDisc * item.qty
                const lineGst = (lineTotal * item.gst_rate) / 100
                const finalAmount = lineTotal + lineGst

                return (
                  <React.Fragment key={item.id}>
                    <TableRow className="border-b border-slate-50 dark:border-white/5 group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <TableCell className="w-8 py-4 pl-0 shrink-0">
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            title="Increase Quantity"
                            onClick={() => updateQty(item.id, 1)} 
                            className="bg-slate-100 dark:bg-white/5 p-1 rounded hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                          <span className="text-[10px] font-black tabular-nums">{item.qty}</span>
                          <button 
                            title="Decrease Quantity"
                            onClick={() => updateQty(item.id, -1)} 
                            className="bg-slate-100 dark:bg-white/5 p-1 rounded hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white transition-colors"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-2">
                        <div className="flex flex-col gap-0.5 max-w-[180px]">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">{item.model_name}</span>
                          <div className="flex items-center gap-2">
                            {item.discountAmount ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-slate-400 line-through">{fmtINR(item.base_price)}</span>
                                <span className="text-[9px] font-bold text-emerald-600">{fmtINR(item.base_price - item.discountAmount)}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400">{fmtINR(item.base_price)}</span>
                            )}
                            <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] px-1.5 border-none h-4">{Math.round(item.gst_rate)}% GST</Badge>
                            
                            <div className="flex items-center ml-auto gap-1">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">Disc %</span>
                              <input
                                type="number"
                                defaultValue={item.discountPct || ''}
                                onBlur={(e) => handleDiscountChange(item.id, item.model_name, e.target.value)}
                                className="w-10 h-5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-1 text-right text-[9px] font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          
                          {/* Unit Selectors for Serialized Items */}
                          {item.tracking_type?.toLowerCase() === 'serial' && (
                            <div className="space-y-3 mt-1 border-l-2 border-slate-100 dark:border-white/5 pl-2">
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
                      </TableCell>
                      <TableCell className="py-4 text-right pr-0 font-black text-slate-900 tabular-nums shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-black">{fmtINR(Math.round(finalAmount))}</span>
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
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Footer - Always Visible */}
      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/5 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors">
        <div className="space-y-2 mb-6 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {(Number(totals.discount) || 0) > 0 && (
            <div className="flex justify-between uppercase"><span>Discount</span><span className="text-rose-500">-{fmtINR(totals.discount)}</span></div>
          )}
          <div className="h-px bg-slate-200 dark:bg-white/5 my-2" />
          
          {/* Loyalty Points Redemption */}
          {selectedCustomer &&
           selectedCustomer.id !== SYSTEM_WALKIN_ID &&
           loyaltyBalance > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5 border-dashed">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-purple-700 tracking-widest">
                  Loyalty Points
                </span>
                <Badge variant="outline"
                  className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 uppercase font-black">
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
                  className="w-14 text-right text-xs font-bold border border-purple-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                />
                <button
                  onClick={() => setLoyaltyRedeem(Math.min(loyaltyBalance, Math.floor(Number(totals.grandTotal) || 0)))}
                  className="text-[9px] font-bold text-purple-600 hover:text-purple-800 underline uppercase"
                >
                  Use All
                </button>
              </div>
            </div>
          )}

          {loyaltyRedeem > 0 && (
            <div className="flex justify-between text-[11px] text-purple-700 font-bold uppercase mt-2">
              <span>Loyalty Discount</span>
              <span>-{fmtINR(loyaltyRedeem)}</span>
            </div>
          )}

          <div className="flex justify-between items-end mt-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{fmtINR(Math.round(finalTotal))}</span>
            </div>
          </div>
        </div>

        <Button 
          className={`w-full h-14 rounded-xl shadow-lg group transition-all active:scale-[0.98] ring-offset-2 focus:ring-2 ${
            isCartValid && cart.length > 0
              ? "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500" 
              : "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed"
          }`} 
          disabled={!isCartValid || cart.length === 0 || loading} 
          onClick={onCheckout}
        >
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-3">
              {isCartValid ? <Printer className="h-5 w-5" /> : <Scan className="h-5 w-5" />}
              <span className="text-sm font-black uppercase tracking-widest">
                {!isCartValid ? "Assign Serials" : "CHECKOUT"}
              </span>
            </div>
            {isCartValid && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
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
