"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { calculateLandedCost } from "@/utils/compliance"
import { Calculator, Truck, FileText, CheckCircle2, Plus, AlertTriangle, ShieldCheck } from "lucide-react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// Type for Vendor
type Vendor = {
  id: string
  name: string
  gstin?: string
  payment_terms?: string
  status: string
}

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
  const [isCreatingPO, setIsCreatingPO] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [poTerms, setPoTerms] = useState({ gstin: "", terms: "" })

  useEffect(() => {
    // Fetch approved vendors for PO creation
    const fetchVendors = async () => {
      try {
        const res = await fetch('/api/vendors')
        const data = await res.json()
        if (res.ok) {
          setVendors(data.filter((v: Vendor) => v.status === 'approved'))
        }
      } catch (err) {
        console.error("Failed to fetch vendors", err)
      }
    }
    fetchVendors()
  }, [])

  const handleVendorSelect = (vendorId: string | null) => {
    if (!vendorId) {
      setSelectedVendor(null)
      setPoTerms({ gstin: "", terms: "" })
      return
    }
    const vendor = vendors.find(v => v.id === vendorId)
    if (vendor) {
      setSelectedVendor(vendor)
      // Auto-pull GSTIN and Payment Terms (Procurement Integration Hook)
      setPoTerms({
        gstin: vendor.gstin || "",
        terms: vendor.payment_terms || "Immediate"
      })
    }
  }

  const handleFreightChange = (id: string, value: string) => {
    setFreightCharges(prev => ({ ...prev, [id]: Number(value) }))
  }

  const handleQtyChange = (id: string, value: string) => {
    setReceivedQty(prev => ({ ...prev, [id]: Number(value) }))
  }

  const isComplianceValid = selectedVendor && poTerms.gstin.length === 15

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Procurement Management
          </h1>
          <p className="text-muted-foreground mt-1">Handle Purchase Orders (PO) and Goods Receipt Notes (GRN).</p>
        </div>
        <Button 
          onClick={() => setIsCreatingPO(!isCreatingPO)}
          className="bg-[#001529] hover:bg-[#002a52] text-white gap-2 shadow-lg"
        >
          {isCreatingPO ? "View Active POs" : <><Plus className="h-4 w-4" /> Create New PO</>}
        </Button>
      </div>

      {isCreatingPO ? (
        <Card className="shadow-md border-t-4 border-t-[#001529]">
          <CardHeader>
            <CardTitle>Draft Purchase Order</CardTitle>
            <CardDescription>Select a vendor to populate compliance and commercial terms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Select Supplier *</Label>
                <Select onValueChange={handleVendorSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a registered vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor GSTIN</Label>
                  <Input 
                    value={poTerms.gstin} 
                    placeholder="Auto-populated" 
                    readOnly 
                    className="bg-muted/50 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input 
                    value={poTerms.terms} 
                    placeholder="Auto-populated" 
                    readOnly 
                    className="bg-muted/50"
                  />
                </div>
              </div>
            </div>

            {selectedVendor && !poTerms.gstin && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-3 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">
                  Compliance Alert: This vendor is missing a valid GSTIN. PO creation is locked until identity is verified.
                </p>
              </div>
            )}

            {selectedVendor && poTerms.gstin && (
              <div className="bg-sky-50 text-sky-700 p-4 rounded-lg flex items-center gap-3 border border-sky-200">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">
                  Compliance Verified: GSTIN detected and mapped for internal tax clearing.
                </p>
              </div>
            )}

            <div className="border rounded-lg bg-muted/20 p-8 text-center text-muted-foreground italic">
              Item selection and pricing hook placeholder...
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3 border-t bg-muted/30">
            <Button variant="ghost" onClick={() => setIsCreatingPO(false)}>Cancel</Button>
            <Button 
              className="bg-[#001529]" 
              disabled={!isComplianceValid}
            >
              Generate Purchase Order
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Active PO for GRN: {MOCK_PO.id}
                </CardTitle>
                <CardDescription className="mt-1">Vendor: {MOCK_PO.vendor}</CardDescription>
              </div>
              <Badge variant="outline" className="text-sm font-medium">In Transit</Badge>
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
          <CardFooter className="justify-end p-4 border-t bg-muted/10">
            <Button className="bg-primary text-primary-foreground shadow-sm">
              Process GRN to Inventory
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
