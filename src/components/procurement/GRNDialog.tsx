"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
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
  Landmark, FileText, Barcode, Zap, X, ShieldAlert, Camera, RefreshCw, Target
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

// Global Audio Context for scanner feedback (shared to avoid multiple instances)
let audioCtx: AudioContext | null = null;
const initAudio = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
};

const playBeep = (freq: number, duration: number, volume = 0.1) => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration/1000);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration/1000);
};

const playSuccessBeep = () => playBeep(800, 100, 0.2);
const playErrorBeep = () => {
  playBeep(200, 150, 0.3);
  setTimeout(() => playBeep(200, 150, 0.3), 200);
};

function CameraScanner({ onScan, onClose, isDuplicate }: { onScan: (text: string) => void, onClose: () => void, isDuplicate: (text: string) => boolean }) {
  const containerId = "grn-full-viewfinder";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCamIdx, setActiveCamIdx] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isBackCamera, setIsBackCamera] = useState(false);

  // Memoize static configs
  const config = useMemo(() => ({ 
    fps: 20, 
    qrbox: { width: 300, height: 150 },
    aspectRatio: window.innerWidth / window.innerHeight,
    videoConstraints: {
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  }), []);

  const formatsToSupport = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 14, 15, 16], []);

  const startCamera = useCallback(async (deviceId?: string) => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    if (scanner.isScanning) return; // Fix: De-bounce the Request

    setIsInitializing(true);

    try {
      const isBack = cameras.find(c => c.id === deviceId)?.label.toLowerCase().match(/back|rear|environment/) || !deviceId;
      setIsBackCamera(!!isBack);

      // Fix: iOS Safari OverconstrainedError Mitigation
      // Pass the raw deviceId string instead of { deviceId: { exact: ... } } to let html5-qrcode resolve it cleanly.
      const cameraParam = deviceId ? deviceId : { video: true };

      await scanner.start(
        cameraParam,
        config,
        (decodedText: string) => {
          if (decodedText) {
            const raw = decodedText.trim().toUpperCase();
            if (isDuplicate(raw)) {
              playErrorBeep();
              // Don't close or flash green, let user see it failed
              return;
            }

            setShowFlash(true);
            playSuccessBeep();
            onScan(raw);
            setTimeout(() => {
              setShowFlash(false);
              onClose();
            }, 500);
          }
        },
        () => {} // silent frame error
      );
      
      const track = scanner.getRunningTrack();
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        setHasTorch(!!capabilities.torch && !!isBack);
      } else {
        setHasTorch(false);
      }
      setIsTorchOn(false);

    } catch (err) {
      console.error("Failed to start camera:", err);
      // Fix: Clear State on Error
      scanner.clear();

      try {
        setIsBackCamera(false);
        await scanner.start({ facingMode: "user" }, config, (txt: string) => onScan(txt.trim()), () => {});
      } catch (err2) {
         console.error("Fallback camera failed:", err2);
         scanner.clear();
      }
    } finally {
      setIsInitializing(false);
    }
  }, [config, onScan, onClose, cameras, isDuplicate]);

  useEffect(() => {
    let isMounted = true;
    import("html5-qrcode").then((mod) => {
      if (!isMounted) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scannerRef.current = new mod.Html5Qrcode(containerId, { formatsToSupport } as any);
    });

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop()
          .then(() => scannerRef.current.clear())
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .catch((e: any) => console.error("Scanner cleanup error:", e));
      }
    };
  }, [formatsToSupport]);

  const handleStartScanning = async () => {
    setHasStarted(true);
    setIsInitializing(true);
    
    try {
      const mod = await import("html5-qrcode");
      // 1. getCameras() natively requests initial generic permission to retrieve hardware labels, resolving iPad loop securely.
      const devices = await mod.Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        const mapped = devices.map((d, i) => ({ id: d.id, label: d.label || `Camera ${i + 1}` }));
        setCameras(mapped);
        
        // 2. Prioritize Rear/Environment Lens instantly
        const backIdx = mapped.findIndex(d => /back|rear|environment/i.test(d.label));
        const targetIdx = backIdx >= 0 ? backIdx : 0;
        setActiveCamIdx(targetIdx);
        
        // 3. Start scanning with definitively correct target
        await startCamera(mapped[targetIdx].id);
        return;
      }
    } catch (err) {
      console.warn("Failed hardware enumeration, defaulting to generic fallback:", err);
    }
    
    // Fallback if device blocks enumeration or rejects
    await startCamera();
  };

  const manuallySelectCamera = async (targetId: string) => {
    if (!scannerRef.current) return;
    const idx = cameras.findIndex(c => c.id === targetId);
    if (idx >= 0) {
      setActiveCamIdx(idx);
      if (scannerRef.current.isScanning) {
          await scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
      }
      await startCamera(targetId);
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch || !isBackCamera) return;
    try {
      const newState = !isTorchOn;
      const track = scannerRef.current.getRunningTrack();
      if (track) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ torch: newState }] } as any);
        setIsTorchOn(newState);
      }
    } catch (err) { console.error("Torch error:", err); }
  };

  const triggerFocus = async () => {
    if (!scannerRef.current) return;
    try {
      const track = scannerRef.current.getRunningTrack();
      if (track) {
        // Kickstart/Shake: Cycle focus mode to force hardware to re-focus
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ focusMode: "manual", focusDistance: 100 }] as any });
        setTimeout(async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] as any });
        }, 150);
      }
    } catch (err) { console.error("Focus error:", err); }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden animate-in fade-in zoom-in-95 duration-200 h-[100dvh] w-screen m-0 p-4 md:p-8">
      
      {/* Centered Modal Container for the Scanner */}
      <div className="relative w-full max-w-md h-[65dvh] md:max-h-[600px] bg-black rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-900/10 border border-white/10 ring-1 ring-white/5">
        
        {/* Visual Emerald Flash on Scan Success */}
        {showFlash && <div className="absolute inset-0 bg-emerald-500/60 z-[120] animate-in fade-in zoom-in duration-150 backdrop-blur-sm" />}
        
        {/* 1. Underlying Core Scanner DOM Element - MUST ALWAYS BE MOUNTED FOR HTML5QRCODE */}
        <div id={containerId} className="absolute inset-0 w-full h-full object-cover" />

        {/* Explicit User Tap Overlay */}
        {!hasStarted && (
          <div className="absolute inset-0 z-[130] bg-slate-900/95 flex flex-col items-center justify-center backdrop-blur-md">
            <button
              onClick={handleStartScanning}
              className="bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-3xl shadow-xl shadow-blue-500/20 flex flex-col items-center gap-3 transition-all active:scale-95"
            >
              <Camera className="h-10 w-10 animate-pulse text-blue-100" />
              <span className="font-black tracking-widest uppercase text-lg">Start Scanner</span>
              <span className="text-xs text-blue-200 font-medium max-w-[200px] text-center">Tap to initialize lens</span>
            </button>
            <button 
              onClick={onClose} 
              title="Close Scanner"
              className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Sub-UI elements wrapper (Only visible when started) */}
        <div className={cn("absolute inset-0 pointer-events-none", !hasStarted && "hidden")}>

          {/* 2. Target Frame Overlay (Uses massive box-shadow to darken surroundings) */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none pb-8">
            <div className="w-[65%] aspect-square max-w-[250px] border-2 border-white/30 rounded-3xl relative overflow-hidden shadow-[0_0_0_4000px_rgba(0,0,0,0.5)]">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
              {/* Scanning line */}
              <div className="absolute inset-x-0 h-0.5 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,1)] animate-[scan_2s_linear_infinite]" />
            </div>
            <div className="mt-6 flex flex-col items-center gap-1.5 opacity-90">
              <span className="bg-black/60 backdrop-blur text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/10 shadow-lg">
                Align Barcode inside frame
              </span>
            </div>
          </div>

          {/* 3. Top Control Bar */}
          <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-5">
            <div className="flex flex-col gap-0.5 pl-1">
              <span className="text-[9px] font-black text-blue-400/90 uppercase tracking-widest drop-shadow-lg">
                {isInitializing ? "Initializing" : "Vision Active"}
              </span>
              <span className="text-white/90 font-bold text-xs drop-shadow-md truncate max-w-[120px]">
                {cameras[activeCamIdx]?.label || "Ready to capture"}
              </span>
            </div>
            <div className="flex items-center gap-2 pr-1 pointer-events-auto">
              {hasTorch && (
                <button
                  onClick={toggleTorch}
                  title="Toggle Flashlight"
                  className={cn(
                    "p-2.5 rounded-full backdrop-blur-md transition-all border",
                    isTorchOn 
                      ? "bg-amber-400 text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]" 
                      : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                  )}
                >
                  <Zap className={cn("h-4 w-4", isTorchOn && "fill-current")} />
                </button>
              )}
              {cameras.length > 1 && (
                <div className="relative group">
                  <select
                    title="Select Camera"
                    className="appearance-none bg-white/10 backdrop-blur-md border border-white/10 text-white/90 hover:bg-white/20 transition-all rounded-full pl-3 pr-8 py-2 text-[10px] font-bold tracking-widest uppercase max-w-[130px] sm:max-w-[160px] truncate outline-none cursor-pointer text-center shadow-lg"
                    value={cameras[activeCamIdx]?.id || ""}
                    onChange={(e) => manuallySelectCamera(e.target.value)}
                  >
                    {cameras.map((c, i) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white font-sans normal-case tracking-normal">
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                    <RefreshCw className="h-3 w-3" />
                  </div>
                </div>
              )}
              <button 
                onClick={triggerFocus} 
                title="Focus Camera"
                className="p-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all"
              >
                <Target className="h-4 w-4" />
              </button>
              <div className="w-px h-6 bg-white/20 mx-1" />
              <button 
                onClick={onClose} 
                title="Close Scanner"
                className="p-2.5 rounded-full bg-rose-500/90 hover:bg-rose-500 border border-rose-400/50 text-white shadow-lg shadow-rose-900/20 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div> {/* End Sub-UI wrapper */}
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

    // Check for duplicates globally across all rows
    const allSns = Object.values(serialNumbers).flatMap(snStr => 
      snStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    )

    if (allSns.includes(scanned)) {
      playErrorBeep();
      setToast({ message: `❌ Duplicate detected: ${scanned}`, type: "error" });
      return;
    }

    playSuccessBeep();
    setSerialNumbers(prev => {
      const existing = prev[itemId]?.trim() || ""
      const newVal = existing ? `${existing}, ${scanned}` : scanned
      return { ...prev, [itemId]: newVal }
    })

    setToast({ message: `✓ Scanned: ${scanned}`, type: "info" })

    // Auto-focus the Freight field for this row after scan
    setTimeout(() => {
      freightRefs.current[itemId]?.focus()
      freightRefs.current[itemId]?.select()
    }, 120)
  }, [activeScannerItemId, serialNumbers])

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitScan(scanBuffer)
    }
  }

  const openScanner = (itemId: string) => {
    initAudio()
    setScanBuffer("")
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

          {/* ── Full Screen Scanner Overlay ── */}
          {activeScannerItemId && isCameraActive && (
            <CameraScanner 
              onScan={(text) => {
                 commitScan(text);
              }} 
              isDuplicate={(text) => {
                return Object.values(serialNumbers).some(snStr => 
                  snStr.split(',').map(s => s.trim().toUpperCase()).includes(text)
                );
              }}
              onClose={() => setIsCameraActive(false)}
            />
          )}

          {/* ── Horizontal Notification Bar (Post-Scan) ── */}
          {activeScannerItemId && !isCameraActive && (() => {
            const activeItem = po.items.find(i => i.id === activeScannerItemId)
            const currentSns = serialNumbers[activeScannerItemId]?.split(',').map(s => s.trim()).filter(s => s !== "") || []
            return (
              <div className="bg-[#001529] border-2 border-blue-500/30 rounded-2xl p-5 shadow-xl animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
                      <Barcode className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-blue-300/60">Manual Entry Active</p>
                      <h4 className="text-sm font-black text-white">{activeItem?.product.model_name}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        initAudio();
                        setIsCameraActive(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 h-9 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                    >
                      <Camera className="h-3.5 w-3.5 mr-2" /> Launch Lens
                    </Button>
                    <button 
                      onClick={closeScanner} 
                      title="Discard and Close"
                      className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => { e.preventDefault(); commitScan(scanBuffer); }}
                  className="relative"
                >
                  <input
                    ref={scanInputRef}
                    type="search"
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off" autoCapitalize="characters" spellCheck="false"
                    value={scanBuffer}
                    onChange={e => setScanBuffer(e.target.value)}
                    onKeyDown={handleScanKeyDown}
                    placeholder="Type serial or use gun scanner..."
                    className="w-full h-12 pl-4 pr-12 text-sm font-mono font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-400 focus:bg-white/10 transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400/50 uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md">
                    Enter
                  </div>
                </form>

                {currentSns.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {currentSns.map((sn, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-mono font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> {sn}
                      </span>
                    ))}
                  </div>
                )}
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
