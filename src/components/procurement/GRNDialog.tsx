"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { Label } from "@/components/ui/label"
import { 
  Loader2, CheckCircle2, XCircle, Package, Truck, 
  Landmark, FileText, Barcode, ScanLine, Zap, X, ShieldAlert, Camera
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Product {
  model_name: string
  product_code: string
  hsn_code: string
  base_price?: number
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

function CameraScanner({ onScan }: { onScan: (text: string) => void }) {
  const containerId = "grn-barcode-reader";
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!isMounted) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        const config = { 
          fps: 15, 
          qrbox: { width: 250, height: 120 },
          aspectRatio: 1.0
        };

        // Try environment (back) camera first
        try {
          await scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              if (decodedText) onScan(decodedText.trim());
            },
            () => {} // frame error (silent)
          );
        } catch (err) {
          console.warn("Back camera failed, trying front camera:", err);
          // Fallback to user (front) camera
          await scanner.start(
            { facingMode: "user" },
            config,
            (decodedText) => {
              if (decodedText) onScan(decodedText.trim());
            },
            () => {}
          );
        }
      } catch (err) {
        console.error("Camera scanner initialization failed:", err);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop()
            .then(() => scannerRef.current.clear())
            .catch((e: any) => console.error("Scanner stop error:", e));
        }
      }
    };
  }, [onScan]);

  return (
    <div className="relative w-full mb-4 group/camera">
      <div 
        id={containerId} 
        className="w-full bg-black/40 rounded-2xl overflow-hidden border-2 border-blue-500/30 aspect-square md:aspect-video shadow-inner"
      />
      <div className="absolute inset-0 pointer-events-none border-2 border-blue-500/20 rounded-2xl animate-pulse" />
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[9px] font-black uppercase text-blue-400 tracking-tighter border border-blue-500/30">
        Live Stream Active
      </div>
    </div>
  );
}

export function GRNDialog({ po, isOpen, onClose, onSuccess }: GRNDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [freightCharges, setFreightCharges] = useState<Record<string, string>>({})
  const [serialNumbers, setSerialNumbers] = useState<Record<string, string>>({})
  const [conditionNotes, setConditionNotes] = useState("")
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [duplicates, setDuplicates] = useState<string[]>([])

  // Scanner state
  const [activeScannerItemId, setActiveScannerItemId] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [scanBuffer, setScanBuffer] = useState("")
  const [lastScannedCount, setLastScannedCount] = useState(0)
  const scanInputRef = useRef<HTMLInputElement>(null)
  // Per-row freight input refs for post-scan focus jump
  const freightRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ──────────────── Duplicate-check & toast timer ────────────────
  useEffect(() => {
    const snPool = new Set<string>()
    const duplicateSet = new Set<string>()
    Object.values(serialNumbers).forEach(snString => {
      const sns = snString.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      sns.forEach(sn => {
        if (snPool.has(sn)) duplicateSet.add(sn)
        snPool.add(sn)
      })
    })
    setDuplicates(Array.from(duplicateSet))
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast, serialNumbers])

  // ──────────────── Auto-focus scanner input when panel opens ────────────────
  useEffect(() => {
    if (activeScannerItemId) {
      setTimeout(() => scanInputRef.current?.focus(), 80)
    }
  }, [activeScannerItemId])

  // ──────────────── Scanner: commit buffered value on Enter ────────────────
  const commitScan = useCallback((rawValue: string) => {
    const itemId = activeScannerItemId
    if (!itemId) return
    const scanned = rawValue.trim().toUpperCase()
    if (!scanned) return

    setScanBuffer("")

    setSerialNumbers(prev => {
      const existing = prev[itemId]?.trim() || ""
      const newVal = existing ? `${existing}, ${scanned}` : scanned
      return { ...prev, [itemId]: newVal }
    })

    setLastScannedCount(c => c + 1)
    setToast({ message: `✓ Scanned: ${scanned}`, type: "info" })

    // Auto-focus the Freight field for this row after scan
    setTimeout(() => {
      freightRefs.current[itemId]?.focus()
      freightRefs.current[itemId]?.select()
    }, 120)
  }, [activeScannerItemId])

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitScan(scanBuffer)
    }
  }

  const openScanner = (itemId: string) => {
    setScanBuffer("")
    setLastScannedCount(0)
    setIsCameraActive(false)
    setActiveScannerItemId(itemId)
  }

  const closeScanner = () => {
    setActiveScannerItemId(null)
    setIsCameraActive(false)
    setScanBuffer("")
  }

  // ──────────────── GRN Finalize ────────────────
  if (!po) return null

  const handleFinalize = async () => {
    setIsProcessing(true)
    setToast(null)

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
          item_id: item.id
        }
      })
      .filter(item => item.serial_numbers.length > 0)

    if (grnItems.length === 0) {
      setIsProcessing(false)
      setToast({ message: "Please enter at least one serial number to process GRN.", type: "error" })
      return
    }

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
        body: JSON.stringify({ po_id: po.id, items: grnItems, condition_notes: conditionNotes })
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ message: "GRN processed and inventory synced successfully!", type: "success" })
        setTimeout(() => {
          onSuccess(); onClose()
          setFreightCharges({}); setSerialNumbers({}); setConditionNotes("")
        }, 1500)
      } else {
        setToast({ message: data.error || "Failed to process GRN", type: "error" })
      }
    } catch {
      setToast({ message: "Network error. Please check your connection.", type: "error" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="md:max-w-5xl w-[95vw] p-0 overflow-hidden min-h-[300px] h-auto max-h-[95vh] flex flex-col border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        
        {/* ── Header ── */}
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-[#001529] via-[#002140] to-[#001529] text-white p-8 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-md border border-blue-400/20">
                  <Package className="h-6 w-6 text-blue-400" />
                </div>
                Process GRN: {po.po_number}
              </DialogTitle>
              <DialogDescription className="text-blue-100/60 font-medium text-sm flex items-center gap-2" render={<div />}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Logistics &amp; Inventory Sync • Vendor: {po.vendor.name}
              </DialogDescription>
            </div>
            <div className="hidden md:flex gap-4">
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                <div className="text-[10px] uppercase font-black tracking-widest text-blue-300/70">Registry Target</div>
                <div className="text-sm font-bold">Active Inventory</div>
              </div>
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                <div className="text-[10px] uppercase font-black tracking-widest text-emerald-300/70">Sync Mode</div>
                <div className="text-sm font-bold">Real-time Atomic</div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="flex-grow overflow-y-auto p-4 space-y-6 relative max-w-full overflow-x-hidden">

          {/* ── Scan Window (Absolute/Floating) ── */}
          {activeScannerItemId && (() => {
            const activeItem = po.items.find(i => i.id === activeScannerItemId)
            const currentSns = serialNumbers[activeScannerItemId]?.split(',').map(s => s.trim()).filter(s => s !== "") || []
            return (
              <div className="absolute top-4 right-4 z-50 w-[380px] rounded-2xl border-2 border-blue-500 bg-[#001529] text-white p-5 shadow-2xl shadow-blue-900/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Background glow */}
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />

                {/* Header row */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30 animate-pulse">
                      <ScanLine className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-blue-300/60">Scanner Active</p>
                      <p className="text-sm font-black leading-tight">{activeItem?.product.model_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/30 rounded-xl">
                      <Zap className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xs font-black text-emerald-300">{lastScannedCount} Scanned</span>
                    </div>
                    <button
                      type="button"
                      aria-label="Toggle Camera"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCameraActive(!isCameraActive);
                      }}
                      className={cn(
                        "p-2 rounded-xl transition-all z-50 relative border",
                        isCameraActive 
                          ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30" 
                          : "bg-white/10 hover:bg-blue-500/20 hover:text-blue-400 border-white/10 text-white"
                      )}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Close scanner"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeScanner();
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 transition-all z-50 relative text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Camera Viewer plugin */}
                {isCameraActive && (
                  <CameraScanner 
                    onScan={(text) => {
                       commitScan(text);
                       // Optional: prevent rapid duplicate scan by pausing briefly if needed
                       // but commitScan auto handles it decently.
                    }} 
                  />
                )}

                {/* Scan input area */}
                <form 
                  className="relative"
                  onSubmit={(e) => {
                    e.preventDefault();
                    commitScan(scanBuffer);
                  }}
                >
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    ref={scanInputRef}
                    type="search"
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    value={scanBuffer}
                    onChange={e => setScanBuffer(e.target.value)}
                    onKeyDown={handleScanKeyDown}
                    placeholder="Point scanner at barcode or type here..."
                    className="w-full h-14 pl-12 pr-4 text-sm font-mono font-bold bg-white/10 border-2 border-blue-400/40 rounded-xl text-white placeholder:text-blue-300/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 focus:ring-4 focus:ring-blue-500/20 transition-all [&::-webkit-search-cancel-button]:hidden"
                  />
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-[scan_2s_linear_infinite] opacity-70" />
                </form>

                {/* Current SNs for this row */}
                {currentSns.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {currentSns.map((sn, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-400/30 rounded-lg text-[11px] font-mono font-bold text-emerald-300"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {sn}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-[10px] text-blue-300/50 uppercase tracking-widest font-bold">
                  Manual entry also accepted · Scanner auto-commits on barcode trigger
                </p>
              </div>
            )
          })()}

          {/* ── Items Manifest (CSS Grid System) ── */}
          <div className="max-w-full border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
            
            {/* Header */}
            <div className={cn(
              "bg-slate-50/50 border-b border-slate-200 grid divide-x divide-slate-200",
              activeScannerItemId ? "grid-cols-[2fr_1fr_4fr]" : "grid-cols-[2fr_0.5fr_0.5fr_1fr_3fr]"
            )}>
              <div className="py-2.5 px-3 font-black uppercase text-[10px] tracking-widest text-slate-500 flex items-center gap-1.5 min-w-0 overflow-hidden">
                <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="truncate">Product</span>
              </div>
              {!activeScannerItemId && (
                <>
                  <div className="py-2.5 px-2 text-center font-black uppercase text-[10px] tracking-widest text-slate-500 flex items-center justify-center min-w-0 overflow-hidden">Ord</div>
                  <div className="py-2.5 px-2 text-center font-black uppercase text-[10px] tracking-widest text-slate-500 flex items-center justify-center min-w-0 overflow-hidden">Recvd</div>
                </>
              )}
              <div className="py-2.5 px-3 font-black uppercase text-[10px] tracking-widest text-slate-500 flex items-center gap-1.5 min-w-0 overflow-hidden">
                <Truck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="truncate">Freight</span>
              </div>
              <div className="py-2.5 px-3 font-black uppercase text-[10px] tracking-widest text-slate-500 flex items-center gap-1.5 min-w-0 overflow-hidden">
                <Landmark className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span className="truncate">SN/IMEI</span>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100">
              {po.items.map((item) => {
                const currentSns = serialNumbers[item.id]?.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== "") || []
                const itemHasDuplicate = currentSns.some(sn => duplicates.includes(sn))
                const isScanning = activeScannerItemId === item.id

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "grid divide-x divide-slate-100 transition-colors",
                      activeScannerItemId ? "grid-cols-[2fr_1fr_4fr]" : "grid-cols-[2fr_0.5fr_0.5fr_1fr_3fr]",
                      isScanning ? "bg-blue-50/40" : "hover:bg-slate-50/50"
                    )}
                  >
                    {/* Product */}
                    <div className="px-3 py-3 min-w-0 overflow-hidden">
                      <div className="font-black text-xs text-slate-900 leading-tight truncate" title={item.product.model_name}>
                        {item.product.model_name}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5 truncate">
                        {item.product.product_code}
                      </div>
                    </div>

                    {!activeScannerItemId && (
                      <>
                        {/* Ordered */}
                        <div className="px-2 text-center font-bold text-slate-900 text-sm flex items-center justify-center min-w-0">
                          {item.quantity}
                        </div>
                        {/* Received */}
                        <div className="px-2 text-center flex items-center justify-center min-w-0">
                          <div className="inline-flex flex-col items-center bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            <span className="text-sm font-black text-blue-700 leading-none">{item.received_quantity + currentSns.length}</span>
                            {currentSns.length > 0 && (
                              <span className="text-[8px] text-emerald-600 font-black mt-0.5">+{currentSns.length}</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Freight */}
                    <div className="px-3 py-3 min-w-0 flex items-center align-top pt-4">
                      <div className="relative group/freight w-full">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black tracking-tighter z-10">₹</span>
                        <Input
                          ref={(el) => { freightRefs.current[item.id] = el }}
                          type="number"
                          placeholder="0"
                          className={cn(
                            "h-9 text-[10px] pl-4 pr-1 border-slate-200 bg-slate-50/30 focus:bg-white focus:border-blue-500 text-slate-900 font-black rounded-lg transition-all min-w-0 w-full",
                            (parseFloat(freightCharges[item.id] || "0") + item.unit_price > (item.product.base_price || 0) * 5) && 
                            "border-amber-400 bg-amber-50 focus:border-amber-500"
                          )}
                          value={freightCharges[item.id] || ""}
                          max="1000000" // ₹10L freight cap per row
                          onPaste={(e) => {
                            const pasteData = e.clipboardData.getData('text').trim();
                            if (pasteData.length > 8 && /^\d+$/.test(pasteData)) {
                              e.preventDefault();
                              setToast({ message: "⚠️ Scanner detected in financial field. Manual entry required.", type: "error" });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+'].includes(e.key)) e.preventDefault();
                          }}
                          onFocus={() => activeScannerItemId && closeScanner()}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (parseFloat(val) > 1000000) return;
                            setFreightCharges({ ...freightCharges, [item.id]: val })
                          }}
                        />
                        {(parseFloat(freightCharges[item.id] || "0") + item.unit_price > (item.product.base_price || 0) * 5) && (
                          <div className="absolute -top-6 left-0 text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase flex items-center gap-1 animate-in fade-in zoom-in">
                            <ShieldAlert className="h-3 w-3" /> Integrity Check: Landed Cost abnormally high
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Serial Number / IMEI */}
                    <div className="px-3 py-3 min-w-0 break-all whitespace-normal align-top overflow-hidden">
                      <div className="relative group/field min-w-0 w-full h-full">
                        <Textarea
                          placeholder="SN/IMEI"
                          className={cn(
                            "min-h-[36px] h-full resize-none py-1.5 text-[10px] border-slate-200 bg-slate-50/30 focus:bg-white focus:border-blue-500 text-slate-900 font-bold rounded-lg pr-9 transition-all w-full min-w-0 block scrollbar-hide",
                            (itemHasDuplicate || (item.received_quantity + currentSns.length > item.quantity)) &&
                              "border-rose-500 bg-rose-50/50 focus:border-rose-600",
                            isScanning && "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10"
                          )}
                          value={serialNumbers[item.id] || ""}
                          onFocus={() => activeScannerItemId && closeScanner()}
                          onChange={(e) => setSerialNumbers({ ...serialNumbers, [item.id]: e.target.value })}
                        />
                        <button
                          type="button"
                          aria-label="Activate Barcode Scanner"
                          onClick={() => isScanning ? closeScanner() : openScanner(item.id)}
                          className={cn(
                            "absolute right-2 top-2 p-1.5 rounded-lg transition-all border shrink-0",
                            isScanning
                              ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30"
                              : "bg-slate-100 text-slate-400 border-slate-200 hover:text-blue-500 hover:bg-white group-hover/field:border-blue-200"
                          )}
                        >
                          <Barcode className={cn("h-3.5 w-3.5", isScanning && "animate-pulse")} />
                        </button>
                      </div>
                      {itemHasDuplicate && (
                        <p className="text-[9px] text-rose-600 font-black uppercase mt-1.5 px-0.5 flex items-center gap-1.5 truncate">
                          <XCircle className="h-3 w-3 shrink-0" /> Duplicate
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Condition Notes ── */}
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60 space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500/70" />
              Condition Notes / Internal Audit
            </Label>
            <Textarea
              placeholder="Describe physical condition, seal status, or any discrepancies for the audit trail..."
              className="min-h-[120px] bg-white border-slate-200 text-slate-900 text-sm focus:border-blue-500 ring-offset-white transition-all font-medium rounded-xl shadow-sm"
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
            />
          </div>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div className={cn(
            "fixed bottom-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300",
            toast.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
            toast.type === 'info'    ? "bg-blue-50 border-blue-200 text-blue-800" :
                                       "bg-rose-50 border-rose-200 text-rose-800"
          )}>
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> :
             toast.type === 'info'    ? <Barcode className="h-5 w-5 shrink-0" /> :
                                        <XCircle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="flex-shrink-0 gap-4 p-8 bg-slate-50/80 border-t border-slate-200/60 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="h-12 px-8 font-black uppercase text-[12px] tracking-widest border-slate-200 text-slate-600 hover:bg-white hover:text-rose-500 transition-all rounded-xl"
          >
            Discard
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[280px] h-12 px-8 font-black uppercase text-[12px] tracking-widest shadow-xl shadow-blue-500/20 rounded-xl transition-all"
            onClick={handleFinalize}
            disabled={isProcessing || duplicates.length > 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Processing Transaction...
              </>
            ) : duplicates.length > 0 ? (
              "Conflict Detected"
            ) : (
              "Commit to Inventory Sync"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
