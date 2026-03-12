"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  // Invoice calculations
  let subtotal = 0
  let totalGstAmount = 0

  const invoiceLines = cart.map(item => {
    const lineTotal = item.product.price * item.qty
    const gstRateDec = getGstRateFromHsn(item.product.hsnCode)
    const lineGstAmount = lineTotal * gstRateDec
    
    subtotal += lineTotal
    totalGstAmount += lineGstAmount

    return {
      ...item,
      lineTotal,
      gstRate: gstRateDec * 100,
      lineGstAmount,
      finalAmount: lineTotal + lineGstAmount
    }
  })

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

      <div className="grid md:grid-cols-12 gap-6">
        {/* Product Catalog Column */}
        <div className="md:col-span-5 space-y-4">
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
        <div className="md:col-span-7">
          <Card className="shadow-md h-full flex flex-col pt-2">
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
            <CardContent className="flex-1 p-0 overflow-auto">
              {cart.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                  <Tag className="h-10 w-10 opacity-20 mb-3" />
                  <p>Cart is empty. Add products to generate invoice.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b">
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>GST Slabs</TableHead>
                      <TableHead className="text-right">Amount (Inc. Tax)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceLines.map((line) => (
                      <TableRow key={line.product.id} className="group cursor-pointer">
                        <TableCell>
                          <div className="font-medium text-sm">{line.product.name}</div>
                          <div className="text-[10px] text-muted-foreground">HSN: {line.product.hsnCode}</div>
                        </TableCell>
                        <TableCell className="font-medium">{line.qty}</TableCell>
                        <TableCell className="text-sm">₹{line.product.price.toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono bg-blue-50/50 text-blue-700 border-blue-200">
                            {line.gstRate}% (₹{line.lineGstAmount.toLocaleString('en-IN')})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₹{line.finalAmount.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            
            <CardFooter className="bg-muted/30 border-t flex flex-col p-6 gap-4">
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (Exclusive of Tax)</span>
                  <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total GST Applied</span>
                  <span className="font-medium">₹{totalGstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center">
                  <span className="text-lg font-bold">Grand Total</span>
                  <span className="text-2xl font-black text-primary">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <div className="w-full flex gap-3 pt-2">
                <Button variant="outline" className="w-full" disabled={cart.length === 0} onClick={() => setCart([])}>
                  Clear Cart
                </Button>
                <Button className="w-full gap-2" disabled={cart.length === 0}>
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
