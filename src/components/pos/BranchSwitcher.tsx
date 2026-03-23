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
      <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider mb-1">Select Branch / Outlet</span>
      <Select 
        value={selectedBranch || ""} 
        onValueChange={(val) => changeBranch(val || "")}
        disabled={loading}
      >
        <SelectTrigger className="w-[200px] h-9 bg-white/5 border-white/10 text-white font-bold text-xs uppercase tracking-tight focus:ring-0 focus:ring-offset-0 hover:bg-white/10 transition-colors rounded-lg">
          <div className="flex items-center gap-2 overflow-hidden">
            <Monitor className="h-3.5 w-3.5 text-blue-400 shrink-0" />
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
