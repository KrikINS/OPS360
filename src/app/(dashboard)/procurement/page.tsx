"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { calculateLandedCost } from "@/utils/compliance"
import { Calculator, Truck, FileText, CheckCircle2 } from "lucide-react"

// Mock PO Data
const MOCK_PO = {
  id: "PO-2026-8942",
  vendor: "Samsung Electronics India",
  items: [
    { id: "1", name: "1.5 Ton Inverter AC", hsnCode: "84151010", orderedQty: 50, price: 32000 },
    { id: "2", name: "320L Double Door Fridge", hsnCode: "84182100", orderedQty: 30, price: 24500 },
    { id: "3", name: "Fully Auto Washing Machine", hsnCode: "84501100", orderedQty: 40, price: 18000 }
  ]
}

export default function ProcurementGRNPage() {
  const [freightCharges, setFreightCharges] = useState<Record<string, number>>({})
  const [receivedQty, setReceivedQty] = useState<Record<string, number>>({})

  const handleFreightChange = (id: string, value: string) => {
    setFreightCharges(prev => ({ ...prev, [id]: Number(value) }))
  }

  const handleQtyChange = (id: string, value: string) => {
    setReceivedQty(prev => ({ ...prev, [id]: Number(value) }))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          Procurement & GRN
        </h1>
        <p className="text-muted-foreground mt-1">Goods Receipt Note flow calculating final Landed Cost including GST.</p>
      </div>

      <Card className="shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Purchase Order: {MOCK_PO.id}
              </CardTitle>
              <CardDescription className="mt-1">Vendor: {MOCK_PO.vendor}</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm font-medium">Pending GRN</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Item</TableHead>
                <TableHead>HSN Code</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Received Qty</TableHead>
                <TableHead>Freight / Item</TableHead>
                <TableHead className="text-right">Landed Cost (Per Item)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_PO.items.map((item) => {
                const qty = receivedQty[item.id] || 0
                const freight = freightCharges[item.id] || 0
                const costDetails = calculateLandedCost(item.price, freight, item.hsnCode)
                
                const isComplete = qty === item.orderedQty
                const isPartial = qty > 0 && qty < item.orderedQty

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.hsnCode}</TableCell>
                    <TableCell>{item.orderedQty}</TableCell>
                    <TableCell>₹{item.price.toLocaleString('en-IN')}</TableCell>
                    
                    {/* Inputs for GRN processing */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          min="0"
                          max={item.orderedQty}
                          placeholder="0"
                          className={`w-20 ${isComplete ? 'border-green-500 focus-visible:ring-green-500' : isPartial ? 'border-amber-500 focus-visible:ring-amber-500' : ''}`}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        />
                        {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="₹0"
                        className="w-24"
                        onChange={(e) => handleFreightChange(item.id, e.target.value)}
                      />
                    </TableCell>
                    
                    {/* Landed Cost Result */}
                    <TableCell className="text-right">
                      {qty > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-lg text-primary">
                            ₹{costDetails.totalLandedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calculator className="h-3 w-3" />
                            Includes {costDetails.gstRate}% GST (₹{costDetails.gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors shadow-sm">
          Complete GRN Phase
        </button>
      </div>
    </div>
  )
}
