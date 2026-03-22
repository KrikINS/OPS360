"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, 
  Printer, 
  Plus, 
  Search, 
  Tag, 
  Loader2, 
  Barcode, 
  CheckCircle2, 
  XCircle,
  Settings,
  User,
  Trash2,
  Minus,
  AlertCircle,
  Zap,
  ArrowRight,
  Monitor
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getGstRateFromHsn } from "@/utils/compliance"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// --- Types ---

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

// --- Page Component ---

export default function RetailFastPOS() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [branchName, setBranchName] = useState("Main Terminal")
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  
  // Input refs for keyboard focus
  const searchInputRef = useRef<HTMLInputElement>(null)
  const customerNameRef = useRef<HTMLInputElement>(null)
  const scannerBuffer = useRef("")
  const lastKeyTime = useRef(0)

  // --- Data Fetching ---

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
      const transformed: Product[] = (data || []).map((p: any) => ({
        ...p,
        available_stock: (p.inventory || [])[0]?.count || 0
      })).filter((p: Product) => p.available_stock > 0)
      
      setProducts(transformed)
    }
    setLoading(false)
  }, [])

  // --- Cart Actions ---

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

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }, [])

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === productId) {
        const newQty = Math.max(1, i.qty + delta)
        if (newQty > i.product.available_stock) {
          setToast({ message: "Cannot exceed available stock", type: 'error' })
          return i
        }
        return { ...i, qty: newQty }
      }
      return i
    }))
  }, [])

  // --- Barcode Processing ---

  const processBarcode = useCallback(async (code: string, bId: string | null) => {
    if (!bId) return
    const supabase = createClient()
    
    // Exact serial match check
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
      // Product code match check
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('product_code', code)
        .single()
      
      if (productData) {
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
            available_stock: 1
          }
          addToCart(product, availUnit.serial_number, availUnit.id)
          setToast({ message: `Added: ${product.model_name}`, type: 'success' })
        } else {
          setToast({ message: "Out of stock for this code", type: 'error' })
        }
      } else {
        setToast({ message: `Invalid code detected: ${code}`, type: 'error' })
      }
    }
  }, [addToCart])

  // --- Lifecycle & Hotkeys ---

  useEffect(() => {
    setInvoiceNumber(`#INV-${Math.floor(100000 + Math.random() * 900000)}`)
    setCurrentDate(new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }))

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
          .select('branch_id, branches(name)')
          .eq('id', user.id)
          .single()
        
        if (profile?.branch_id) {
          setBranchId(profile.branch_id)
          setBranchName((profile.branches as any)?.name || "Main Terminal")
          fetchInventory(profile.branch_id)
        } else {
          setToast({ message: "Unauthorized: No branch assigned", type: 'error' })
          setLoading(false)
        }
      }
    }

    initPOS()

    // Global Hotkeys
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus Search (Alt+S)
      if (e.altKey && e.key === 's') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      
      // Checkout (Alt+Enter)
      if (e.altKey && e.key === 'Enter') {
        if (cart.length > 0) setShowCheckoutConfirm(true)
      }

      // Clear (Alt+C)
      if (e.altKey && e.key === 'c') {
        setCart([])
      }

      // Scanner Logic
      const currentTime = Date.now()
      if (currentTime - lastKeyTime.current > 50) {
        scannerBuffer.current = ""
      }
      
      if (e.key === 'Enter') {
        if (scannerBuffer.current.length > 3) {
          processBarcode(scannerBuffer.current, branchId)
          scannerBuffer.current = ""
          e.preventDefault()
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Only append if it's a character and no modifiers are pressed
        // Check if focus is on an input, if so, don't buffer for scanner
        const activeElem = document.activeElement
        if (activeElem?.tagName !== 'INPUT' && activeElem?.tagName !== 'TEXTAREA') {
          scannerBuffer.current += e.key
        }
      }
      lastKeyTime.current = currentTime
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [branchId, cart.length, fetchInventory, processBarcode])

  // --- Calculations ---

  const invoiceLines = cart.map(item => {
    const lineTotal = item.product.base_price * item.qty
    const totalGstRate = getGstRateFromHsn(item.product.hsn_code)
    const totalGstAmount = lineTotal * totalGstRate
    
    return {
      ...item,
      lineTotal,
      gstRate: Math.round(totalGstRate * 100),
      cgstRate: (totalGstRate / 2) * 100,
      sgstRate: (totalGstRate / 2) * 100,
      cgstAmount: totalGstAmount / 2,
      sgstAmount: totalGstAmount / 2,
      lineGstAmount: totalGstAmount,
      finalAmount: lineTotal + totalGstAmount
    }
  })

  const subtotal = invoiceLines.reduce((sum, line) => sum + line.lineTotal, 0)
  const totalGstAmount = invoiceLines.reduce((sum, line) => sum + line.lineGstAmount, 0)
  const grandTotal = subtotal + totalGstAmount

  // --- Checkout Execution ---

  const executeCheckout = async () => {
    if (cart.length === 0 || !branchId) return
    setLoading(true)
    const supabase = createClient()
    
    try {
      const itemsForRpc: PosSaleItem[] = cart.flatMap(item => {
        if (item.inventory_ids && item.inventory_ids.length > 0) {
          return item.inventory_ids.map(id => ({
            product_id: item.product.id,
            inventory_id: id as string | null,
            qty: 1,
            unit_price: item.product.base_price,
            tax_rate: getGstRateFromHsn(item.product.hsn_code) * 100
          }))
        }
        return [{
          product_id: item.product.id,
          inventory_id: null,
          qty: item.qty,
          unit_price: item.product.base_price,
          tax_rate: getGstRateFromHsn(item.product.hsn_code) * 100
        }]
      })
      
      const { error } = await supabase.rpc('process_pos_sale', {
        p_branch_id: branchId,
        p_invoice_number: invoiceNumber,
        p_total_amount: subtotal,
        p_tax_amount: totalGstAmount,
        p_net_amount: grandTotal,
        p_items: itemsForRpc,
        p_customer_name: customerName,
        p_customer_phone: customerPhone
      })

      if (error) throw error

      setToast({ message: "Sale Executed Successfully!", type: 'success' })
      setCart([])
      setCustomerName("")
      setCustomerPhone("")
      setShowCheckoutConfirm(false)
      setInvoiceNumber(`#INV-${Math.floor(100000 + Math.random() * 900000)}`)
      fetchInventory(branchId)
    } catch (err: any) {
      setToast({ message: err.message || "Checkout failed", type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // --- Filtered Products ---
  const filteredProducts = products.filter(p => 
    p.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
      {/* --- Dynamic Toast --- */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-[100] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border-l-4 animate-in slide-in-from-right-8 duration-300",
          toast.type === 'success' ? "bg-white border-emerald-500 text-slate-800" : "bg-white border-rose-500 text-slate-800"
        )}>
          <div className={cn(
            "p-2 rounded-full",
            toast.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">{toast.message}</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">System Protocol Active</span>
          </div>
        </div>
      )}

      {/* --- Header / Terminal Info --- */}
      <header className="h-16 flex items-center justify-between px-6 bg-[#001529] text-white shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Zap className="h-5 w-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none">Retail-Fast</h1>
              <p className="text-[10px] text-blue-300 font-bold tracking-widest uppercase">POS Terminal v3.0</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-white/10 hidden md:block" />
          
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Terminal</span>
            <span className="text-sm font-bold flex items-center gap-2">
              <Monitor className="h-3 w-3 text-emerald-400" />
              {branchName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black border border-white/20">ALT+S</kbd>
              <span className="text-[10px] font-bold text-slate-400">SEARCH</span>
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black border border-white/20">ALT+↵</kbd>
              <span className="text-[10px] font-bold text-slate-400">CHECKOUT</span>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10">
            <Settings className="h-5 w-5" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border-2 border-white/20 cursor-pointer">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 flex overflow-hidden">
        {/* --- Left Pane: Catalog --- */}
        <section className="w-1/2 flex flex-col border-r border-slate-200 bg-white">
          <div className="p-4 bg-slate-50/50 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                ref={searchInputRef}
                placeholder="Search Product or Scan Barcode (Alt+S)" 
                className="pl-10 h-12 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-blue-500 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white text-[10px] px-3 py-1 font-bold text-slate-500 rounded-lg">ALL CATEGORIES</Badge>
              <Badge variant="outline" className="bg-white text-[10px] px-3 py-1 font-bold text-slate-500 rounded-lg">IN STOCK</Badge>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                <Barcode className="h-3 w-3" />
                SCANNER ACTIVE
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-[10px] font-black tracking-widest uppercase">Initializing Vault...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300 py-12">
                <div className="p-6 bg-slate-50 rounded-full border border-dashed border-slate-200">
                  <Search className="h-12 w-12 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Matches Found</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">Try refining search or check stock register</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group relative flex flex-col p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Tag className="h-4 w-4" />
                      </div>
                      <Badge variant="secondary" className={cn(
                        "text-[9px] font-bold px-2 py-0.5 border-none",
                        product.available_stock < 5 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {product.available_stock} PCS
                      </Badge>
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight h-10 mb-1 group-hover:text-blue-600">{product.model_name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-4 flex items-center gap-1">
                      <Barcode className="h-3 w-3" />
                      {product.product_code}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                      <span className="text-base font-black text-slate-900 tracking-tight">₹{product.base_price.toLocaleString('en-IN')}</span>
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Plus className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* --- Right Pane: Receipt / Register --- */}
        <section className="w-1/2 flex flex-col bg-white">
          <div className="p-4 bg-slate-900 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart className="h-3 w-3 text-blue-400" />
                Active Register
              </h2>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">{invoiceNumber}</span>
                <span className="text-[10px] text-slate-400 font-medium opacity-50">•</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{currentDate}</span>
              </div>
            </div>
            <Button 
              variant="link" 
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest p-0 h-auto"
              onClick={() => setCart([])}
              disabled={cart.length === 0}
            >
              Flush All
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-300">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                  <ShoppingCart className="h-8 w-8 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Register Empty</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">Scan or select items to populate invoice</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableBody>
                  {invoiceLines.map((line) => (
                    <TableRow key={line.product.id} className="border-b border-slate-50 hover:bg-slate-50/50 group">
                      <TableCell className="w-[10%] py-4 pl-0">
                        <div className="flex flex-col items-center gap-1.5">
                          <button 
                            type="button"
                            title="Increase Quantity"
                            onClick={() => updateQty(line.product.id, 1)}
                            className="bg-slate-100 hover:bg-blue-600 hover:text-white p-1 rounded transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-black text-slate-900 tabular-nums">{line.qty}</span>
                          <button 
                            type="button"
                            title="Decrease Quantity"
                            onClick={() => updateQty(line.product.id, -1)}
                            className="bg-slate-100 hover:bg-rose-600 hover:text-white p-1 rounded transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-800 leading-tight">{line.product.model_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tight">₹{line.product.base_price.toLocaleString('en-IN')}</span>
                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[8px] font-black border-none px-1.5 py-0">GST {line.gstRate}%</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-0 font-black text-slate-900 tabular-nums">
                        <div className="flex flex-col items-end gap-1">
                          <span>₹{Math.round(line.finalAmount).toLocaleString('en-IN')}</span>
                          <button 
                            type="button"
                            title="Remove from Cart"
                            onClick={() => removeFromCart(line.product.id)}
                            className="text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 mt-auto shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span className="uppercase tracking-widest">Taxable Amount</span>
                <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 italic">
                <span className="uppercase tracking-widest flex items-center gap-2">
                  Total GST Aggregate
                  <Tooltip>
                    <TooltipTrigger render={
                      <button type="button" title="GST Info">
                        <AlertCircle className="h-3 w-3" />
                      </button>
                    } />
                    <TooltipContent className="bg-[#001529] text-white border-none p-3 text-xs leading-relaxed max-w-[200px]">
                      Sum of CGST and SGST as per HSN lookup compliance protocol.
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="tabular-nums">₹{totalGstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-px bg-slate-200 my-4" />
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Payable</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="hidden lg:flex flex-col items-end gap-1">
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-[8px] font-black border border-slate-300">ALT</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-[8px] font-black border border-slate-300">ENTER</kbd>
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Rapid Checkout</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-600/20 group transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none"
              disabled={cart.length === 0 || loading}
              onClick={() => setShowCheckoutConfirm(true)}
            >
              <div className="flex items-center justify-between w-full px-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Printer className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-black uppercase tracking-widest leading-none">Seal Invoice</span>
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em]">Generate GST Challan</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Button>
          </div>
        </section>
      </main>

      {/* --- Checkout Confirmation Modal --- */}
      <Dialog open={showCheckoutConfirm} onOpenChange={setShowCheckoutConfirm}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-[#001529] text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500 rounded-2xl shadow-lg ring-4 ring-blue-500/20">
                <Printer className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase leading-tight">Final Settlement</DialogTitle>
                <DialogDescription className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1">Review Details & Capture Customer Info</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  <Input 
                    ref={customerNameRef}
                    placeholder="Search or Enter Name" 
                    className="pl-10 h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Phone Number</label>
                <Input 
                  placeholder="+91" 
                  className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-4 shadow-inner">
               <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span className="uppercase tracking-widest">Base Taxable Value</span>
                  <span className="font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
               </div>
               <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                  <span className="uppercase tracking-widest">Total GST Accumulation</span>
                  <span className="font-mono">+₹{totalGstAmount.toLocaleString('en-IN')}</span>
               </div>
               <div className="h-px bg-slate-200" />
               <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Net Receivable</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums font-mono">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
               </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">
                BY PROCEEDING, YOU CONFIRM THE PHYSICAL VERIFICATION OF SERIAL NUMBERS AND GST COMPLIANCE ACCURACY.
              </p>
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 bg-white">
            <div className="flex gap-4 w-full">
              <Button 
                variant="ghost" 
                className="flex-1 h-14 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                onClick={() => setShowCheckoutConfirm(false)}
              >
                Aborted Action
              </Button>
              <Button 
                className="flex-1 h-14 rounded-2xl bg-[#001529] hover:bg-black text-white shadow-xl shadow-slate-900/10 text-xs font-black uppercase tracking-widest group"
                onClick={executeCheckout}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirm & Print
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
