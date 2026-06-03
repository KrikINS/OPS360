"use client"

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
import { 
  Search,
  UserPlus,
  Phone,
  MapPin,
  Calendar,
  History,
  Edit
} from "lucide-react"
import { Customer as PosCustomer } from '@/context/PosContext'

interface Customer extends PosCustomer {
  created_at: string
}

interface CustomerRegistryTableProps {
  customers: Customer[]
  onAddClick: () => void
  onEditClick: (customer: Customer) => void
  onHistoryClick: (customer: Customer) => void
}

export function CustomerRegistryTable({ customers, onAddClick, onEditClick, onHistoryClick }: CustomerRegistryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCustomers = customers.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-[400px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="Search by Name, Phone or City..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all font-medium dark:text-slate-200"
          />
        </div>

        <Button 
          onClick={onAddClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
            <TableRow className="hover:bg-transparent border-b dark:border-white/5">
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Full Name</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Contact Details</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Location</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Joined</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors border-b dark:border-white/5 group">
                  <TableCell>
                    <div className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">{c.full_name}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-70">Verified Customer</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {c.phone_number}
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <History className="h-3 w-3 text-slate-300" />
                          {c.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {c.city || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3 w-3 text-slate-300" />
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-blue-500 transition-all" onClick={() => onEditClick(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-blue-500 transition-all" onClick={() => onHistoryClick(c)}>
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 opacity-10" />
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
