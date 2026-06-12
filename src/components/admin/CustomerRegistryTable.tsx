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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search,
  UserPlus,
  Phone,
  MapPin,
  Calendar,
  History,
  Edit,
  Building2
} from "lucide-react"
import { Customer as PosCustomer } from '@/context/PosContext'

interface Customer extends PosCustomer {
  created_at: string
}

interface CustomerRegistryTableProps {
  customers: Customer[]
  onAddClick: () => void
  onEditClick?: (customer: Customer) => void
  onHistoryClick?: (customer: Customer) => void
}

export function CustomerRegistryTable({ customers, onAddClick, onEditClick, onHistoryClick }: CustomerRegistryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = typeFilter === 'all' || c.customer_type === typeFilter;
    
    return matchesSearch && matchesType;
  })

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

        <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full sm:w-auto">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12">
            <TabsTrigger value="all" className="text-xs font-bold uppercase tracking-wider rounded-lg h-full px-4">All</TabsTrigger>
            <TabsTrigger value="walk_in" className="text-xs font-bold uppercase tracking-wider rounded-lg h-full px-4">Walk-in</TabsTrigger>
            <TabsTrigger value="retail" className="text-xs font-bold uppercase tracking-wider rounded-lg h-full px-4">Retail</TabsTrigger>
            <TabsTrigger value="distributor" className="text-xs font-bold uppercase tracking-wider rounded-lg h-full px-4">Distributor</TabsTrigger>
          </TabsList>
        </Tabs>

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
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Customer</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Type</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Contact</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Business</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Location</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Joined</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 text-right sticky right-0 bg-slate-50/50 dark:bg-slate-800/50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.02)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors border-b dark:border-white/5 group">
                  <TableCell>
                    <div className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">{c.full_name}</div>
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
                    {c.customer_type === 'distributor' && c.gstin ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {c.company_name || 'N/A'}
                        </div>
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                          {c.gstin}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {c.city || 'N/A'}
                      </div>
                      {c.state && (
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {c.state}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3 w-3 text-slate-300" />
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-white/5 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-100 dark:border-white/5">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-blue-500 transition-all" onClick={() => onEditClick?.(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-blue-500 transition-all" onClick={() => onHistoryClick?.(c)}>
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-400">
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
