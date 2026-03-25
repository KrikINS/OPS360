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
  tracking_type?: string
}

export type SelectedUnit = {
  id: string
  serial: string
}

export type CartItem = {
  id: string
  model_name: string
  qty: number
  base_price: number
  gst_rate: number
  hsn_code?: string
  tracking_type?: string
  selectedUnits?: Record<number, SelectedUnit | null>
  serial_number?: string
}

export type Customer = {
  id: string
  name: string
  full_name?: string
  phone: string
  gstin?: string
}

export type Toast = { message: string, type: 'success' | 'error' } | null

export type PrinterType = 'A4' | 'Thermal'

export type SessionStats = { count: number, revenue: number }

export type Branch = {
  id: string
  name: string
  full_address?: string
  city?: string
  state?: string
  pincode?: string
  gstin?: string
}

export type InvoiceData = {
  id: string
  invoice_number: string
  created_at: string | Date
  net_amount: number
  tax_amount: number
  total_amount: number
  customer?: Customer
  branch?: Branch
  items: Array<{
    model_name: string
    hsn_code: string
    quantity: number
    unit_price: number
    gst_amount: number
    serial_number?: string
    gst_rate: number
  }>
}
  
interface Profile {
  role: string
  full_name?: string
  pos_pin?: string | null
  assigned_branch_id?: string | null
  assigned_branch_ids?: string[] | null
}

interface PosContextType {
  products: Product[]
  cart: CartItem[]
  loading: boolean
  selectedBranch: string | null
  branchName: string
  currentBranchDetails: Branch | null
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
  isLocked: boolean
  printInvoiceId: string | null
  printerType: PrinterType
  isDarkMode: boolean
  sessionUser: { name: string, role: string, id: string, pin?: string | null }
  sessionStats: SessionStats
  isCartValid: boolean

  // --- Actions ---
  setIsLocked: (locked: boolean) => void
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQty: (productId: string, delta: number) => void
  clearCart: () => void
  setToast: (toast: Toast) => void
  setPrinterType: (type: PrinterType) => void
  setIsDarkMode: (dark: boolean) => void
  refreshSessionStats: () => Promise<void>
  logout: () => Promise<void>
  searchCustomers: (term: string) => Promise<void>
  selectCustomer: (customer: Customer) => void
  setSelectedCustomer: (customer: Customer | null) => void
  executeCheckout: () => Promise<{ success: boolean; invoiceData?: InvoiceData; error?: string }>
  refreshInventory: () => Promise<void>
  fetchAvailableSerials: (productId: string) => Promise<{ id: string, serial_number: string }[]>
  assignSerialToUnit: (productId: string, slotIndex: number, unit: SelectedUnit | null) => void
  changeBranch: (branchId: string) => Promise<void>
  triggerInvoicePrint: (id: string) => void
  setPrintInvoiceId: (id: string | null) => void
  updatePosPin: (newPin: string) => Promise<{ success: boolean; error?: string }>
  fetchInvoiceById: (id: string, retries?: number) => Promise<InvoiceData | null>
}

// --- Context & Hook ---

export const PosContext = createContext<PosContextType | undefined>(undefined)

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
  const [currentBranchDetails, setCurrentBranchDetails] = useState<Branch | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [allBranches, setAllBranches] = useState<Branch[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null)
  const [printerType, setPrinterType] = useState<PrinterType>('Thermal')
  const [isDarkMode, setIsDarkModeState] = useState(false)
  const [sessionUser, setSessionUser] = useState<{name: string, role: string, id: string, pin?: string | null}>({ name: "User", role: "staff", id: "", pin: null })
  const [sessionStats, setSessionStats] = useState<SessionStats>({ count: 0, revenue: 0 })

  const setIsDarkMode = useCallback((dark: boolean) => {
    setIsDarkModeState(dark)
    if (dark) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
  }, [])

  const triggerInvoicePrint = useCallback((id: string) => {
    setPrintInvoiceId(id)
  }, [])
  const [toast, setToast] = useState<Toast>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [currentDate, setCurrentDate] = useState("")

  const supabase = useMemo(() => createClient(), [])

  const refreshSessionStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.rpc('get_user_pos_stats')

    if (!error && data && data.length > 0) {
      const stats = data[0] as { full_name: string, today_sales_count: number, today_revenue: number }
      setSessionStats({
        count: Number(stats.today_sales_count),
        revenue: Number(stats.today_revenue)
      })
      if (stats.full_name) {
        setSessionUser(prev => ({ 
          ...prev, 
          name: stats.full_name,
        }))
      }
    }
  }, [supabase])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [supabase])

  const updatePosPin = useCallback(async (newPin: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('profiles')
      .update({ pos_pin: newPin })
      .eq('id', user.id)

    if (error) return { success: false, error: error.message }
    setSessionUser(prev => ({ ...prev, pin: newPin }))
    return { success: true }
  }, [supabase])

  // Auto-refresh stats every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSessionStats()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refreshSessionStats])

  // 1. Fetch Products Logic (Reusable)
  const fetchInventory = useCallback(async (branchId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, model_name, brand, category, hsn_code, base_price, gst_rate, product_code, tracking_type,
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
        tracking_type: string;
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
        tracking_type: p.tracking_type,
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
          .select('role, full_name, assigned_branch_id, assigned_branch_ids, pos_pin')
          .eq('id', session.user.id)
          .single()
        
        if (profile) {
          setUserRole(profile.role)
          setSessionUser({
            id: session.user.id,
            name: (profile as Profile).full_name || "User",
            role: profile.role,
            pin: (profile as Profile).pos_pin
          })
          
          await refreshSessionStats()
          const branchIds = (profile.assigned_branch_ids as string[]) || (profile.assigned_branch_id ? [profile.assigned_branch_id] : [])
          
          if (branchIds.length > 0) {
            const initialBranchId = branchIds[0]
            setSelectedBranch(initialBranchId)
            
            // If they have multiple branches, we need the names for the switcher
            const { data: allotBranches } = await supabase
              .from('branches')
              .select('*')
              .in('id', branchIds)
            
            if (allotBranches) {
              const current = (allotBranches as Branch[]).find((b: Branch) => b.id === initialBranchId)
              setBranchName(current?.name || "Main Terminal")
              setCurrentBranchDetails(current as Branch)
              setAllBranches(allotBranches as Branch[])
              await fetchInventory(initialBranchId)
            }
          }

          // If Admin, fetch ALL branches regardless
          if (profile.role === 'admin') {
            const { data: allB } = await supabase.from('branches').select('*')
            if (allB) setAllBranches(allB as Branch[])
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
  }, [supabase, fetchInventory, refreshSessionStats])

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

  const isCartValid = useMemo(() => {
    return cart.every(item => {
      if (item.tracking_type !== 'Stocked') return true
      const units = Object.values(item.selectedUnits || {})
      return units.length === item.qty && units.every(u => u !== null)
    })
  }, [cart])

  // 4. Core Actions
  const changeBranch = useCallback(async (branchId: string) => {
    // Check if user is allotted to this branch OR is admin
    const isAllotted = allBranches.some(b => b.id === branchId)
    if (userRole !== 'admin' && !isAllotted) return
    
    setLoading(true)
    const { data: branch } = await supabase.from('branches').select('*').eq('id', branchId).single()
    if (branch) {
      setSelectedBranch(branchId)
      setBranchName(branch.name)
      setCurrentBranchDetails(branch as Branch)
      setCart([]) // Clear cart for new logistical context
      await fetchInventory(branchId)
      setToast({ message: `Switched to ${branch.name}`, type: 'success' })
    }
    setLoading(false)
  }, [supabase, userRole, allBranches, fetchInventory])

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
        hsn_code: product.hsn_code,
        tracking_type: product.tracking_type,
        qty: 1,
        selectedUnits: product.tracking_type === 'Stocked' ? { 0: null } : undefined
      }]
    })
  }, [])

  const assignSerialToUnit = useCallback((productId: string, slotIndex: number, unit: SelectedUnit | null) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        return {
          ...item,
          selectedUnits: {
            ...item.selectedUnits,
            [slotIndex]: unit
          }
        }
      }
      return item
    }))
  }, [])

  const fetchAvailableSerials = useCallback(async (productId: string) => {
    if (!selectedBranch) return []
    const { data, error } = await supabase
      .from('inventory')
      .select('id, serial_number, serial_numbers')
      .eq('product_id', productId)
      .eq('branch_id', selectedBranch)
      .eq('status', 'Available')

    if (error || !data) return []

    const flattened: { id: string, serial_number: string }[] = []
    
    data.forEach((row: { id: string, serial_number: string | null, serial_numbers: string[] | null }) => {
      if (row.serial_number) {
        flattened.push({ id: row.id, serial_number: row.serial_number })
      } else if (Array.isArray(row.serial_numbers)) {
        row.serial_numbers.forEach((s: string) => {
          if (s) flattened.push({ id: row.id, serial_number: s })
        })
      }
    })

    return flattened
  }, [supabase, selectedBranch])

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
        
        let newUnits = item.selectedUnits
        if (item.tracking_type === 'Stocked' && delta !== 0) {
          newUnits = { ...item.selectedUnits }
          if (delta > 0) {
            for (let i = 0; i < delta; i++) {
              newUnits[item.qty + i] = null
            }
          } else {
            for (let i = 0; i < Math.abs(delta); i++) {
              delete newUnits[item.qty - 1 - i]
            }
          }
        }

        return { ...item, qty: newQty, selectedUnits: newUnits }
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
    if (cart.length === 0) return { success: false, error: 'Cart is empty' }
    setLoading(true)
    try {
      const processedItems = []
      for (const item of cart) {
        if (item.tracking_type === 'Stocked') {
          // Flatten into one entry per unit for serialized items
          const units = Object.values(item.selectedUnits || {}) as SelectedUnit[]
          for (const unit of units) {
            if (unit) {
              processedItems.push({
                product_id: item.id,
                inventory_id: unit.id,
                qty: 1,
                unit_price: item.base_price,
                gst_amount: (item.base_price * (item.gst_rate / 100)),
                serial_number: unit.serial
              })
            }
          }
        } else {
          processedItems.push({
            product_id: item.id,
            qty: item.qty,
            unit_price: item.base_price,
            gst_amount: (item.base_price * (item.gst_rate / 100)) * item.qty
          })
        }
      }

      const { data, error } = await supabase.rpc('process_pos_sale', {
        p_customer_id: selectedCustomer?.id || '00000000-0000-0000-0000-000000000000',
        p_branch_id: selectedBranch,
        p_items: processedItems,
        p_net_amount: totals.subtotal,
        p_tax_amount: totals.totalGst,
        p_total_amount: totals.grandTotal
      })

      if (error) throw error

      setInvoiceNumber(data.invoice_number)
      setToast({ message: `Sale completed: ${data.invoice_number}`, type: 'success' })
      
      clearCart()
      if (selectedBranch) await fetchInventory(selectedBranch)
      await refreshSessionStats()
      return { success: true, invoiceData: data }
    } catch (err: any) {
      console.error('Checkout failed:', err)
      setToast({ message: err.message || 'Payment processing failed', type: 'error' })
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [supabase, cart, selectedCustomer, selectedBranch, totals, clearCart, fetchInventory, refreshSessionStats])

  // Helper with retry logic for fetching full invoice state
  const fetchInvoiceById = useCallback(async (id: string, retries = 3): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data: header } = await supabase.from('sales_invoices').select('*, branches(*), customers(*)').eq('id', id).single()
        const { data: items } = await supabase.from('view_invoice_details').select('*').eq('invoice_id', id)
        
        if (header && items && items.length > 0) {
          return { ...header, items }
        }
      } catch (e) {
        console.warn(`Fetch attempt ${i + 1} failed`, e)
      }
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    return null
  }, [supabase])

  // Auto-clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const value = {
    products, cart, loading, selectedBranch, branchName, currentBranchDetails, userRole, allBranches,
    selectedCustomer, customerResults, searchingCustomer, toast, invoiceNumber, currentDate, totals,
    isLocked, isCartValid,
    setIsLocked,
    printInvoiceId,
    triggerInvoicePrint,
    setPrintInvoiceId,
    printerType,
    setPrinterType,
    isDarkMode,
    setIsDarkMode,
    sessionUser,
    sessionStats,
    refreshSessionStats,
    logout,
    updatePosPin,
    addToCart, removeFromCart, updateQty, clearCart, setToast, 
    searchCustomers, selectCustomer, setSelectedCustomer, executeCheckout, refreshInventory, changeBranch,
    fetchAvailableSerials, assignSerialToUnit, fetchInvoiceById
  }

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>
}
