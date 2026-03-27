"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, XCircle, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface Product {
  model_name: string
  product_code: string
  hsn_code: string
}

interface POItem {
  id: string
  product_id: string
  quantity: number
  received_quantity: number
  unit_price: number
  product: Product
}

interface PurchaseOrder {
  id: string
  po_number: string
  vendor: { name: string }
  items: POItem[]
}

interface GRNDialogProps {
  po: PurchaseOrder | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function GRNDialog({ po, isOpen, onClose, onSuccess }: GRNDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [freightCharges, setFreightCharges] = useState<Record<string, string>>({})
  const [serialNumbers, setSerialNumbers] = useState<Record<string, string>>({})
  const [conditionNotes, setConditionNotes] = useState("")
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [duplicates, setDuplicates] = useState<string[]>([])

  useEffect(() => {
    // Local duplicate check across all items
    const allSns: string[] = []
    const duplicateSet = new Set<string>()
    
    Object.values(serialNumbers).forEach(snString => {
      const sns = snString.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== "")
      sns.forEach(sn => {
        if (allSns.includes(sn)) {
          duplicateSet.add(sn)
        }
        allSns.push(sn)
      })
    })
    
    setDuplicates(Array.from(duplicateSet))

    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast, serialNumbers])

  if (!po) return null

  const handleFinalize = async () => {
    setIsProcessing(true)
    setToast(null)

    // Construct items for sync
    const grnItems = po.items
      .map(item => {
        const sns = serialNumbers[item.id]
          ? serialNumbers[item.id].split(',').map(s => s.trim()).filter(s => s !== "")
          : []
        
        return {
          product_id: item.product_id,
          unit_price: item.unit_price,
          hsn_code: item.product.hsn_code,
          freight: parseFloat(freightCharges[item.id] || "0"),
          serial_numbers: sns,
          item_id: item.id // Keep track of which line item this belongs to
        }
      })
      .filter(item => item.serial_numbers.length > 0)

    if (grnItems.length === 0) {
      setIsProcessing(false)
      setToast({ message: "Please enter at least one serial number to process GRN.", type: "error" })
      return
    }

    // Validation: current SNS + alreadyReceived <= quantity
    for (const item of grnItems) {
      const poItem = po.items.find(i => i.id === item.item_id)
      const alreadyReceived = poItem?.received_quantity || 0
      if (item.serial_numbers.length + alreadyReceived > (poItem?.quantity || 0)) {
        setIsProcessing(false)
        setToast({ 
          message: `Serial numbers count exceeds remaining quantity for ${poItem?.product.model_name}`, 
          type: "error" 
        })
        return
      }
    }

    try {
      const res = await fetch('/api/procurement/inventory-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          po_id: po.id, 
          items: grnItems, 
          condition_notes: conditionNotes 
        })
      })

      const data = await res.json()

      if (res.ok) {
        setToast({ message: "GRN processed and inventory synced successfully!", type: "success" })
        setTimeout(() => {
            onSuccess()
            onClose()
            // Reset state
            setFreightCharges({})
            setSerialNumbers({})
            setConditionNotes("")
        }, 1500)
      } else {
        setToast({ message: data.error || "Failed to process GRN", type: "error" })
      }
    } catch (err) {
      console.error("GRN processing error:", err)
      setToast({ message: "Network error. Please check your connection.", type: "error" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="md:max-w-4xl p-0 overflow-hidden h-fit max-h-[85vh] flex flex-col border-none shadow-2xl">
        <DialogHeader className="bg-[#001529] text-white p-6 space-y-1">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-blue-400" />
            Process GRN: {po.po_number}
          </DialogTitle>
          <DialogDescription className="text-blue-100/70 font-medium">
            Vendor: {po.vendor.name} • Input received serial numbers and freight to sync inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-100 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-[280px] font-black uppercase text-[10px] tracking-widest text-[#000000]">Product Details</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-[#000000]">Ordered</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-[#000000]">Received</TableHead>
                  <TableHead className="w-[140px] font-black uppercase text-[10px] tracking-widest text-[#000000]">Freight (₹)</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-[#000000]">Serial Numbers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item) => {
                  const currentSns = serialNumbers[item.id]?.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== "") || []
                  const itemHasDuplicate = currentSns.some(sn => duplicates.includes(sn))
                  
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="font-black text-sm text-[#000000]">{item.product.model_name}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">
                          CODE: {item.product.product_code}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-[#000000]">{item.quantity}</TableCell>
                      <TableCell className="text-center text-blue-700 font-black">
                        <div className="flex flex-col items-center">
                          <span>{item.received_quantity + currentSns.length}</span>
                          {currentSns.length > 0 && (
                            <span className="text-[9px] text-emerald-600">+{currentSns.length} new</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₹</span>
                          <Input 
                            type="number"
                            placeholder="0.00"
                            className="h-10 text-sm pl-7 border-slate-300 focus:border-blue-500 text-[#000000] font-black"
                            value={freightCharges[item.id] || ""}
                            onChange={(e) => setFreightCharges({...freightCharges, [item.id]: e.target.value})}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Comma separated: SN123, SN456..."
                          className={cn(
                            "h-10 text-sm border-slate-300 focus:border-blue-500 text-[#000000] font-medium",
                            (itemHasDuplicate || (item.received_quantity + currentSns.length > item.quantity)) && "border-rose-500 bg-rose-50/50 focus:border-rose-600 focus:ring-rose-100"
                          )}
                          value={serialNumbers[item.id] || ""}
                          onChange={(e) => setSerialNumbers({...serialNumbers, [item.id]: e.target.value})}
                        />
                        {itemHasDuplicate && (
                          <p className="text-[9px] text-rose-600 font-black uppercase mt-1 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Duplicate Serial Number Detected
                          </p>
                        )}
                        {item.received_quantity + currentSns.length > item.quantity && (
                          <p className="text-[9px] text-rose-600 font-black uppercase mt-1 flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" /> Serial numbers count exceeds remaining quantity
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#000000]">
              Condition Notes / Internal Audit
            </Label>
            <Textarea 
              placeholder="Describe physical condition, seal status, etc. for the audit trail..."
              className="min-h-[100px] bg-slate-50 border-slate-300 text-[#000000] text-sm focus:bg-white transition-all font-medium"
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
            />
          </div>
        </div>

        {toast && (
          <div className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-bottom-4 duration-300",
            toast.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          )}>
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        <DialogFooter className="gap-3 p-6 bg-slate-50 border-t border-slate-200 mx-0 mb-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isProcessing}
            className="h-10 px-6 font-black uppercase text-[11px] tracking-widest border-red-100 text-red-500 hover:bg-red-50"
          >
            Cancel
          </Button>
          <Button 
            className="bg-[#001529] hover:bg-slate-800 text-white min-w-[240px] h-10 px-6 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-blue-900/10" 
            onClick={handleFinalize}
            disabled={isProcessing || duplicates.length > 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing to Registry...
              </>
            ) : duplicates.length > 0 ? (
              "Duplicate SN Found"
            ) : (
              "Sync Inventory & Finalize GRN"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
