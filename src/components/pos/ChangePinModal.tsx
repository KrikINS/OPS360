"use client"

import React, { useState } from 'react'
import { X, ShieldAlert, Key } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { usePos } from '@/context/PosContext'
import { cn } from "@/lib/utils"

interface ChangePinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePinModal({ open, onOpenChange }: ChangePinModalProps) {
  const { updatePosPin, setToast } = usePos()
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [step, setStep] = useState(1) // 1: New PIN, 2: Confirm
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleKeyPress = (num: string) => {
    if (step === 1) {
      if (pin.length < 4) setPin(prev => prev + num)
    } else {
      if (confirmPin.length < 4) setConfirmPin(prev => prev + num)
    }
    setError(false)
  }

  const handleBackspace = () => {
    if (step === 1) {
      setPin(prev => prev.slice(0, -1))
    } else {
      setConfirmPin(prev => prev.slice(0, -1))
    }
    setError(false)
  }

  const handleNext = () => {
    if (pin.length === 4) {
      setStep(2)
    }
  }

  const handleSubmit = async () => {
    if (pin !== confirmPin) {
      setError(true)
      setConfirmPin("")
      return
    }

    setLoading(true)
    const result = await updatePosPin(pin)
    setLoading(false)

    if (result.success) {
      setToast({ message: "Security PIN Updated", type: 'success' })
      handleClose()
    } else {
      setToast({ message: result.error || "Update Failed", type: 'error' })
    }
  }

  const handleClose = () => {
    setPin("")
    setConfirmPin("")
    setStep(1)
    setError(false)
    onOpenChange(false)
  }

  const currentVal = step === 1 ? pin : confirmPin

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] bg-slate-900 border-white/10 text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-lg">
              <Key className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight">Security PIN</DialogTitle>
              <DialogDescription className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                {step === 1 ? "Set your 4-digit terminal code" : "Confirm terminal code"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          {/* PIN Dots */}
          <div className="flex justify-center gap-4">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-all duration-200",
                  error ? "border-rose-500 bg-rose-500/20 animate-shake" :
                  currentVal.length > i ? "bg-blue-500 border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : 
                  "border-slate-700 bg-transparent"
                )}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <Button 
                key={num}
                variant="outline"
                className="h-14 bg-white/5 border-white/10 text-white font-black text-xl rounded-2xl hover:bg-white/10 active:scale-90 transition-all border-none"
                onClick={() => handleKeyPress(num)}
              >
                {num}
              </Button>
            ))}
            <Button 
              variant="ghost" 
              className="h-14 text-slate-500 font-bold hover:text-white"
              onClick={() => step === 1 ? setPin("") : setConfirmPin("")}
            >
              CLR
            </Button>
            <Button 
              variant="outline"
              className="h-14 bg-white/5 border-white/10 text-white font-black text-xl rounded-2xl hover:bg-white/10 active:scale-90 transition-all border-none"
              onClick={() => handleKeyPress("0")}
            >
              0
            </Button>
            <Button 
              variant="ghost" 
              className="h-14 text-slate-500 hover:text-white"
              onClick={handleBackspace}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-rose-400 animate-in slide-in-from-top-2">
              <ShieldAlert className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Codes do not match</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-white/5 border-t border-white/10">
          {step === 1 ? (
            <Button 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest"
              onClick={handleNext}
              disabled={pin.length < 4}
            >
              Continue
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline"
                className="flex-1 h-12 border-white/10 text-slate-400 hover:text-white font-black uppercase tracking-widest"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button 
                className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest"
                onClick={handleSubmit}
                disabled={confirmPin.length < 4 || loading}
              >
                {loading ? "Saving..." : "Setup access"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
