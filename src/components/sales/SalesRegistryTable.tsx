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
import { Badge } from "@/components/ui/badge"
import { fmtINR } from '@/lib/utils'
import { 
  Eye, 
  Printer, 
  Search,
  Loader2,
  FileSpreadsheet
} from "lucide-react"
import { SaleDetailsDrawer } from './SaleDetailsDrawer'
import { CustomerHistoryDrawer } from './CustomerHistoryDrawer'
import { InvoiceTemplate } from '@/components/pos/InvoiceTemplate'
import { useReactToPrint } from 'react-to-print'

interface Sale {
  sale_id: string;
  invoice_number?: string;
  created_at: string;
  total_amount: number;
  customer_id: string;
  customer_name: string;
  branch_name: string;
  status?: string | null;
  items_sold?: {
    name: string;
    quantity: number;
    serial_number: string;
  }[];
  payment_method?: string;
  search_meta?: string;
}

interface SaleRegistryTableProps {
  sales: Sale[];
  onPrint?: (saleId: string) => void;
  onExport?: () => void;
  canExport?: boolean;
  exporting?: boolean;
}

export function SalesRegistryTable({ sales, onPrint, onExport, canExport, exporting }: SaleRegistryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string | null>(null)
  const [selectedSaleStatus, setSelectedSaleStatus] = useState<string | null>(null)
  
  // Customer History State
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)

  // Local printing state (for Sales Registry page where no onPrint is passed)
  const [printId, setPrintId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  })

  const openDetails = (id: string, invoiceNum?: string, status?: string | null) => {
    setSelectedSaleId(id)
    setSelectedInvoiceNumber(invoiceNum || null)
    setSelectedSaleStatus(status ?? null)
    setDrawerOpen(true)
  }

  const openCustomerHistory = (id: string, name: string) => {
    if (!id || name === 'Walk-in Customer') return
    setSelectedCustomerId(id)
    setSelectedCustomerName(name)
    setHistoryOpen(true)
  }

  const triggerPrint = (id: string) => {
    setPrintingId(id)
    if (onPrint) {
      onPrint(id)
      // Auto-clear after 2.5s for fire-and-forget prints
      setTimeout(() => setPrintingId(null), 2500)
    } else {
      setPrintId(id)
    }
  }

  const filteredSales = sales.filter(sale => 
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.sale_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.branch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.search_meta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.items_sold?.some(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    )
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
        {canExport && (
          <Button 
            onClick={onExport} 
            variant="outline" 
            disabled={exporting}
            className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 gap-1.5 font-bold h-12 px-6 rounded-xl transition-all shadow-sm hidden sm:flex"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
            Export to Excel
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold w-[130px]">Invoice ID</TableHead>
                <TableHead className="font-bold w-[100px]">Date</TableHead>
                <TableHead className="font-bold">Customer</TableHead>
                <TableHead className="font-bold text-right">Amount</TableHead>
                <TableHead className="font-bold">Items Sold</TableHead>
                <TableHead className="font-bold">Serial Numbers</TableHead>
                <TableHead className="font-bold">Branch</TableHead>
                <TableHead className="font-bold">Mode</TableHead>
                <TableHead className="font-bold text-right sticky right-0 bg-slate-50/50 z-20 w-[120px] shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.02)]">Actions</TableHead>
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
                    <button 
                      onClick={() => openCustomerHistory(sale.customer_id, sale.customer_name)}
                      disabled={!sale.customer_id || sale.customer_name === 'Walk-in Customer'}
                      className={`text-left group/link ${
                        (!sale.customer_id || sale.customer_name === 'Walk-in Customer') 
                          ? 'cursor-default' 
                          : 'hover:text-blue-600'
                      }`}
                    >
                      <div className="font-bold text-slate-900 transition-colors">{sale.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider italic flex items-center gap-1">
                        {sale.customer_name === 'Walk-in Customer' ? 'Guest Profile' : (
                          <>
                            Verified ID
                            <span className="opacity-0 group-hover/link:opacity-100 transition-opacity text-blue-500 underline decoration-blue-500/30 underline-offset-2">View History</span>
                          </>
                        )}
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-black text-slate-900">{fmtINR(Number(sale.total_amount))}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest
                      ${sale.status === 'voided'   ? 'text-red-500' :
                        sale.status === 'returned' ? 'text-orange-500' :
                        sale.status === 'partially_returned' ? 'text-amber-500' :
                        'text-emerald-600'}`}>
                      {sale.status === 'voided'   ? 'Voided' :
                       sale.status === 'returned' ? 'Returned' :
                       sale.status === 'partially_returned' ? 'Part. Returned' :
                       'Paid'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 max-w-[180px]">
                      {sale.items_sold?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="text-[10px] font-bold text-slate-700 truncate" title={item.name}>
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                      {sale.items_sold && sale.items_sold.length > 3 && (
                        <div className="text-[9px] font-black text-primary uppercase mt-0.5">+{sale.items_sold.length - 3} More Items</div>
                      )}
                      {(!sale.items_sold || sale.items_sold.length === 0) && <span className="text-slate-300">---</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 max-w-[180px]">
                      {sale.items_sold?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="text-[10px] font-mono text-slate-400 truncate" title={item.serial_number}>
                          {item.serial_number || '---'}
                        </div>
                      ))}
                      {sale.items_sold && sale.items_sold.length > 3 && (
                        <div className="text-[9px] font-mono text-slate-300 uppercase mt-0.5">...</div>
                      )}
                      {(!sale.items_sold || sale.items_sold.length === 0) && <span className="text-slate-300">---</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="font-bold text-slate-700 whitespace-nowrap">{sale.branch_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                        {sale.payment_method || 'Cash'}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Settled</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-white z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-100">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-primary"
                        onClick={() => openDetails(sale.sale_id, sale.invoice_number, sale.status)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-primary"
                        onClick={() => triggerPrint(sale.sale_id)}
                        disabled={!!printingId}
                      >
                        {printingId === sale.sale_id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Printer className="h-4 w-4" />
                        )}
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
        invoiceStatus={selectedSaleStatus}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => setDrawerOpen(false)}
      />

      <CustomerHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        customerId={selectedCustomerId}
        customerName={selectedCustomerName}
      />

      <div className="fixed top-[-10000px] left-[-10000px] opacity-0 pointer-events-none z-[-100]">
        {printId && (
          <InvoiceTemplate 
            ref={printRef} 
            invoiceId={printId} 
            onReady={() => {
              handlePrint()
              setTimeout(() => {
                setPrintId(null)
                setPrintingId(null)
              }, 1000)
            }} 
          />
        )}
      </div>
    </div>
  )
}
