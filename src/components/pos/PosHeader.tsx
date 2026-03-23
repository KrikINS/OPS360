"use client"

import React from 'react'
import { Zap, Settings, User } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { BranchSwitcher } from './BranchSwitcher'

export function PosHeader() {

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[#001529] text-white shrink-0 shadow-lg z-20">
      <div className="flex items-center gap-6">
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
