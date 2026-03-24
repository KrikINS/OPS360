import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Settings, User, Home, LayoutGrid, Maximize, Minimize, Lock, BarChart3 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { BranchSwitcher } from './BranchSwitcher'
import { usePos } from '@/context/PosContext'
import { usePosHotkeys } from '@/hooks/usePosHotkeys'

export function PosHeader() {
  const router = useRouter()
  const { userRole, setIsLocked } = usePos()
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const handleExit = () => router.push('/')
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  usePosHotkeys([
    { key: 'escape', action: handleExit },
    { key: 'f', ctrl: true, alt: true, action: toggleFullscreen },
    { key: 'l', ctrl: true, action: () => setIsLocked(true) }
  ])

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[#001529] text-white shrink-0 shadow-lg z-20">
      <div className="flex items-center gap-6">
        {/* Exit Toggle */}
        <div className="flex items-center gap-2">
          {userRole === 'admin' ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExit}
              className="bg-white/5 border-white/10 hover:bg-white/20 text-white gap-2 h-10 px-3 rounded-xl transition-all active:scale-95"
            >
              <LayoutGrid className="h-4 w-4 text-blue-400" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Exit (ESC)</span>
              </div>
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleExit}
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              <Home className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">Retail-Fast</h1>
            <p className="text-[10px] text-blue-300 font-bold tracking-widest uppercase">POS Terminal v3.0</p>
          </div>
        </div>
        
        <div className="h-8 w-px bg-white/10 hidden md:block" />
        
        <BranchSwitcher />

        <div className="h-8 w-px bg-white/10 hidden md:block" />

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => window.open('/admin/sales-registry', '_blank')}
          className="text-slate-400 hover:text-white hover:bg-white/10 gap-2 h-10 px-3 rounded-xl transition-all"
        >
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          <div className="flex flex-col items-start leading-none hidden md:flex">
            <span className="text-[10px] font-black uppercase tracking-widest text-left">Registry</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Sales Audit</span>
          </div>
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsLocked(true)}
          className="text-slate-400 hover:text-white hover:bg-white/10 ml-2"
          title="Lock Terminal (Ctrl+L)"
        >
          <Lock className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black border border-white/20">ALT+S</kbd>
            <span className="text-[10px] font-bold text-slate-400">SEARCH</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black border border-white/20">ALT+N</kbd>
            <span className="text-[10px] font-bold text-slate-400">CUSTOMER</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black border border-white/20">ALT+↵</kbd>
            <span className="text-[10px] font-bold text-slate-400">CHECKOUT</span>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleFullscreen}
          className="text-slate-400 hover:text-white hover:bg-white/10"
          title={isFullscreen ? "Exit Fullscreen (Ctrl+Alt+F)" : "Enter Fullscreen (Ctrl+Alt+F)"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5 text-blue-400" /> : <Maximize className="h-5 w-5" />}
        </Button>

        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10">
          <Settings className="h-5 w-5" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border-2 border-white/20 cursor-pointer">
          <User className="h-4 w-4 text-white" />
        </div>
      </div>
    </header>
  )
}
