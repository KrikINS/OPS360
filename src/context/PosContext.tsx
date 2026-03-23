"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from "@/utils/supabase/client"

// --- Types ---

export type Product = {
  id: string
  model_name: string
  brand: string
  category: string
  hsn_code: string
  base_price: number
  gst_rate: number
  available_quantity: number
  product_code: string
}

export type CartItem = {
  id: string
  model_name: string
  qty: number
  base_price: number
  gst_rate: number
}

export type Customer = {
  id: string
  name: string
  phone: string
  gstin?: string
}

export type Toast = { message: string, type: 'success' | 'error' } | null

export type Branch = {
  id: string
  name: string
}

interface PosContextType {
  products: Product[]
  cart: CartItem[]
  loading: boolean
  selectedBranch: string | null
  branchName: string
  userRole: string | null
  allBranches: Branch[]
  selectedCustomer: Customer | null
  customerResults: Customer[]
  searchingCustomer: boolean
  toast: Toast
  invoiceNumber: string
  currentDate: string
  totals: {
    subtotal: number
    totalGst: number
    cgst: number
    sgst: number
    grandTotal: number
  }

  // --- Actions ---
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQty: (productId: string, delta: number) => void
  clearCart: () => void
  setToast: (toast: Toast) => void
  searchCustomers: (term: string) => Promise<void>
  selectCustomer: (customer: Customer) => void
  setSelectedCustomer: (customer: Customer | null) => void
  executeCheckout: () => Promise<void>
  refreshInventory: () => Promise<void>
  changeBranch: (branchId: string) => Promise<void>
}

// --- Context & Hook ---

const PosContext = createContext<PosContextType | undefined>(undefined)

export function usePos() {
  const context = useContext(PosContext)
  if (!context) throw new Error('usePos must be used within a PosProvider')
  return context
}

// --- Provider Component ---

export function PosProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [branchName, setBranchName] = useState("Main Terminal")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [allBranches, setAllBranches] = useState<Branch[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [currentDate, setCurrentDate] = useState("")

  const supabase = useMemo(() => createClient(), [])

  // 1. Fetch Products Logic (Reusable)
  const fetchInventory = useCallback(async (branchId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, model_name, brand, category, hsn_code, base_price, gst_rate, product_code,
        inventory!inner(available_quantity)
      `)
      .eq('inventory.branch_id', branchId)
      .eq('is_archived', false)

    if (!error && data) {
      const transformed: Product[] = (data as unknown as Array<{
        id: string;
        model_name: string;
        brand: string;
        category: string;
        hsn_code: string;
        base_price: number;
        gst_rate: number;
        product_code: string;
        inventory: Array<{ available_quantity: number }>;
      }>).map((p) => ({
        id: p.id,
        model_name: p.model_name,
        brand: p.brand,
        category: p.category,
        hsn_code: p.hsn_code,
        base_price: p.base_price,
        gst_rate: p.gst_rate,
        product_code: p.product_code,
        available_quantity: p.inventory?.[0]?.available_quantity || 0
      }))
      setProducts(transformed)
    }
  }, [supabase])

  const refreshInventory = useCallback(async () => {
    if (selectedBranch) await fetchInventory(selectedBranch)
  }, [selectedBranch, fetchInventory])

  // 2. Initialize Branch & Walk-in Customer
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, assigned_branch_id, branches(name)')
          .eq('id', session.user.id)
          .single()
        
        if (profile) {
          setUserRole(profile.role)
          
          if (profile.assigned_branch_id) {
            const bId = profile.assigned_branch_id
            const bName = (profile.branches as unknown as { name: string })?.name || "Main Terminal"
            setSelectedBranch(bId)
            setBranchName(bName)
            await fetchInventory(bId)
          }

          // If Admin, fetch all branches for the switcher
          if (profile.role === 'admin') {
            const { data: branches } = await supabase.from('branches').select('id, name')
            if (branches) setAllBranches(branches)
          }
        }
      }

      // Default Walk-in Customer
      const { data: walkIn } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', '0000000000')
        .single()
      if (walkIn) setSelectedCustomer(walkIn as Customer)
      
      setInvoiceNumber(`INV-${new Date().getTime().toString().slice(-6)}`)
      setCurrentDate(new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric' 
      }).toUpperCase())

      setLoading(false)
    }
    init()
  }, [supabase, fetchInventory])

  // 3. Financial Auditor's Math Engine
  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.base_price * item.qty), 0)
    const totalGst = cart.reduce((acc, item) => acc + (item.base_price * item.qty * item.gst_rate / 100), 0)

    return {
      subtotal,
      totalGst,
      cgst: totalGst / 2,
      sgst: totalGst / 2,
      grandTotal: subtotal + totalGst
    }
  }, [cart])

  // 4. Core Actions
  const changeBranch = useCallback(async (branchId: string) => {
    if (userRole !== 'admin' && selectedBranch) return // Lock logic for non-admins
    
    setLoading(true)
    const { data: branch } = await supabase.from('branches').select('name').eq('id', branchId).single()
    if (branch) {
      setSelectedBranch(branchId)
      setBranchName(branch.name)
      setCart([]) // Clear cart for new logistical context
      await fetchInventory(branchId)
      setToast({ message: `Switched to ${branch.name}`, type: 'success' })
    }
    setLoading(false)
  }, [supabase, userRole, selectedBranch, fetchInventory])

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      const currentQty = existing ? existing.qty : 0

      if (currentQty + 1 > product.available_quantity) {
        setToast({ message: "Stock limit reached", type: 'error' })
        return prev
      }

      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      }

      return [...prev, {
        id: product.id,
        model_name: product.model_name,
        base_price: product.base_price,
        gst_rate: product.gst_rate,
        qty: 1
      }]
    })
  }, [])

  const updateQty = useCallback((productId: string, delta: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.qty + delta)
        if (newQty > product.available_quantity) {
          setToast({ message: "Cannot exceed available stock", type: 'error' })
          return item
        }
        return { ...item, qty: newQty }
      }
      return item
    }))
  }, [products])

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const searchCustomers = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setCustomerResults([])
      return
    }
    setSearchingCustomer(true)
    const { data, error } = await supabase.rpc('search_pos_customers', { search_term: term })
    if (!error && data) setCustomerResults(data as Customer[])
    setSearchingCustomer(false)
  }, [supabase])

  const selectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerResults([])
  }, [])

  const executeCheckout = useCallback(async () => {
    setLoading(true)
    // Stub for process_pos_sale logic
    await new Promise(resolve => setTimeout(resolve, 1000))
    setToast({ message: "Sale Executed Successfully!", type: 'success' })
    clearCart()
    if (selectedBranch) await fetchInventory(selectedBranch)
    setInvoiceNumber(`INV-${new Date().getTime().toString().slice(-6)}`)
    setLoading(false)
  }, [clearCart, selectedBranch, fetchInventory])

  // Auto-clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const value = {
    products, cart, loading, selectedBranch, branchName, userRole, allBranches,
    selectedCustomer, customerResults, searchingCustomer, toast, invoiceNumber, currentDate, totals,
    addToCart, removeFromCart, updateQty, clearCart, setToast, 
    searchCustomers, selectCustomer, setSelectedCustomer, executeCheckout, refreshInventory, changeBranch
  }

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>
}
