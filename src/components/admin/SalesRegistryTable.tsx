"use client"

import React, { useState, useRef } from 'react'
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
  Eye, 
  Printer, 
  Search, 
  Calendar, 
  User, 
  Building2, 
  ChevronRight,
  ArrowUpDown
} from "lucide-react"
import { SaleDetailsDrawer } from "./SaleDetailsDrawer"
import { useReactToPrint } from 'react-to-print'
import { InvoiceTemplate } from '@/components/pos/InvoiceTemplate'

interface SaleRegistryTableProps {
  sales: any[]
}

export function SalesRegistryTable({ sales }: SaleRegistryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [printId, setPrintId] = useState<string | null>(null)
  
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  })

  const triggerPrint = (id: string) => {
    setPrintId(id)
    // Small timeout to allow template to fetch data if needed
    setTimeout(() => {
      handlePrint()
    }, 500)
  }

  const filteredSales = sales.filter(sale => 
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.branch_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openDetails = (id: string) => {
    setSelectedSaleId(id)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by Invoice ID, Customer, or Branch..." 
            className="pl-10 bg-slate-50 border-none h-11 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="font-bold">Invoice ID</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Branch</TableHead>
              <TableHead className="font-bold">Staff</TableHead>
              <TableHead className="font-bold text-right">Total</TableHead>
              <TableHead className="font-bold text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id} className="hover:bg-slate-50/80 transition-colors group">
                <TableCell className="font-mono text-[10px] font-bold text-primary uppercase">
                  #{sale.id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-slate-500 font-medium">
                  {new Date(sale.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-bold text-slate-900">
                  {sale.customer_name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    <span className="font-medium text-slate-600">{sale.branch_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-500">
                  {sale.staff_name || 'System'}
                </TableCell>
                <TableCell className="text-right font-black text-slate-900">
                  ₹{Number(sale.total_amount).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon-sm"
                      className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10"
                      onClick={() => openDetails(sale.id)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-sm"
                      className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                      onClick={() => triggerPrint(sale.id)}
                      title="Print Invoice"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredSales.length === 0 && (
          <div className="text-center py-20 bg-slate-50/20">
            <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Sales Found</h3>
            <p className="text-slate-500">Try adjusting your search terms or filters.</p>
          </div>
        )}
      </div>

      <SaleDetailsDrawer 
        saleId={selectedSaleId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Off-screen print template for reference stability */}
      <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none">
        {printId && <InvoiceTemplate ref={printRef} invoiceId={printId} />}
      </div>
    </div>
  )
}
