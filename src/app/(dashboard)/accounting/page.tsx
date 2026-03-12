"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Calculator } from "lucide-react"

// Mock Ledger Data
const mockLedger = [
  { id: "INV-2026-001", date: "2026-03-01", branch: "Main HQ", type: "Sales Invoice", amount: 45000, cgst: 4050, sgst: 4050, igst: 0, total: 53100 },
  { id: "PR-2026-001", date: "2026-03-02", branch: "Main HQ", type: "Payroll", amount: 250000, cgst: 0, sgst: 0, igst: 0, total: 250000 },
  { id: "PO-2026-042", date: "2026-03-05", branch: "Satellite A", type: "Purchase", amount: 150000, cgst: 0, sgst: 0, igst: 27000, total: 177000 },
]

export default function AccountingPage() {
  
  const handleExportCSV = () => {
    const headers = ["Transaction ID", "Date", "Branch", "Type", "Base Amount", "CGST", "SGST", "IGST", "Total Amount"]
    const csvContent = [
      headers.join(","),
      ...mockLedger.map(row => 
        [row.id, row.date, `"${row.branch}"`, `"${row.type}"`, row.amount, row.cgst, row.sgst, row.igst, row.total].join(",")
      )
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `gst_payroll_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Calculator className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Accounting & Audit</h1>
            <p className="text-muted-foreground mt-1">Manage ledgers, generate GST filings, and reconcile payroll.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Export to CSV Button explicitly hooked for Browser Verification */}
          <Button onClick={handleExportCSV} className="gap-2" variant="outline">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Master Ledger (March 2026)</CardTitle>
          <CardDescription>Consolidated view of all taxable and non-taxable outward/inward entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockLedger.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium text-primary">{tx.id}</TableCell>
                  <TableCell>{tx.date}</TableCell>
                  <TableCell>{tx.branch}</TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{tx.total.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
