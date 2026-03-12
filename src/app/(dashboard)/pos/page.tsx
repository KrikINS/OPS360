"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { getGstRateFromHsn } from "@/utils/compliance"
import { ShoppingCart, Printer, Plus, Search, Tag } from "lucide-react"

// Product Catalog Simulation
const PRODUCTS = [
  { id: "P-01", name: "Premium Inverter AC (1.5T)", hsnCode: "84151010", price: 35000 },
  { id: "P-02", name: "Double Door Refrigerator 320L", hsnCode: "84182100", price: 26000 },
  { id: "P-03", name: "Fully Automatic Washing Machine", hsnCode: "84501100", price: 21000 },
  { id: "P-04", name: "Microwave Oven 28L", hsnCode: "85094010", price: 8500 },
]

type CartItem = {
  product: typeof PRODUCTS[0]
  qty: number
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = (product: typeof PRODUCTS[0]) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  // Invoice calculations
  const invoiceLines = cart.map(item => {
    const lineTotal = item.product.price * item.qty
    const gstRateDec = getGstRateFromHsn(item.product.hsnCode)
    const lineGstAmount = lineTotal * gstRateDec
    
    return {
      ...item,
      lineTotal,
      gstRate: gstRateDec * 100,
      lineGstAmount,
      finalAmount: lineTotal + lineGstAmount
    }
  })

  const subtotal = invoiceLines.reduce((sum, line) => sum + line.lineTotal, 0)
  const totalGstAmount = invoiceLines.reduce((sum, line) => sum + line.lineGstAmount, 0)
  const grandTotal = subtotal + totalGstAmount

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <ShoppingCart className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Point of Sale (POS)</h1>
          <p className="text-muted-foreground mt-1">Create GST-compliant invoices automatically mapped by HSN code.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Product Catalog Column */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-4 w-4" />
                Product Catalog
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PRODUCTS.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span>HSN: {product.hsnCode}</span>
                      <span className="text-primary font-semibold">₹{product.price.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => addToCart(product)}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Invoice / Cart Column */}
        <div className="lg:col-span-7">
          <Card className="shadow-md flex flex-col pt-2">
            <CardHeader className="border-b bg-muted/10 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl">Tax Invoice</CardTitle>
                  <CardDescription className="mt-1">Auto-calculated CGST & SGST based on HSN compliance.</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-muted-foreground">Invoice #OP-9921</div>
                  <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto h-[350px] lg:h-[calc(100vh-480px)] min-h-[200px] border-b">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                  <Tag className="h-10 w-10 opacity-20 mb-3" />
                  <p className="text-sm">Cart is empty. Add products to generate invoice.</p>
                </div>
              ) : (
                <div className="min-w-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#001529] hover:bg-[#001529] border-b sticky top-0 z-10">
                      <TableHead className="text-white font-semibold text-xs uppercase tracking-wider h-10">Item</TableHead>
                      <TableHead className="text-white font-semibold text-xs uppercase tracking-wider h-10">Qty</TableHead>
                      <TableHead className="text-white font-semibold text-xs uppercase tracking-wider h-10">Rate</TableHead>
                      <TableHead className="text-white font-semibold text-xs uppercase tracking-wider h-10">GST</TableHead>
                      <TableHead className="text-white font-semibold text-xs uppercase tracking-wider text-right h-10">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceLines.map((line) => (
                      <TableRow key={line.product.id} className="group cursor-pointer border-b border-border/40 hover:bg-muted/30">
                        <TableCell className="py-2">
                          <div className="font-medium text-sm leading-snug">{line.product.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">HSN: {line.product.hsnCode}</div>
                        </TableCell>
                        <TableCell className="py-2 font-medium">{line.qty}</TableCell>
                        <TableCell className="py-2 text-sm font-mono">₹{line.product.price.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="py-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                            {line.gstRate}% · ₹{Math.round(line.lineGstAmount).toLocaleString('en-IN')}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-right font-bold text-sm font-mono">
                          ₹{Math.round(line.finalAmount).toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="bg-muted/50 flex flex-col p-4 sm:p-6 gap-3 shrink-0">
              <div className="w-full space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (Excl. Tax)</span>
                  <span className="font-medium font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total GST Applied</span>
                  <span className="font-medium font-mono">₹{totalGstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-border/60 pt-2 mt-1 flex justify-between items-center">
                  <span className="text-base sm:text-lg font-bold">Grand Total</span>
                  <span className="text-xl sm:text-2xl font-black text-[#001529]">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <div className="w-full flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  className="w-full sm:flex-1 h-11 border-border/60 hover:bg-red-50 hover:text-red-600 transition-colors" 
                  disabled={cart.length === 0} 
                  onClick={() => setCart([])}
                >
                  Clear Cart
                </Button>
                <Button 
                  className="w-full sm:flex-1 h-11 gap-2 bg-[#001529] hover:bg-[#002a52] text-white shadow-lg transition-all" 
                  disabled={cart.length === 0}
                >
                  <Printer className="h-4 w-4" /> Print GST Invoice
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
