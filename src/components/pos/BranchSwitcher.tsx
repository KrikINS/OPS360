"use client"

import React from 'react'
import { Monitor } from 'lucide-react'
import { usePos } from '@/context/PosContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function BranchSwitcher() {
  const { userRole, allBranches, selectedBranch, branchName, changeBranch, loading } = usePos()

  if (userRole !== 'admin') {
    return (
      <div className="hidden md:flex flex-col">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Terminal</span>
        <span className="text-sm font-bold flex items-center gap-2">
          <Monitor className="h-3 w-3 text-emerald-400" />
          {branchName}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider mb-1 px-1">Select Branch / Outlet</span>
      <Select 
        value={selectedBranch || ""} 
        onValueChange={(val) => changeBranch(val || "")}
        disabled={loading}
      >
        <SelectTrigger className="w-[220px] h-10 bg-blue-600/20 border-blue-500/30 text-white font-black text-[11px] uppercase tracking-tight focus:ring-2 focus:ring-blue-500 hover:bg-blue-600/30 transition-all rounded-xl shadow-lg shadow-blue-900/20 px-3">
          <div className="flex items-center gap-2.5 overflow-hidden w-full">
            <div className="bg-blue-500 p-1 rounded-md shrink-0">
              <Monitor className="h-3.5 w-3.5 text-white shrink-0" />
            </div>
            <SelectValue placeholder="Select Branch">
              {allBranches.find(b => b.id === selectedBranch)?.name}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-[#001529] border-white/10 text-white">
          {allBranches.map((branch) => (
            <SelectItem 
              key={branch.id} 
              value={branch.id}
              className="text-xs font-bold uppercase tracking-tight focus:bg-blue-600 focus:text-white"
            >
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
