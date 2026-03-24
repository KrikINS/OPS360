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
  Search
} from "lucide-react"
import { SaleDetailsDrawer } from './SaleDetailsDrawer'
import { InvoiceTemplate } from '@/components/pos/InvoiceTemplate'
import { useReactToPrint } from 'react-to-print'

interface Sale {
  sale_id: string;
  invoice_number?: string;
  created_at: string;
  total_amount: number;
  customer_name: string;
  branch_name: string;
}

interface SaleRegistryTableProps {
  sales: Sale[];
  onPrint?: (saleId: string) => void;
}

export function SalesRegistryTable({ sales, onPrint }: SaleRegistryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string | null>(null)
  
  // Local printing state (for Admin page where no onPrint is passed)
  const [printId, setPrintId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  })

  const openDetails = (id: string, invoiceNum?: string) => {
    setSelectedSaleId(id)
    setSelectedInvoiceNumber(invoiceNum || null)
    setDrawerOpen(true)
  }

  const triggerPrint = (id: string) => {
    if (onPrint) {
      onPrint(id)
    } else {
      setPrintId(id)
    }
  }

  const filteredSales = sales.filter(sale => 
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.sale_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.branch_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-[400px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by Invoice, Customer or Branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold w-[150px]">Invoice ID</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Branch</TableHead>
              <TableHead className="font-bold text-right">Amount</TableHead>
              <TableHead className="font-bold text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.sale_id} className="hover:bg-slate-50/80 transition-colors group">
                <TableCell className="font-mono text-[11px] font-bold text-primary uppercase">
                  {sale.invoice_number || (sale.sale_id ? `#${sale.sale_id.slice(0, 8)}` : 'N/A')}
                </TableCell>
                <TableCell className="text-slate-500 font-medium text-[11px]">
                  {new Date(sale.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="font-bold text-slate-900">{sale.customer_name || 'Walk-in Customer'}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider italic">Verified ID</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="font-bold text-slate-700">{sale.branch_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-black text-slate-900">₹{Number(sale.total_amount).toLocaleString()}</div>
                  <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Paid</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md hover:text-primary transition-all text-slate-400"
                      onClick={() => openDetails(sale.sale_id, sale.invoice_number)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md hover:text-primary transition-all text-slate-400"
                      onClick={() => triggerPrint(sale.sale_id)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SaleDetailsDrawer
        open={drawerOpen}
        saleId={selectedSaleId}
        invoiceNumber={selectedInvoiceNumber || undefined}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none z-[-100]">
        {printId && (
          <InvoiceTemplate 
            ref={printRef} 
            invoiceId={printId} 
            onReady={() => {
              handlePrint()
              setTimeout(() => setPrintId(null), 1000)
            }} 
          />
        )}
      </div>
    </div>
  )
}
