import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Zap, Settings, User, Home, LayoutGrid, Maximize, Minimize, 
  Lock, History, Printer, Monitor, Moon, Sun, Keyboard, LogOut, Key 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { BranchSwitcher } from './BranchSwitcher'
import { usePos } from '@/context/PosContext'
import { usePosHotkeys } from '@/hooks/usePosHotkeys'
import { PosSalesHistoryDrawer } from './PosSalesHistoryDrawer'
import { ChangePinModal } from './ChangePinModal'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

export function PosHeader() {
  const router = useRouter()
  const { 
    userRole, 
    setIsLocked, 
    setToast, 
    printerType, 
    setPrinterType, 
    isDarkMode, 
    setIsDarkMode, 
    sessionUser, 
    sessionStats, 
    logout,
    refreshSessionStats 
  } = usePos()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pinModalOpen, setPinModalOpen] = useState(false)

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      }
      setIsFullscreen(!!(
        doc.fullscreenElement || 
        doc.webkitFullscreenElement || 
        doc.mozFullScreenElement || 
        doc.msFullscreenElement
      ))
    }
    
    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    document.addEventListener('mozfullscreenchange', handleFsChange)
    document.addEventListener('MSFullscreenChange', handleFsChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
      document.removeEventListener('mozfullscreenchange', handleFsChange)
      document.removeEventListener('MSFullscreenChange', handleFsChange)
    }
  }, [])

  const handleExit = () => router.push('/')
  
  const toggleFullscreen = () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    }
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    }
    
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement)
    
    if (!isFs) {
      try {
        if (el.requestFullscreen) {
          el.requestFullscreen()
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen()
        } else if (el.mozRequestFullScreen) {
          el.mozRequestFullScreen()
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen()
        } else {
          setToast({ message: "Fullscreen not supported by your browser", type: "error" })
        }
      } catch (err) {
        console.error('Fullscreen request failed:', err)
        setToast({ message: "Fullscreen request was blocked", type: "error" })
      }
    } else {
      try {
        if (doc.exitFullscreen) {
          doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen()
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen()
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen()
        }
      } catch (err) {
        console.error('Exit fullscreen failed:', err)
      }
    }
  }

  usePosHotkeys([
    { key: 'escape', action: handleExit },
    { key: 'f', ctrl: true, alt: true, action: toggleFullscreen },
    { key: 'l', ctrl: true, action: () => setIsLocked(true) },
    { key: 'h', ctrl: true, action: () => setHistoryOpen(true) }
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
              <LayoutGrid className="h-4 w-4 text-cyan-400" />
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
          <div className="bg-cyan-500 p-2 rounded-lg">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">Retail-Fast</h1>
          </div>
        </div>
        
        <div className="h-8 w-px bg-white/10 hidden md:block" />
        
        <BranchSwitcher />

        <div className="h-8 w-px bg-white/10 hidden md:block" />
      </div>

      <div className="flex items-center gap-4">
        {/* Removed redundant shortcut indicators as they are in Quick Settings */}
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setHistoryOpen(true)}
          title="Sales Register Audit (Ctrl+H)"
          className="text-slate-400 hover:text-white hover:bg-white/10 gap-2 h-10 px-3 rounded-xl transition-all"
        >
          <History className="h-4 w-4 text-emerald-400" />
          <div className="flex flex-col items-start leading-none hidden md:flex">
            <span className="text-[10px] font-black uppercase tracking-widest text-left">Register</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Sales Audit</span>
          </div>
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsLocked(true)}
          className="text-slate-400 hover:text-white hover:bg-white/10"
          title="Lock Terminal (Ctrl+L)"
        >
          <Lock className="h-4 w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleFullscreen}
          className="text-slate-400 hover:text-white hover:bg-white/10"
          title={isFullscreen ? "Exit Fullscreen (Ctrl+Alt+F)" : "Enter Fullscreen (Ctrl+Alt+F)"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5 text-cyan-400" /> : <Maximize className="h-5 w-5" />}
        </Button>

        <Popover>
          <PopoverTrigger 
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 outline-none cursor-pointer"
            title="Quick Settings"
          >
            <Settings className="h-5 w-5" />
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-[#001529] border-white/10 text-white p-0 overflow-hidden" align="end">
            <div className="p-4 bg-white/5 border-b border-white/10">
              <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400">Quick Settings</h3>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Printer Toggle */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Printer Preference</label>
                <div className="flex bg-black/40 p-1 rounded-xl">
                  <button 
                    onClick={() => setPrinterType('Thermal')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                      printerType === 'Thermal' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Thermal
                  </button>
                  <button 
                    onClick={() => setPrinterType('A4')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                      printerType === 'A4' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    A4 Size
                  </button>
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Appearance</label>
                  <p className="text-[11px] text-slate-400 font-medium">Dark Mode Interface</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="bg-white/5 h-8 w-14 rounded-full p-1 justify-start"
                >
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300",
                    isDarkMode ? "translate-x-6 bg-cyan-500" : "bg-slate-600"
                  )}>
                    {isDarkMode ? <Moon className="h-3 w-3 text-white" /> : <Sun className="h-3 w-3 text-white" />}
                  </div>
                </Button>
              </div>

              <Separator className="bg-white/10" />

              {/* Shortcuts Help */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Keyboard className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-400">Search</span>
                    <kbd className="text-[9px] px-1 bg-black/40 rounded border border-white/10">ALT+S</kbd>
                  </div>
                   <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-400">Checkout</span>
                    <kbd className="text-[9px] px-1 bg-black/40 rounded border border-white/10">ALT+↵</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-400">Customer</span>
                    <kbd className="text-[9px] px-1 bg-black/40 rounded border border-white/10">ALT+N</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-400">Lock</span>
                    <kbd className="text-[9px] px-1 bg-black/40 rounded border border-white/10">CTRL+L</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-400">History</span>
                    <kbd className="text-[9px] px-1 bg-black/40 rounded border border-white/10">CTRL+H</kbd>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu onOpenChange={(open) => open && refreshSessionStats()}>
          <DropdownMenuTrigger 
            className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center border-2 border-white/20 cursor-pointer shadow-lg hover:scale-105 transition-all active:scale-95 group outline-none overflow-hidden"
          >
            <User className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 bg-[#001529] border-white/10 text-white p-0 overflow-hidden" align="end">
            <div className="p-4 bg-gradient-to-br from-cyan-600/20 to-indigo-600/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-600 flex items-center justify-center font-black text-sm border-2 border-white/20">
                  {sessionUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight">{sessionUser.name}</p>
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{sessionUser.role}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-y border-white/10 bg-white/5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Today&apos;s Sales</p>
                  <p className="text-base font-black text-white">{sessionStats.count}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Total Revenue</p>
                  <p className="text-base font-black text-emerald-400">₹{sessionStats.revenue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <DropdownMenuItem 
                onClick={() => setPinModalOpen(true)}
                className="focus:bg-white/10 focus:text-white rounded-lg gap-3 py-2.5"
              >
                <Key className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold font-black">Change Security PIN</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={logout}
                className="focus:bg-rose-500/20 focus:text-rose-400 rounded-lg gap-3 py-2.5"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-bold font-black">Secure Logout</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <PosSalesHistoryDrawer 
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
      <ChangePinModal 
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
      />
    </header>
  )
}
