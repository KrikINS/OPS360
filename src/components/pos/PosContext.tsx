"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from "@/utils/supabase/client"
import { getGstRateFromHsn } from "@/utils/compliance"

// --- Types ---

export type Product = {
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

export type CartItem = {
  product: Product
  qty: number
  serial_numbers?: string[]
  inventory_ids?: string[]
}

export type Customer = {
  id: string
  name: string
  phone: string
  gst_number?: string
}

type Toast = { message: string, type: 'success' | 'error' } | null

interface PosContextType {
  products: Product[]
  cart: CartItem[]
  selectedCustomer: Customer | null
  branchId: string | null
  branchName: string
  loading: boolean
  searchingCustomer: boolean
  customerResults: Customer[]
  toast: Toast
  invoiceNumber: string
  currentDate: string
  
  // Actions
  addToCart: (product: Product, serialNumber?: string, inventoryId?: string) => void
  removeFromCart: (productId: string) => void
  updateQty: (productId: string, delta: number) => void
  searchCustomers: (term: string) => Promise<void>
  selectCustomer: (customer: Customer) => void
  executeCheckout: () => Promise<void>
  setToast: (toast: Toast) => void
  clearCart: () => void
  refreshInventory: () => void
}

const PosContext = createContext<PosContextType | undefined>(undefined)

export function PosProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [branchName, setBranchName] = useState("Main Terminal")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [currentDate, setCurrentDate] = useState("")

  const supabase = useMemo(() => createClient(), [])

  // --- Helpers ---

  const refreshInventory = useCallback(async () => {
    if (!branchId) return
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        inventory(count)
      `)
      .eq('is_archived', false)
      .eq('inventory.status', 'Available')
      .eq('inventory.branch_id', branchId)
    
    if (!error && data) {
      const transformed: Product[] = (data || []).map((p: any) => ({
        ...p,
        available_stock: (p.inventory || [])[0]?.count || 0
      })).filter((p: Product) => p.available_stock > 0)
      setProducts(transformed)
    }
  }, [branchId, supabase])

  // --- Context Logic ---

  const addToCart = useCallback((product: Product, serialNumber?: string, inventoryId?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        if (existing.qty >= product.available_stock && !serialNumber) {
          setToast({ message: "Stock limit reached", type: 'error' })
          return prev
        }
        return prev.map(i => i.product.id === product.id ? { 
          ...i, 
          qty: i.qty + 1 ,
          serial_numbers: serialNumber ? [...(i.serial_numbers || []), serialNumber] : i.serial_numbers,
          inventory_ids: inventoryId ? [...(i.inventory_ids || []), inventoryId] : i.inventory_ids
        } : i)
      }
      return [...prev, { product, qty: 1, serial_numbers: serialNumber ? [serialNumber] : [], inventory_ids: inventoryId ? [inventoryId] : [] }]
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

  const searchCustomers = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setCustomerResults([])
      return
    }
    setSearchingCustomer(true)
    const { data, error } = await supabase.rpc('search_pos_customers', { search_term: term })
    if (!error && data) setCustomerResults(data)
    setSearchingCustomer(false)
  }, [supabase])

  const selectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerResults([])
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const executeCheckout = async () => {
    if (cart.length === 0 || !branchId) return
    setLoading(true)
    try {
      const itemsForRpc = cart.flatMap(item => {
        if (item.inventory_ids?.length) {
          return item.inventory_ids.map(id => ({
            product_id: item.product.id,
            inventory_id: id,
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

      const subtotal = cart.reduce((sum, item) => sum + (item.product.base_price * item.qty), 0)
      const totalGst = cart.reduce((sum, item) => sum + (item.product.base_price * item.qty * getGstRateFromHsn(item.product.hsn_code)), 0)

      const { error } = await supabase.rpc('process_pos_sale', {
        p_branch_id: branchId,
        p_invoice_number: invoiceNumber,
        p_total_amount: subtotal,
        p_tax_amount: totalGst,
        p_net_amount: subtotal + totalGst,
        p_items: itemsForRpc,
        p_customer_name: selectedCustomer?.name || "Walk-in",
        p_customer_phone: selectedCustomer?.phone || "0000000000"
      })

      if (error) throw error

      setToast({ message: "Sale Executed Successfully!", type: 'success' })
      clearCart()
      setInvoiceNumber(`#INV-${Math.floor(100000 + Math.random() * 900000)}`)
      refreshInventory()
    } catch (err: any) {
      setToast({ message: err.message || "Checkout failed", type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // --- Initializers ---

  useEffect(() => {
    setInvoiceNumber(`#INV-${Math.floor(100000 + Math.random() * 900000)}`)
    setCurrentDate(new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }))
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('branch_id, branches(name)').eq('id', session.user.id).single()
        if (profile?.branch_id) {
          setBranchId(profile.branch_id)
          setBranchName((profile.branches as any)?.name || "Main Terminal")
        }
      }
      
      const { data: walkIn } = await supabase.from('customers').select('*').eq('phone', '0000000000').single()
      if (walkIn) setSelectedCustomer(walkIn as Customer)
      
      setLoading(false)
    }
    init()
  }, [supabase])

  useEffect(() => { refreshInventory() }, [branchId, refreshInventory])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const value = {
    products, cart, selectedCustomer, branchId, branchName, loading, searchingCustomer, customerResults, toast, invoiceNumber, currentDate,
    addToCart, removeFromCart, updateQty, searchCustomers, selectCustomer, executeCheckout, setToast, clearCart, refreshInventory
  }

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>
}

export function usePos() {
  const context = useContext(PosContext)
  if (context === undefined) throw new Error('usePos must be used within a PosProvider')
  return context
}
