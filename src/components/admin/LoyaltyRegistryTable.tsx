import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, PlusCircle, MinusCircle, Star } from "lucide-react"

export function LoyaltyRegistryTable({ customers, onAdjustClick }: { customers: any[], onAdjustClick: (c: any) => void }) {
  const [searchTerm, setSearchTerm] = useState('')

  const sorted = [...customers]
    .filter(c => c.id !== '00000000-0000-0000-0000-000000000000') // Exclude walk-in
    .sort((a, b) => (b.loyalty_balance || 0) - (a.loyalty_balance || 0))
    .filter(c => 
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-[400px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
          <Input
            placeholder="Search by Name or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500/20 transition-all font-medium dark:text-slate-200"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
            <TableRow className="hover:bg-transparent border-b dark:border-white/5">
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Customer Name</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Type</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Phone</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 text-right">Points Balance</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 text-right">Redemption Value (₹)</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 text-right sticky right-0 bg-slate-50/50 dark:bg-slate-800/50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.02)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length > 0 ? (
              sorted.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors border-b dark:border-white/5 group">
                  <TableCell className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">
                    {c.full_name}
                  </TableCell>
                  <TableCell>
                    {c.customer_type === 'distributor' ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-md tracking-widest">Distributor</span>
                    ) : c.customer_type === 'retail' ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-md tracking-widest">Retail</span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-md tracking-widest">Walk-in</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {c.phone_number}
                  </TableCell>
                  <TableCell className="text-right font-black text-purple-700 text-lg">
                    {c.loyalty_balance || 0} <span className="text-[10px] text-purple-400 font-bold uppercase">pts</span>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900 text-lg">
                    ₹{c.loyalty_balance || 0}
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-white/5 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-100 dark:border-white/5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                      onClick={() => onAdjustClick(c)}
                    >
                      Adjust
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Star className="h-8 w-8 opacity-10" />
                    <span className="text-xs font-bold uppercase tracking-widest">No customers found</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
