"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { getGstRateFromHsn } from "@/utils/compliance"
import { ShoppingCart, Printer, Plus, Search, Tag, Loader2, Barcode, CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Product = {
  id: string
  model_name: string
  brand: string
  category: string
  hsn_code: string
  base_price: number
  product_code: string
  available_stock: number
  is_archived?: boolean
}

type CartItem = {
  product: Product
  qty: number
  serial_numbers?: string[]
  inventory_ids?: string[]
}

type PosSaleItem = {
  product_id: string
  inventory_id: string | null
  qty: number
  unit_price: number
  tax_rate: number
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  
  // Scanner Buffer Logic
  const scannerBuffer = useRef("")
  const lastKeyTime = useRef(0)

  const fetchInventory = useCallback(async (bId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        inventory(count)
      `)
      .eq('is_archived', false)
      .eq('inventory.status', 'Available')
      .eq('inventory.branch_id', bId)
    
    if (error) {
      setToast({ message: "Failed to fetch inventory", type: 'error' })
    } else {
      const transformed: Product[] = (data || []).map((p: Product & { inventory: { count: number }[] }) => ({
        ...p,
        available_stock: (p.inventory || [])[0]?.count || 0
      })).filter((p: Product) => p.available_stock > 0)
      
      setProducts(transformed)
    }
    setLoading(false)
  }, [])

  const addToCart = useCallback((product: Product, serialNumber?: string, inventoryId?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        if (existing.qty >= product.available_stock && !serialNumber) {
          setToast({ message: "Stock limit reached for this item", type: 'error' })
          return prev
        }
        return prev.map(i => i.product.id === product.id ? { 
          ...i, 
          qty: i.qty + 1 ,
          serial_numbers: serialNumber ? [...(i.serial_numbers || []), serialNumber] : i.serial_numbers,
          inventory_ids: inventoryId ? [...(i.inventory_ids || []), inventoryId] : i.inventory_ids
        } : i)
      }
      return [...prev, { 
        product, 
        qty: 1, 
        serial_numbers: serialNumber ? [serialNumber] : [],
        inventory_ids: inventoryId ? [inventoryId] : []
      }]
    })
  }, [])

  const processBarcode = useCallback(async (code: string, bId: string | null) => {
    if (!bId) return
    const supabase = createClient()
    
    // Check for exact serial match first
    const { data: item } = await supabase
      .from('inventory')
      .select('*, products!inventory_product_id_fkey(*)')
      .eq('serial_number', code)
      .eq('status', 'Available')
      .eq('branch_id', bId)
      .limit(1)
      .single()

    if (item) {
      const product: Product = {
        ...item.products,
        available_stock: 1 
      }
      addToCart(product, item.serial_number, item.id)
      setToast({ message: `Added: ${product.model_name}`, type: 'success' })
    } else {
      // Check for product code match
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('product_code', code)
        .single()
      
      if (productData) {
        // Find FIRST available unit for this product at this branch
        const { data: availUnit } = await supabase
          .from('inventory')
          .select('id, serial_number')
          .eq('product_id', productData.id)
          .eq('branch_id', bId)
          .eq('status', 'Available')
          .limit(1)
          .single()
        
        if (availUnit) {
          const product: Product = {
            ...productData,
            available_stock: 1 // Placeholder for add-to-cart logic
          }
          addToCart(product, availUnit.serial_number, availUnit.id)
          setToast({ message: `Added: ${product.model_name}`, type: 'success' })
        } else {
          setToast({ message: "Out of stock for this code", type: 'error' })
        }
      } else {
        setToast({ message: `Invalid code: ${code}`, type: 'error' })
      }
    }
  }, [addToCart])

  useEffect(() => {
    setInvoiceNumber(`#OP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`)
    setCurrentDate(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))

    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    const supabase = createClient()
    
    async function initPOS() {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('branch_id')
          .eq('id', user.id)
          .single()
        
        if (profile?.branch_id) {
          setBranchId(profile.branch_id)
          fetchInventory(profile.branch_id)
        } else {
          setToast({ message: "No branch assigned to your profile.", type: 'error' })
          setLoading(false)
        }
      }
    }

    initPOS()

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      if (currentTime - lastKeyTime.current > 100) {
        scannerBuffer.current = ""
      }
      
      if (e.key === 'Enter') {
        if (scannerBuffer.current.length > 3) {
          processBarcode(scannerBuffer.current, branchId)
        }
        scannerBuffer.current = ""
      } else if (e.key.length === 1) {
        scannerBuffer.current += e.key
      }
      lastKeyTime.current = currentTime
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [branchId, fetchInventory, processBarcode])

  const invoiceLines = cart.map(item => {
    const lineTotal = item.product.base_price * item.qty
    const totalGstRate = getGstRateFromHsn(item.product.hsn_code)
    const totalGstAmount = lineTotal * totalGstRate
    
    return {
      ...item,
      lineTotal,
      gstRate: totalGstRate * 100,
      cgstRate: (totalGstRate / 2) * 100,
      sgstRate: (totalGstRate / 2) * 100,
      cgstAmount: totalGstAmount / 2,
      sgstAmount: totalGstAmount / 2,
      lineGstAmount: totalGstAmount,
      finalAmount: lineTotal + totalGstAmount
    }
  })

  const subtotal = invoiceLines.reduce((sum, line) => sum + line.lineTotal, 0)
  const totalCgst = invoiceLines.reduce((sum, line) => sum + line.cgstAmount, 0)
  const totalSgst = invoiceLines.reduce((sum, line) => sum + line.sgstAmount, 0)
  const totalGstAmount = totalCgst + totalSgst
  const grandTotal = subtotal + totalGstAmount

  const executeCheckout = async () => {
    if (cart.length === 0 || !branchId) return
    setLoading(true)
    const supabase = createClient()
    
    try {
      const itemsForRpc: PosSaleItem[] = cart.flatMap(item => {
        // Map each unit to a record for the RPC
        if (item.inventory_ids && item.inventory_ids.length > 0) {
          return item.inventory_ids.map(id => ({
            product_id: item.product.id,
            inventory_id: id as string | null,
            qty: 1,
            unit_price: item.product.base_price,
            tax_rate: getGstRateFromHsn(item.product.hsn_code) * 100
          }))
        }
        // Fallback for non-serialized (if any)
        const fallback: PosSaleItem = {
          product_id: item.product.id,
          inventory_id: null,
          qty: item.qty,
          unit_price: item.product.base_price,
          tax_rate: getGstRateFromHsn(item.product.hsn_code) * 100
        };
        return [fallback];
      })
      
      const { error } = await supabase.rpc('process_pos_sale', {
        p_branch_id: branchId,
        p_invoice_number: invoiceNumber,
        p_total_amount: subtotal,
        p_tax_amount: totalGstAmount,
        p_net_amount: grandTotal,
        p_items: itemsForRpc
      })

      if (error) throw error

      setToast({ message: "Sale completed successfully!", type: 'success' })
      setCart([])
      setInvoiceNumber(`#OP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`)
      fetchInventory(branchId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Checkout failed"
      setToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && (
        <div className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-8 duration-300",
          toast.type === 'success' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-rose-600 border-rose-500 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Point of Sale (POS)</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Auto-mapped HSN compliance & Scanning Active.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
          <Barcode className="h-4 w-4 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 tracking-wider">SCANNER READY</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-sm border-t-4 border-t-[#001529]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Available Stock
                </div>
                {!loading && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold">
                    {products.length} Products
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-xs font-bold tracking-widest">SYNCHRONIZING INVENTORY...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 text-center">
                  <ShoppingCart className="h-10 w-10 opacity-20" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase">ZERO STOCK AVAILABLE</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Current terminal inventory is empty.<br/>Please add stock via Procurement or Import.</p>
                  </div>
                </div>
              ) : products.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/30 hover:bg-muted/30 transition-all group">
                  <div className="flex-1">
                    <div className="font-bold text-[#001529]">{product.model_name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-3 mt-1 font-medium">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded tracking-tight">HSN: {product.hsn_code}</span>
                      <span className="text-slate-400">EHA: {product.product_code}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-[#001529]">₹{product.base_price.toLocaleString('en-IN')}</span>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 rounded-full mt-0.5",
                        product.available_stock < 5 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                      )}>
                        {product.available_stock} IN STOCK
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 rounded-full bg-slate-100 hover:bg-[#001529] hover:text-white transition-all shadow-sm"
                      onClick={() => addToCart(product)}
                      aria-label={`Add ${product.model_name} to cart`} // Added aria-label for accessibility
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card className="shadow-lg flex flex-col pt-2 border-none">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-black tracking-tight text-[#001529]">TAX INVOICE</CardTitle>
                  <CardDescription className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">GST COMPLIANT PROTOCOL</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-400">{invoiceNumber}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#001529] opacity-60">{currentDate}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto h-[350px] lg:h-[calc(100vh-480px)] min-h-[200px] border-b p-0 relative">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 opacity-40">
                  <Tag className="h-12 w-12 mb-4" />
                  <p className="text-[10px] font-black tracking-[0.2em] uppercase">TERMINAL READY</p>
                  <p className="text-xs font-medium mt-1">Scan items or select from catalog</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-[#001529] sticky top-0 z-10">
                    <TableRow className="hover:bg-[#001529] border-none">
                      <TableHead className="w-[40%] min-w-[200px] whitespace-normal text-white font-black text-[10px] uppercase tracking-widest h-10 px-6">Description</TableHead>
                      <TableHead className="text-white font-black text-[10px] uppercase tracking-widest h-10 text-center">Qty</TableHead>
                      <TableHead className="text-white font-black text-[10px] uppercase tracking-widest h-10">Rate</TableHead>
                      <TableHead className="text-white font-black text-[10px] uppercase tracking-widest h-10">GST Split</TableHead>
                      <TableHead className="text-white font-black text-[10px] uppercase tracking-widest text-right h-10 px-6">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceLines.map((line) => (
                      <TableRow key={line.product.id} className="group border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <TableCell className="w-[40%] min-w-[200px] whitespace-normal break-words py-4 px-6 align-top">
                          <div className="font-bold text-slate-800 text-sm">{line.product.model_name}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {line.serial_numbers?.map(sn => (
                              <Badge key={sn} variant="secondary" className="bg-slate-100 text-[8px] font-bold px-1.5 py-0">SN: {sn}</Badge>
                            )) || <span className="text-[9px] text-slate-400 font-bold uppercase">Generic Unit Mapping</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center align-top">
                          <span className="font-black text-slate-900">{line.qty}</span>
                        </TableCell>
                        <TableCell className="py-4 text-xs font-bold text-slate-600 align-top">₹{line.product.base_price.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-[#001529]">{line.gstRate}% Total GST</span>
                            <span className="text-[8px] text-slate-400 font-medium">₹{Math.round(line.lineGstAmount).toLocaleString('en-IN')} (CGST: {line.cgstRate}%, SGST: {line.sgstRate}%)</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right px-6">
                           <span className="font-black text-[#001529] text-sm font-mono">₹{Math.round(line.finalAmount).toLocaleString('en-IN')}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            
            <CardFooter className="bg-slate-100/50 flex flex-col p-6 sm:p-8 gap-4 shrink-0">
                <div className="w-full space-y-3 py-2">
                  <div className="flex justify-between items-center text-xs font-bold tracking-tight text-slate-500">
                    <span className="uppercase">Taxable Subtotal</span>
                    <span className="font-mono text-slate-900 border-b border-dotted border-slate-300 pb-0.5">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 italic">
                    <span className="uppercase">Net GST Accumulation</span>
                    <span className="font-mono text-slate-900">₹{totalGstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t-2 border-white">
                    <span className="text-xs font-black text-[#001529] uppercase tracking-[0.2em]">Payable Amount</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#001529] drop-shadow-sm font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              
              <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="w-full sm:flex-1 h-12 border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all rounded-xl shadow-sm" 
                  disabled={cart.length === 0} 
                  onClick={() => setCart([])}
                >
                  Clear Register
                </Button>
                <Button 
                  className="w-full sm:flex-1 h-12 gap-2 bg-[#001529] hover:bg-black text-white shadow-xl transition-all rounded-xl text-xs font-black uppercase tracking-widest group" 
                  disabled={cart.length === 0 || loading}
                  onClick={executeCheckout}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" />} 
                  Seal & Generate Bill
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
