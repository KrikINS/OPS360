"use client"

import React, { useState, useEffect } from 'react'
import { Lock, Unlock, ShieldAlert, KeyRound } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { usePos } from '@/context/PosContext'
import { cn } from "@/lib/utils"

export function TerminalLockOverlay() {
  const { isLocked, setIsLocked, branchName } = usePos()
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    if (!isLocked) return
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [isLocked])

  if (!isLocked) return null

  const handleUnlock = () => {
    // Current requirement: "current user re-entering their PIN or Password"
    // For demo: hardcoded to 1234
    if (pin === "1234") {
      setIsLocked(false)
      setPin("")
      setError(false)
    } else {
      setError(true)
      setPin("")
      // Shake effect usually goes here
    }
  }

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num)
      setError(false)
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-2xl transition-all duration-500 animate-in fade-in">
      <div className="absolute top-12 flex flex-col items-center gap-2">
        <div className="bg-blue-600 p-4 rounded-full shadow-2xl shadow-blue-500/20 mb-4 animate-bounce">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase tabular-nums">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-blue-300 font-bold tracking-widest uppercase text-xs">
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="w-[320px] space-y-8 mt-12">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Terminal Locked</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{branchName} • Hardware Secure</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className={cn(
                "h-4 w-4 rounded-full border-2 transition-all duration-200",
                error ? "border-rose-500 bg-rose-500/20 animate-shake" :
                pin.length > i ? "bg-blue-500 border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : 
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
              className="h-14 bg-white/5 border-white/10 text-white font-black text-xl rounded-2xl hover:bg-white/10 active:scale-90 transition-all"
              onClick={() => handleKeyPress(num)}
            >
              {num}
            </Button>
          ))}
          <Button 
            variant="ghost" 
            className="h-14 text-slate-400 font-black"
            onClick={() => setPin("")}
          >
            CLR
          </Button>
          <Button 
            variant="outline"
            className="h-14 bg-white/5 border-white/10 text-white font-black text-xl rounded-2xl hover:bg-white/10 active:scale-90 transition-all"
            onClick={() => handleKeyPress("0")}
          >
            0
          </Button>
          <Button 
            variant="ghost" 
            className="h-14 text-slate-400"
            onClick={handleBackspace}
          >
            ←
          </Button>
        </div>

        <Button 
          className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 group"
          onClick={handleUnlock}
          disabled={pin.length < 4}
        >
          <Unlock className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform" />
          Authorize Unlock
        </Button>

        {error && (
          <div className="flex items-center justify-center gap-2 text-rose-400 animate-in slide-in-from-top-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Invalid Security PIN</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-12 text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
        <KeyRound className="h-3 w-3" />
        Encrypted Terminal Access Only
      </div>
    </div>
  )
}
