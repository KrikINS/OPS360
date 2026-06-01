"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { setActiveBranchAction } from '@/app/actions/branch'


// --- Types ---
export type DBStub = {
  from: (table: string) => DBStub;
  select: (cols?: string) => DBStub;
  eq: (col: string, val: unknown) => DBStub;
  in: (col: string, vals: unknown[]) => DBStub;
  single: () => Promise<{ data: unknown; error: unknown }>;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  auth: { getSession: () => Promise<{ data: { session: { user: { id: string } } | null } }> };
  then: (resolve: (val: { data: unknown; error: unknown }) => void) => void;
};

export type Product = {
  id: string
  model_name: string
  brand: string
  category: string
  hsn_code: string
  base_price: number
  gst_rate: number
  current_balance: number
  product_code: string
  tracking_type?: string
  min_stock_level?: number
  warranty_months?: number
  is_archived?: boolean
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
  name?: string
  full_name: string
  phone_number: string
  email?: string
  city?: string
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
  payment_method?: string
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
  customerSearchQuery: string
  phoneQuery: string
  setCustomerSearchQuery: (val: string) => void
  setPhoneQuery: (val: string) => void
  resetCustomerContext: () => void
  selectWalkInCustomer: () => void
  toast: Toast
  invoiceNumber: string
  currentDate: string
  totals: {
    subtotal: number
    taxableValue: number
    discount: number
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
  discount: number
  setDiscount: (val: number) => void

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
  executeCheckout: (paymentMethod?: string) => Promise<{ success: boolean; invoiceData?: InvoiceData; error?: string }>
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
export const SYSTEM_WALKIN_ID = '00000000-0000-0000-0000-000000000000'

export const PosContext = createContext<PosContextType | undefined>(undefined)

export function usePos() {
  const context = useContext(PosContext)
  if (!context) throw new Error('usePos must be used within a PosProvider')
  return context
}

// --- Provider Component ---

import { useSession } from "next-auth/react"

export function PosProvider({ children, initialBranchId }: { children: React.ReactNode, initialBranchId?: string }) {
  const { data: session } = useSession()
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
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [phoneQuery, setPhoneQuery] = useState("")
  const [walkInCustomer, setWalkInCustomer] = useState<Customer | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null)
  const [printerType, setPrinterType] = useState<PrinterType>('Thermal')
  const [isDarkMode, setIsDarkModeState] = useState(false)
  const [sessionUser, setSessionUser] = useState<{name: string, role: string, id: string, pin?: string | null}>({ name: "User", role: "staff", id: "", pin: null })
  const [sessionStats, setSessionStats] = useState<SessionStats>({ count: 0, revenue: 0 })
  const [discount, setDiscount] = useState<number>(0)

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

  

  const refreshSessionStats = useCallback(async () => {
    if (!session?.user) return

    const { data, error } = await import("@/app/actions/pos").then(m => m.getUserPosStatsAction())

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
  }, [session])

  const logout = useCallback(async () => {
    const { signOut } = await import("next-auth/react")
    await signOut({ callbackUrl: '/login' })
  }, [])

  const updatePosPin = useCallback(async (newPin: string) => {
    if (!session?.user) return { success: false, error: 'Not authenticated' }

    const { error } = await import("@/app/actions/pos").then(m => m.updatePosPinAction(session.user.id, newPin))

    if (error) return { success: false, error: error.message }
    setSessionUser(prev => ({ ...prev, pin: newPin }))
    return { success: true }
  }, [session])

  // Auto-refresh stats every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSessionStats()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refreshSessionStats])

  // 1. Fetch Products Logic (Reusable)
  const fetchInventory = useCallback(async (branchId: string) => {
    const { getPosInventoryAction, getPosProductsAction } = await import("@/app/actions/pos")

    const { data: inventoryData, error: invError } = await getPosInventoryAction(branchId)
    if (invError || !inventoryData) return

    const stockMap: Record<string, number> = {}
    ;(inventoryData as unknown as { product_id: string; current_balance: number }[]).forEach(invItem => {
      stockMap[invItem.product_id] = (stockMap[invItem.product_id] || 0) + (invItem.current_balance || 0)
    })

    const productIds = Object.keys(stockMap)
    const { data: productData, error: prodError } = await getPosProductsAction(productIds)

    if (!prodError && productData) {
      const transformed: Product[] = (productData as unknown as Product[]).map((pItem: Product) => ({
        ...pItem,
        current_balance: stockMap[pItem.id] || 0
      }))
      setProducts(transformed)
    }
  }, [])

  const refreshInventory = useCallback(async () => {
    if (selectedBranch) await fetchInventory(selectedBranch)
  }, [selectedBranch, fetchInventory])

  // 2. Initialize Branch & Walk-in Customer
  useEffect(() => {
    async function init() {
      const { getUserAction, getUserProfileAction } = await import("@/app/actions/user")
      const { fetchData } = await import("@/app/actions/generics")

      const { data: { user } } = await getUserAction()
      if (user) {
        const { data: profile } = await getUserProfileAction(user.id)

        if (profile) {
          const profileData = profile as { role: string; full_name?: string; branch_id?: string; assigned_branch_ids?: string[]; pos_pin?: string }
          setUserRole(profileData.role)
          setSessionUser({
            id: user.id,
            name: profileData.full_name || "User",
            role: profileData.role,
            pin: profileData.pos_pin
          })

          await refreshSessionStats()
          const branchIds = profileData.assigned_branch_ids || (profileData.branch_id ? [profileData.branch_id] : [])

          const { data: allBranchesData } = await fetchData("branches")
          const allBranchesList = (allBranchesData as Branch[]) || []

          if (branchIds.length > 0) {
            const initialBranchIdToUse = initialBranchId || branchIds[0]
            setSelectedBranch(initialBranchIdToUse)

            const allotBranches = allBranchesList.filter((b: Branch) => branchIds.includes(b.id))
            const current = allotBranches.find((b: Branch) => b.id === initialBranchIdToUse)
            setBranchName(current?.name || "Main Terminal")
            setCurrentBranchDetails(current as Branch)
            setAllBranches(allotBranches)
            await fetchInventory(initialBranchIdToUse)
          }

          const normalizedRole = profileData.role?.toLowerCase().trim()
          const isAdmin = normalizedRole === 'admin/owner' || normalizedRole === 'super_admin' || normalizedRole === 'admin'
          if (isAdmin) {
            setAllBranches(allBranchesList)
          }
        }
      }

      // Default Walk-in Customer
      const { data: customersData } = await import("@/app/actions/generics").then(m => m.fetchData("customers"))
      const customers = (customersData as Customer[]) || []
      const walkIn = customers.find((c: Customer) => c.id === SYSTEM_WALKIN_ID)
        || customers.find((c: Customer) => (c as unknown as Record<string, unknown>).phone_number === '0000000000')

      if (walkIn) setWalkInCustomer(walkIn)

      setSelectedCustomer(null)

      setInvoiceNumber(`INV-${new Date().getTime().toString().slice(-6)}`)
      setCurrentDate(new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      }).toUpperCase())

      setLoading(false)
    }
    init()
  }, [fetchInventory, refreshSessionStats, initialBranchId])
  
  const resetCustomerContext = useCallback(() => {
    setSelectedCustomer(null)
    setCustomerResults([])
    setCustomerSearchQuery("")
    setPhoneQuery("")
  }, [])

  const selectWalkInCustomer = useCallback(() => {
    if (walkInCustomer) {
      setSelectedCustomer(walkInCustomer)
      setCustomerResults([])
      setCustomerSearchQuery("")
      setPhoneQuery("")
    }
  }, [walkInCustomer])

   const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.base_price * item.qty), 0)
    // Taxable value is Subtotal - Discount
    const taxableValue = Math.max(0, subtotal - discount)
    
    // We distribute the discount proportionately to calculate correct GST if needed, 
    // but for simple global discount we can just use the weighted average or apply it to the final.
    // Standard rule: GST is on the post-discount price.
    const totalGst = cart.reduce((acc, item) => {
      const itemSubtotal = item.base_price * item.qty
      const itemWeight = subtotal > 0 ? itemSubtotal / subtotal : 0
      const itemDiscount = discount * itemWeight
      const itemTaxable = Math.max(0, itemSubtotal - itemDiscount)
      return acc + (itemTaxable * item.gst_rate / 100)
    }, 0)

    return {
      subtotal,
      taxableValue,
      discount,
      totalGst,
      cgst: totalGst / 2,
      sgst: totalGst / 2,
      grandTotal: taxableValue + totalGst
    }
  }, [cart, discount])

  const isCartValid = useMemo(() => {
    return cart.every(item => {
      if (item.tracking_type?.toLowerCase() !== 'serial') return true
      const unitsArray = Object.values(item.selectedUnits || {})
      return unitsArray.length === item.qty && unitsArray.every(u => u !== null)
    })
  }, [cart])

  // 4. Core Actions
  const changeBranch = useCallback(async (branchId: string) => {
    // Check if user is allotted to this branch OR is admin
    const isAllotted = allBranches.some(b => b.id === branchId)
    if (userRole !== 'admin' && !isAllotted) return

    setLoading(true)
    const branch = allBranches.find(b => b.id === branchId)
    if (branch) {
      setSelectedBranch(branchId)
      setBranchName(branch.name)
      setCurrentBranchDetails(branch as Branch)
      setCart([])
      // Persist the selected branch in the cookie so Server Actions and
      // page refreshes see the same branch the user has chosen in the POS.
      await setActiveBranchAction(branchId)
      await fetchInventory(branchId)
      setToast({ message: `Switched to ${branch.name}`, type: 'success' })
    }
    setLoading(false)
  }, [userRole, allBranches, fetchInventory])

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      const currentQty = existing ? existing.qty : 0

      if (currentQty + 1 > product.current_balance) {
        setToast({ message: "Stock limit reached", type: 'error' })
        return prev
      }

      const initialSelectedUnits = product.tracking_type?.toLowerCase() === 'serial' ? { 0: null } : undefined

      if (existing) {
        let updatedUnits = existing.selectedUnits
        if (product.tracking_type === 'Serial') {
          updatedUnits = { ...existing.selectedUnits, [existing.qty]: null }
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1, selectedUnits: updatedUnits } : item)
      }

      return [...prev, {
        id: product.id,
        model_name: product.model_name,
        base_price: product.base_price,
        gst_rate: product.gst_rate,
        hsn_code: product.hsn_code,
        tracking_type: product.tracking_type,
        qty: 1,
        selectedUnits: initialSelectedUnits
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
    const { getPosInventoryAction } = await import("@/app/actions/pos")
    const { data, error } = await getPosInventoryAction(selectedBranch)

    if (error || !data) return []

    const flattened: { id: string, serial_number: string }[] = []
    ;(data as unknown as { id: string; product_id: string; serial_number: string | null; serial_numbers: string[] | null }[])
      .filter(row => row.product_id === productId)
      .forEach(row => {
        if (row.serial_number) {
          flattened.push({ id: row.id, serial_number: row.serial_number })
        } else if (Array.isArray(row.serial_numbers)) {
          row.serial_numbers.forEach(s => { if (s) flattened.push({ id: row.id, serial_number: s }) })
        }
      })

    return flattened
  }, [selectedBranch])

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const itemToUpdate = prev.find(i => i.id === productId)
      if (!itemToUpdate) return prev

      const product = products.find(p => p.id === productId)
      if (!product) return prev

      const newQty = Math.max(1, itemToUpdate.qty + delta)
      if (newQty > product.current_balance) {
        setToast({ message: "Cannot exceed available stock", type: 'error' })
        return prev
      }
      
      let newUnits = itemToUpdate.selectedUnits
      if (itemToUpdate.tracking_type?.toLowerCase() === 'serial' && delta !== 0) {
        newUnits = { ...itemToUpdate.selectedUnits }
        if (delta > 0) {
          // Increase Qty -> Add null slots
          for (let i = 0; i < delta; i++) {
            newUnits[itemToUpdate.qty + i] = null
          }
        } else {
          // Decrease Qty -> Remove slots from end
          for (let i = 0; i < Math.abs(delta); i++) {
            delete newUnits[itemToUpdate.qty - 1 - i]
          }
        }
      }

      return prev.map(item => item.id === productId ? { ...item, qty: newQty, selectedUnits: newUnits } : item)
    })
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
    
    const { searchCustomerByPhoneAction, searchPosCustomersAction } = await import("@/app/actions/pos")

    // Try search by phone first if it looks like a number
    if (/^\+?[\d\s-]+$/.test(term) && term.replace(/\D/g, '').length >= 7) {
      const { data, error } = await searchCustomerByPhoneAction(term)
      if (!error && data) {
        setCustomerResults(data as Customer[])
        setSearchingCustomer(false)
        return
      }
    }

    // Fallback to name search
    const { data, error } = await searchPosCustomersAction(term)
    if (!error && data) setCustomerResults(data as Customer[])
    setSearchingCustomer(false)
  }, [])

  const selectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerResults([])
  }, [])

  const executeCheckout = useCallback(async (paymentMethod: string = 'cash') => {
    if (cart.length === 0) return { success: false, error: 'Cart is empty' }
    setLoading(true)
    try {
      const processedItems = []
      for (const item of cart) {
        if (item.tracking_type === 'Serial') {
          // Flatten into one entry per unit for serialized items
          const unitsArray = Object.values(item.selectedUnits || {}) as SelectedUnit[]
          for (const unit of unitsArray) {
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

      const { processPosSaleAction } = await import("@/app/actions/pos")
      const { data, error } = await processPosSaleAction({
        p_customer_id: selectedCustomer?.id || SYSTEM_WALKIN_ID,
        p_branch_id: selectedBranch,
        p_items: processedItems,
        p_net_amount: totals.subtotal,
        p_tax_amount: totals.totalGst,
        p_total_amount: totals.grandTotal,
        p_payment_method: paymentMethod
      })

      if (error || !data) throw error || new Error("Checkout failed, no data returned")

      const resData = data as { invoice_number: string } & InvoiceData
      setInvoiceNumber(resData.invoice_number)
      setToast({ message: `Sale completed: ${resData.invoice_number}`, type: 'success' })
      
      clearCart()
      resetCustomerContext()
      if (selectedBranch) await fetchInventory(selectedBranch)
      await refreshSessionStats()
      return { success: true, invoiceData: resData as InvoiceData }
    } catch (err: unknown) {
      const errorStr = (err as Error).message
      console.error('Checkout failed:', errorStr)
      setToast({ message: errorStr || 'Payment processing failed', type: 'error' })
      return { success: false, error: errorStr }
    } finally {
      setLoading(false)
    }
  }, [cart, selectedCustomer, selectedBranch, totals, clearCart, fetchInventory, refreshSessionStats, resetCustomerContext])

  // Helper with retry logic for fetching full invoice state
  const fetchInvoiceById = useCallback(async (id: string, retries = 3): Promise<InvoiceData | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        const { getInvoiceHeaderAction, getInvoiceItemsDetailsAction } = await import("@/app/actions/pos")
        const { data: header } = await getInvoiceHeaderAction(id)
        const { data: items } = await getInvoiceItemsDetailsAction(id)
        
        if (header && items && items.length > 0) {
          return { ...(header as Partial<InvoiceData>), items: items as InvoiceData['items'] } as InvoiceData
        }
      } catch (e) {
        console.warn(`Fetch attempt ${i + 1} failed`, e)
      }
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    return null
  }, [])

  // Auto-clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const value: PosContextType = {
    products, cart, loading, selectedBranch, branchName, currentBranchDetails, userRole, allBranches,
    selectedCustomer, customerResults, searchingCustomer, customerSearchQuery, phoneQuery,
    setCustomerSearchQuery, setPhoneQuery, resetCustomerContext, selectWalkInCustomer,
    toast, invoiceNumber, currentDate, totals,
    isLocked, isCartValid, discount, setDiscount,
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
