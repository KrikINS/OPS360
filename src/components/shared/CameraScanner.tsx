"use client"

import { useState, useRef, useCallback, useLayoutEffect, useMemo } from "react"
import { Zap, X, Camera, Target, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// Audio singleton — defined at module level, only accessed inside effects
let audioCtx: AudioContext | null = null

const getAudioCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

const playBeep = (freq: number, duration: number, volume = 0.1) => {
  const ctx = getAudioCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration / 1000)
}

export const playSuccessBeep = () => playBeep(800, 100, 0.2)
export const playErrorBeep = () => {
  playBeep(200, 150, 0.3)
  setTimeout(() => playBeep(200, 150, 0.3), 200)
}

interface CameraScannerProps {
  onScan: (serial: string) => void
  onClose: () => void
  isDuplicate?: (serial: string) => boolean
}

const CONTAINER_ID = "shared-camera-scanner-viewfinder"

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))

export function CameraScanner({ onScan, onClose, isDuplicate }: CameraScannerProps) {
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const isStopping = useRef(false)
  const lastScanRef = useRef<{ value: string; time: number }>({ value: "", time: 0 })
  const isProcessingRef = useRef(false)
  const SCAN_COOLDOWN_MS = 2000
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [activeCamIdx, setActiveCamIdx] = useState(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isTorchOn, setIsTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const [isBackCamera, setIsBackCamera] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const formatsToSupport = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 14, 15, 16], [])

  const safeStop = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner || isStopping.current) return
    isStopping.current = true
    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
      scanner.clear()
    } catch {
      // ignore stop errors
    } finally {
      isStopping.current = false
      lastScanRef.current = { value: "", time: 0 }
      isProcessingRef.current = false
    }
  }, [])

  // Initialize scanner instance after DOM paint
  useLayoutEffect(() => {
    let cancelled = false
    const frame = requestAnimationFrame(() => {
      if (cancelled) return
      import("html5-qrcode").then((mod) => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scannerRef.current = new mod.Html5Qrcode(CONTAINER_ID, { verbose: false, formatsToSupport } as any)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      safeStop()
    }
  }, [formatsToSupport, safeStop])

  const detectTorch = useCallback((scanner: import('html5-qrcode').Html5Qrcode, isBack: boolean) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scannerAny = scanner as any
      if (typeof scannerAny.getRunningTrack === "function") {
        const track = scannerAny.getRunningTrack()
        const caps = track?.getCapabilities?.()
        setHasTorch(!!caps?.torch && isBack)
      } else {
        setHasTorch(false)
      }
    } catch {
      setHasTorch(false)
    }
    setIsTorchOn(false)

    // best-effort: request continuous autofocus for sharper 1D barcode reads
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scannerAny2 = scanner as any
      const track2 = typeof scannerAny2.getRunningTrack === "function" ? scannerAny2.getRunningTrack() : null
      if (track2?.applyConstraints) {
        track2.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as unknown as MediaTrackConstraints).catch(() => { })
      }
    } catch { /* ignore */ }
  }, [])

  const handleDecode = useCallback((decodedText: string) => {
    if (!decodedText) return
    if (isProcessingRef.current) return

    const raw = decodedText.trim().toUpperCase()
    const now = Date.now()

    // ignore identical re-scan within cooldown
    if (raw === lastScanRef.current.value && now - lastScanRef.current.time < SCAN_COOLDOWN_MS) {
      return
    }
    lastScanRef.current = { value: raw, time: now }

    if (isDuplicate && isDuplicate(raw)) {
      playErrorBeep()
      return
    }

    isProcessingRef.current = true
    playSuccessBeep()
    setShowFlash(true)
    setTimeout(() => {
      setShowFlash(false)
      onScan(raw)
      isProcessingRef.current = false
    }, 400)
  }, [isDuplicate, onScan])

  const startCameraByFacingMode = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner || scanner.isScanning) return

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        // Wide strip favors 1D barcodes; height stays tall enough for QR to fit.
        const boxWidth = Math.floor(viewfinderWidth * 0.85)
        const boxHeight = Math.floor(Math.min(viewfinderHeight * 0.6, boxWidth * 0.55))
        return { width: boxWidth, height: boxHeight }
      },
      aspectRatio: window.innerWidth / window.innerHeight,
      disableFlip: false,
      videoConstraints: {
        facingMode: { ideal: "environment" },
        width: { ideal: 2560 },
        height: { ideal: 1440 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        focusMode: "continuous" as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        advanced: [{ focusMode: "continuous" }] as any,
      },
    }

    setIsInitializing(true)
    const attempts: (string | MediaTrackConstraints)[] = [
      { facingMode: { exact: "environment" } } as unknown as MediaTrackConstraints,
      { facingMode: "environment" } as unknown as MediaTrackConstraints,
    ]

    for (const cam of attempts) {
      try {
        if (scanner.isScanning) break
        await scanner.start(cam, config, handleDecode, () => { })
        setIsBackCamera(true)
        detectTorch(scanner, true)
        setIsInitializing(false)
        return
      } catch {
        // try next attempt
      }
    }

    // fallback: first enumerated device, else user-facing
    try {
      if (!scanner.isScanning && cameras.length > 0) {
        await scanner.start(cameras[0].id, config, handleDecode, () => { })
        const isBack = /back|rear|environment/i.test(cameras[0].label)
        setIsBackCamera(isBack)
        detectTorch(scanner, isBack)
        setIsInitializing(false)
        return
      }
    } catch { /* continue */ }

    try {
      if (!scanner.isScanning) {
        await scanner.start({ facingMode: "user" } as unknown as string, config, handleDecode, () => { })
        setIsBackCamera(false)
        setHasTorch(false)
        setIsInitializing(false)
      }
    } catch (err) {
      const msg = String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setPermissionDenied(true)
      }
      setIsInitializing(false)
    }
  }, [cameras, detectTorch, handleDecode])

  const startCamera = useCallback(async (deviceId?: string) => {
    const scanner = scannerRef.current
    if (!scanner) return
    if (scanner.isScanning) return

    const aspectRatio = window.innerWidth / window.innerHeight

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        // Wide strip favors 1D barcodes; height stays tall enough for QR to fit.
        const boxWidth = Math.floor(viewfinderWidth * 0.85)
        const boxHeight = Math.floor(Math.min(viewfinderHeight * 0.6, boxWidth * 0.55))
        return { width: boxWidth, height: boxHeight }
      },
      aspectRatio,
      disableFlip: false,
      videoConstraints: {
        facingMode: { ideal: "environment" },
        width: { ideal: 2560 },
        height: { ideal: 1440 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        focusMode: "continuous" as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        advanced: [{ focusMode: "continuous" }] as any,
      }
    }

    setIsInitializing(true)

    try {
      const isBack = !deviceId || cameras.find(c => c.id === deviceId)?.label.toLowerCase().match(/back|rear|environment/)
      setIsBackCamera(!!isBack)

      const cameraParam: string | MediaTrackConstraints = deviceId
        ? deviceId
        : ({ video: true } as unknown as MediaTrackConstraints)

      await scanner.start(
        cameraParam,
        config,
        handleDecode,
        () => { }
      )

      detectTorch(scanner, !!isBack)
    } catch (err: unknown) {
      const msg = String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setPermissionDenied(true)
      } else {
        // fallback to generic camera
        if (!deviceId) {
          try {
            setIsBackCamera(false)
            if (!scanner.isScanning) {
              await scanner.start(
                { facingMode: "user" } as unknown as string,
                config,
                handleDecode,
                () => { }
              )
            }
          } catch {
            // silent
          }
        }
      }
    } finally {
      setIsInitializing(false)
    }
  }, [cameras, detectTorch, handleDecode])

  const handleStartScanning = async () => {
    setHasStarted(true)
    setIsInitializing(true)

    try {
      const mod = await import("html5-qrcode")
      try {
        const devices = await mod.Html5Qrcode.getCameras()
        if (devices && devices.length > 0) {
          setCameras(devices.map((d, i) => ({ id: d.id, label: d.label || `Camera ${i + 1}` })))
        }
      } catch {
        // enumeration can fail before permission; ignore
      }
      await startCameraByFacingMode()
    } catch {
      await startCamera()
    }
  }

  const manuallySelectCamera = async (targetId: string) => {
    if (!scannerRef.current) return
    const idx = cameras.findIndex(c => c.id === targetId)
    if (idx < 0) return
    setActiveCamIdx(idx)
    setIsInitializing(true)
    if (scannerRef.current.isScanning) {
      await scannerRef.current.stop().catch(() => { })
      scannerRef.current.clear()
    }
    const label = cameras[idx]?.label || ""
    const wantsBack = /back|rear|wide|environment/i.test(label)
    setTimeout(() => {
      if (isIOS() && wantsBack) {
        startCameraByFacingMode()
      } else {
        startCamera(targetId)
      }
    }, 500)
  }

  const toggleTorch = async () => {
    const scanner = scannerRef.current
    if (!scanner || !hasTorch || !isBackCamera) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scannerAny = scanner as any
      if (typeof scannerAny.getRunningTrack !== "function") return
      const track = scannerAny.getRunningTrack()
      if (!track) return
      const newState = !isTorchOn
      await track.applyConstraints({ advanced: [{ torch: newState }] } as unknown as MediaTrackConstraints)
      setIsTorchOn(newState)
    } catch { /* ignore */ }
  }

  const triggerFocus = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scannerAny = scanner as any
      if (typeof scannerAny.getRunningTrack !== "function") return
      const track = scannerAny.getRunningTrack()
      if (!track) return
      await track.applyConstraints({ advanced: [{ focusMode: "manual", focusDistance: 100 }] } as unknown as MediaTrackConstraints)
      setTimeout(async () => {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as unknown as MediaTrackConstraints)
      }, 150)
    } catch { /* ignore */ }
  }

  if (permissionDenied) {
    return (
      <div className="sticky bottom-0 left-0 right-0 z-[110] w-full flex justify-center">
        <div className="relative w-full max-w-2xl bg-slate-900 rounded-t-3xl p-8 border border-white/10 flex flex-col items-center justify-center text-center gap-4">
          <X className="h-8 w-8 mx-auto mb-3 text-rose-400" />
          <p className="font-bold text-sm">Camera permission denied.</p>
          <p className="text-xs text-rose-300/70 mt-1">Please allow camera access in your browser settings and try again.</p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 z-[110] w-full flex justify-center pointer-events-none">
      <div className="relative w-full max-w-2xl h-[42dvh] max-h-[380px] bg-black rounded-t-3xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 ring-1 ring-white/5 pointer-events-auto">

        {/* Green flash on success */}
        {showFlash && (
          <div className="absolute inset-0 bg-emerald-500/60 z-[120] animate-in fade-in duration-150" />
        )}

        {/* Scanner DOM target — always mounted */}
        <div id={CONTAINER_ID} className="absolute inset-0 w-full h-full" />

        {/* Start tap overlay */}
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

        {/* Controls shown after scanning starts */}
        <div className={cn("absolute inset-0 pointer-events-none", !hasStarted && "hidden")}>

          {/* Target frame */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none pb-2">
            <div className="w-[85%] max-w-[420px] h-[40%] max-h-[150px] border-2 border-white/30 rounded-2xl relative overflow-hidden shadow-[0_0_0_4000px_rgba(0,0,0,0.45)]">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
              {/* Scanning line using inline style animation to avoid relying on custom Tailwind keyframes */}
              <div
                className="absolute inset-x-0 h-0.5 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,1)]"
                style={{ animation: "scanner-line 2s linear infinite" }}
              />
            </div>
            <div className="mt-3 flex flex-col items-center gap-1.5 opacity-90">
              <span className="bg-black/60 backdrop-blur text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/10 shadow-lg">
                Align Barcode inside frame
              </span>
            </div>
          </div>

          {/* Top control bar */}
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
              {hasTorch && isBackCamera && (
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
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
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
        </div>
      </div>

      {/* Inline keyframe for scanning line */}
      <style>{`
        @keyframes scanner-line {
          0%   { top: 0%; }
          50%  { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  )
}
