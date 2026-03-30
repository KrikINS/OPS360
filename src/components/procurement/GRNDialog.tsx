"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
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

export function GRNDialog({ po, isOpen, onClose, onSuccess }: GRNDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [freightCharges, setFreightCharges] = useState<Record<string, string>>({})
  const [serialNumbers, setSerialNumbers] = useState<Record<string, string>>({})
  const [conditionNotes, setConditionNotes] = useState("")
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [duplicates, setDuplicates] = useState<string[]>([])

  // Scanner state
  const [activeScannerItemId, setActiveScannerItemId] = useState<string | null>(null)
  const [scanBuffer, setScanBuffer] = useState("")
  const [lastScannedCount, setLastScannedCount] = useState(0)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Per-row freight input refs for post-scan focus jump
  const freightRefs = useRef<Record<string, HTMLInputElement | null>>({})
  
  // Diagnostic logs for Safari/iPad debugging
  const [diagLog, setDiagLog] = useState<string>("")
  const [isScanningFile, setIsScanningFile] = useState(false)

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

  const closeScanner = useCallback(async () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop()
      }
      scannerRef.current = null
    }
    setActiveScannerItemId(null)
    setScanBuffer("")
  }, [])

  const startCamera = useCallback(async (itemId: string) => {
    // 1. Audio Context Kickstart (iOS hardware wake-up)
    // 1. Audio Context Kickstart (iOS hardware wake-up)
    try {
      const WinWithAudio = window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioCtx = window.AudioContext || WinWithAudio.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume();
      }
    } catch (e) { console.warn("Audio kickstart failed", e); }

    // 2. Set Active Item
    setScanBuffer("");
    setLastScannedCount(0);
    setActiveScannerItemId(itemId);

    // 3. Initialize Scanner
    setTimeout(async () => {
      try {
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) await scannerRef.current.stop();
          scannerRef.current = null;
        }

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          videoConstraints: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        try {
          // Primary Attempt: Exact back camera with high-res constraints
          await html5QrCode.start(
            config.videoConstraints,
            { fps: config.fps, qrbox: config.qrbox },
            (decodedText) => commitScan(decodedText),
            () => {}
          );
          setDiagLog("Success: Rear camera (exact) initialized.");
          setDiagLog("Success: Rear camera (exact) initialized.");
        } catch (err) {
          const errMsg = err instanceof Error ? err.name : String(err);
          setDiagLog(`Handshake 1 Failed: ${errMsg}`);
          // Fallback: Support older iPads or browsers that block exact constraints
          try {
            await html5QrCode.start(
              { facingMode: "environment" },
              { fps: config.fps, qrbox: config.qrbox },
              (decodedText) => commitScan(decodedText),
              () => {}
            );
            setDiagLog(prev => `${prev} -> Success: Rear camera (fallback) initialized.`);
          } catch (err2) {
            const err2Msg = err2 instanceof Error ? err2.name : String(err2);
            setDiagLog(prev => `${prev} -> Final Failure: ${err2Msg}`);
            throw err2;
          }
        }
      } catch (err) {
        console.error("Camera init failed:", err);
        const finalMsg = err instanceof Error ? err.name : "Camera blocked";
        setToast({ message: `Camera error (${finalMsg}) - manual entry only`, type: "error" });
        scannerRef.current = null;
      }
    }, 100); // Tiny delay to ensure wrapper div is mounted
  }, [commitScan]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeScannerItemId) return;
    
    setIsScanningFile(true);
    try {
      const html5QrCode = new Html5Qrcode("reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      commitScan(decodedText);
      setToast({ message: "Barcode successfully decoded from image", type: "success" });
    } catch (err) {
      console.error("File scan failed:", err);
      setToast({ message: "Could not find a valid barcode in that image. Try a clearer shot.", type: "error" });
    } finally {
      setIsScanningFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

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
      <DialogContent className="
        p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white/95 backdrop-blur-xl
        fixed inset-0 w-full h-[100dvh] max-w-none max-h-none rounded-none
        lg:inset-auto lg:relative lg:w-[95vw] lg:max-w-5xl lg:h-auto lg:min-h-[300px] lg:max-h-[95vh] lg:rounded-xl
        lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2
      ">
        
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
              <div className="absolute top-4 right-4 z-50 w-[380px] max-h-[35dvh] rounded-2xl border-2 border-blue-500 bg-[#001529] text-white p-5 shadow-2xl shadow-blue-900/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 md:max-h-[40vh] lg:max-h-none">
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
                      aria-label="Close scanner"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeScanner();
                      }}
                      className="p-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 border border-rose-500/50 shadow-lg shadow-rose-900/40 transition-all z-[60] relative flex items-center justify-center"
                    >
                      <X className="h-5 w-5 stroke-[3]" />
                    </button>
                  </div>
                </div>

                {/* Camera Viewfinder */}
                <div className="relative rounded-xl overflow-hidden bg-black border border-blue-500/30 mb-4 aspect-square">
                  <div id="reader" className="w-full h-full" />
                  {!scannerRef.current && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 p-6 text-center gap-3">
                      <XCircle className="h-8 w-8 text-rose-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-200">Camera Unavailable</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-black">Manual Entry Mode Active</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-900/40 border border-amber-400/50"
                      >
                        <ScanLine className="h-3.5 w-3.5" />
                        Reset Permissions &amp; Retry
                      </button>
                      <p className="text-[9px] text-slate-500 font-medium leading-tight max-w-[200px]">
                        Tap above to reload the page. Safari will re-prompt for camera access.
                      </p>

                      <div className="flex flex-col gap-2 mt-2 w-full px-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          title="Snap / Upload Barcode Image"
                          aria-label="Snap or upload a photo of the barcode"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isScanningFile}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40 border border-blue-400/30 disabled:opacity-50"
                        >
                          {isScanningFile ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Camera className="h-3.5 w-3.5" />
                          )}
                          Snap/Upload Photo
                        </button>
                        
                        {diagLog && (
                          <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-[8px] font-mono text-rose-300 text-left overflow-x-auto whitespace-nowrap scrollbar-hide opacity-40 hover:opacity-100 transition-opacity">
                            $ diag_log: {diagLog}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scan input area */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanBuffer}
                    onChange={e => setScanBuffer(e.target.value)}
                    onKeyDown={handleScanKeyDown}
                    placeholder="Point scanner at barcode · Press Enter to confirm"
                    className="w-full h-14 pl-12 pr-4 text-sm font-mono font-bold bg-white/10 border-2 border-blue-400/40 rounded-xl text-white placeholder:text-blue-300/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 focus:ring-4 focus:ring-blue-500/20 transition-all"
                  />
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-[scan_2s_linear_infinite] opacity-70" />
                </div>

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
                          onClick={() => isScanning ? closeScanner() : startCamera(item.id)}
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
