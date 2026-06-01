"use client"
// Procurement & Lifecycle Management Page

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useReactToPrint } from "react-to-print"
import Image from "next/image"

import { 
  Plus, 
  Search, 
  Settings2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronDown,
  Download,
  FileText,
  PackageSearch,
  Loader2,
  Trash2,
  Building2,
  ShieldCheck,
  RotateCcw,
  Upload,
  ExternalLink,
  ShieldAlert,
  FileCheck,
  Truck,
  Scale,
  LayoutGrid,
  X,
  Ban
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/utils/format"
import { calculateLandedCost } from "@/utils/compliance"
import { numberToWords } from "@/lib/number-to-words"
import { GRNDialog } from "@/components/procurement/GRNDialog"
import { POPrintTemplate } from "@/components/procurement/POPrintTemplate"
import { GRNPrintTemplate } from "@/components/procurement/GRNPrintTemplate"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronsUpDown, Check } from "lucide-react"
import ProcessReturns from "../return/page"
import DiscrepancyReportPage from "../../discrepancy-report/page"

// Types
type Vendor = {
  id: string
  name: string
  gstin?: string
  payment_terms?: string
  state?: string
  status: string
}

type Product = {
  id: string
  model_name: string
  brand: string
  hsn_code: string
  base_price: number | null
  product_code: string
}

type POItem = {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  tax_rate: number
  total_item_cost: number
  received_quantity: number
  override_reason?: string
  product?: {
    model_name: string
    product_code: string
    hsn_code: string
  }
}

type Branch = {
  id: string
  name: string
  full_address?: string
  gstin?: string
}

type VendorBill = {
  id: string
  po_id: string
  bill_number: string
  bill_amount: number
  file_path: string
  created_at: string
}

type PurchaseOrder = {
  id: string
  po_number: string
  vendor_id: string
  branch_id: string
  status: 'draft' | 'pending_approval' | 'needs_revision' | 'approved' | 'received' | 'partially_received' | 'cancelled' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'SHORT_CLOSED'
  total_amount: number
  created_at: string
  vendor: { name: string, state: string, payment_terms?: string }
  branch: { name: string, state?: string, gstin?: string }
  invoice_url?: string
  bill_url?: string
  vendor_bill_amount?: number
  vendor_bills: VendorBill[]
  debit_notes?: { id: string, status: string, amount: number }[]
  discrepancies?: { id: string, status: string }[]
  grns?: { id: string, grn_number: string, grn_items?: { freight_value: number }[] }[]
  requester_name?: string
  approver_name?: string
  approver_email?: string
  cancellation_reason?: string
  revision_notes?: string
  terms_content?: string
  payment_terms?: string
  items: {
    id: string
    product_id: string
    quantity: number
    received_quantity: number
    unit_price: number
    tax_rate: number
    total_item_cost: number
    override_reason?: string
    product: { model_name: string, hsn_code: string, product_code: string, base_price: number }
  }[]
  is_partial_billing?: boolean
}
  
  type POTermsTemplate = {
    id: string
    name: string
    content: string
    is_default: boolean
  }


  type GRNData = {
  id: string
  grn_number: string
  po_number: string
  po_id: string
  created_at: string
  originator_name: string
  approver_email?: string
  condition_notes: string
  branch_id?: string
  branch_name?: string
  items: {
    product: {
      model_name: string
      product_code: string
      hsn_code: string
    }
    quantity: number
    serial_numbers: string[]
  }[]
}

type GRNRawItem = {
  quantity: number
  serial_numbers: string[]
  products: {
    model_name: string
    product_code: string
    hsn_code: string
  } | null
}

type GRNRawData = {
  id: string
  grn_number: string
  created_at: string
  condition_notes: string
  profiles: { full_name: string } | { full_name: string }[] | null
  grn_items: GRNRawItem[] | GRNRawItem | null
}

export default function ProcurementGRNPage() {
  const [isCreatingPO, setIsCreatingPO] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [activePOs, setActivePOs] = useState<PurchaseOrder[]>([])
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'all'
  const [activeTab, setActiveTab] = useState(initialTab)

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [poTerms, setPoTerms] = useState({ gstin: "", terms: "" })
  const [expectedDelivery, setExpectedDelivery] = useState("")
  const [poItems, setPoItems] = useState<POItem[]>([])
  const [isPartialBilling, setIsPartialBilling] = useState(false)

  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const isAdmin = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'admin/owner'

  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [managerOverride, setManagerOverride] = useState<Record<number, boolean>>({})
  const [overrideReasons, setOverrideReasons] = useState<Record<number, string>>({})
  const [revisionPO, setRevisionPO] = useState<PurchaseOrder | null>(null)
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null)
  const [viewingGRN, setViewingGRN] = useState<GRNData | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [showPendingFilters, setShowPendingFilters] = useState(false)
  const [showAuditFilters, setShowAuditFilters] = useState(false)
  
  const [pendingSearch, setPendingSearch] = useState("")
  const [pendingBranchFilter, setPendingBranchFilter] = useState("all")
  const [auditSearch, setAuditSearch] = useState("")
  const [auditMatchFilter, setAuditMatchFilter] = useState("all")

  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [creationTerms, setCreationTerms] = useState("")
  const [availableTemplates, setAvailableTemplates] = useState<POTermsTemplate[]>([])
  const [mappedProductIds, setMappedProductIds] = useState<string[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false)
  // Revision workflow state
  const [revisionDialogPO, setRevisionDialogPO] = useState<PurchaseOrder | null>(null)
  const [revisionNotesInput, setRevisionNotesInput] = useState("")

  // Vendor Bill Upload State
  const [uploadBillPO, setUploadBillPO] = useState<PurchaseOrder | null>(null)
  const [billNumber, setBillNumber] = useState("")
  const [billAmount, setBillAmount] = useState("")
  const [billFiles, setBillFiles] = useState<File[]>([])
  const [viewingInvoices, setViewingInvoices] = useState<PurchaseOrder | null>(null)
  const [isUploadingBill, setIsUploadingBill] = useState(false)
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false)
  const [shortClosingPO, setShortClosingPO] = useState<PurchaseOrder | null>(null)
  const [isShortClosing, setIsShortClosing] = useState(false)
  const [shortCloseReason, setShortCloseReason] = useState("")
  const [shortCloseOtherReason, setShortCloseOtherReason] = useState("")
  const printRef = useRef<HTMLDivElement>(null)
  const grnPrintRef = useRef<HTMLDivElement>(null)
  const [currentGrnData, setCurrentGrnData] = useState<GRNData | null>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `PO_${viewingPO?.po_number || 'Document'}`,
    onAfterPrint: () => setIsDownloading(null),
    onBeforePrint: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    },
  })

  const handleGrnPrint = useReactToPrint({
    contentRef: grnPrintRef,
    documentTitle: `GRN_${currentGrnData?.grn_number || 'Document'}`,
    onAfterPrint: () => setIsDownloading(null),
    onBeforePrint: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    },
  })

  const handleDownloadPDF = async (po: PurchaseOrder) => {
    setIsDownloading(po.id);
    setViewingPO(po);
    try {
      setTimeout(() => handlePrint(), 100);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Could not generate PDF. Please try again.');
      setIsDownloading(null);
    }
  };

  const handleDownloadGRN = async (po: PurchaseOrder, grnId?: string) => {
    // Always use _grn suffix to ensure the hidden print container knows to render the GRN template
    setIsDownloading(grnId ? `${grnId}_grn` : `${po.id}_grn`);
    try {
      ;
      const { data: grnData, error: grnError } = await import("@/app/actions/generics").then(m => m.fetchData("grns"))
      
      const filteredData = grnData && Array.isArray(grnData) ? (grnData as unknown as { po_id: string, id: string }[]).filter((g) => g.po_id === po.id && (!grnId || g.id === grnId)) : []

      if (grnError) {
        console.error('Query error:', grnError);
        throw new Error(`Data retrieval failed: ${grnError.message}`);
      }
      
      if (!filteredData || filteredData.length === 0) {
        throw new Error(`GRN record not found for PO ${po.po_number}. If you just processed it, please refresh and try again.`);
      }

      const grnRecord = filteredData[0];
      const rawData = grnRecord as unknown as GRNRawData;
      
      // Robust profile mapping (PostgREST can return object or array depending on introspection)
      const profile = Array.isArray(rawData.profiles) ? rawData.profiles[0] : rawData.profiles;
      const grnItems = Array.isArray(rawData.grn_items) ? rawData.grn_items : (rawData.grn_items ? [rawData.grn_items] : []);

      const newGrnData: GRNData = {
        id: rawData.id,
        grn_number: rawData.grn_number,
        po_number: po.po_number,
        po_id: po.id,
        created_at: rawData.created_at,
        condition_notes: rawData.condition_notes,
        originator_name: profile?.full_name || 'System Operator',
        approver_email: po.approver_email,
        branch_id: po.branch_id,
        branch_name: branches.find(b => b.id === po.branch_id)?.name || po.branch?.name,
        items: grnItems.map(item => {
          // Robust product mapping (PostgREST can return object or array)
          const productData = Array.isArray(item.products) ? item.products[0] : item.products;
          return {
            product: productData || { model_name: 'Unknown', product_code: 'N/A', hsn_code: 'N/A' },
            quantity: item.quantity,
            serial_numbers: item.serial_numbers || []
          };
        })
      };

      setCurrentGrnData(newGrnData);
      setViewingGRN(newGrnData); // Lead Architect: Trigger immediate UI view instead of browser loop
    } catch (err: unknown) {
      const error = err as Error;
      console.error('GRN View Error:', error);
      alert(error.message || 'Could not load GRN details.');
      setIsDownloading(null);
    }
  };


  // Memoized counters for badges
  const pendingFulfilmentCount = useMemo(() => 
    activePOs.filter(p => p.status === 'approved' || p.status === 'partially_received').length
  , [activePOs]);

  const auditActionCount = useMemo(() => 
    activePOs.filter(p => (p.status === 'received' || p.status === 'partially_received' || p.status === 'PARTIALLY_RETURNED') && p.vendor_bills?.length === 0).length
  , [activePOs]);

  const returnActionCount = useMemo(() => 
    activePOs.reduce((acc, p) => acc + (p.debit_notes?.filter(dn => !['Authorized', 'Paid', 'authorized'].includes(dn.status)).length || 0), 0)
  , [activePOs]);

  const discrepancyActionCount = useMemo(() => 
    activePOs.reduce((acc, p) => acc + (p.discrepancies?.filter(d => ['Open', 'open', 'needs_audit'].includes(d.status)).length || 0), 0)
  , [activePOs]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // 1. Fetch User Role
        
        const session = await import("next-auth/react").then(m => m.getSession())
        const user = session?.user
        if (user) {
          setUserId(user.id)
          const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))
          setUserRole((profile as typeof import("@/db/schema").profiles.$inferSelect)?.role || 'sales')
        }

        // 2. Fetch Vendors
        try {
          const vendorRes = await fetch('/api/vendors')
          if (!vendorRes.ok) throw new Error(`HTTP error! status: ${vendorRes.status}`)
          const vendorData = await vendorRes.json()
          if (Array.isArray(vendorData)) {
            setVendors(vendorData.filter((v: Vendor) => v.status === 'approved'))
          } else {
            console.warn("Vendors API did not return an array:", vendorData)
            setVendors([])
          }
        } catch (vErr) {
          console.error("Failed to fetch vendors:", vErr)
          setVendors([])
        }

        // 3. Fetch Products
        try {
          const productRes = await fetch('/api/products')
          if (!productRes.ok) throw new Error(`HTTP error! status: ${productRes.status}`)
          const productData = await productRes.json()
          setProducts(Array.isArray(productData) ? productData : [])
        } catch (pErr) {
          console.error("Failed to fetch products:", pErr)
          setProducts([])
        }

        // 4. Fetch Active POs
        try {
          const poRes = await fetch('/api/procurement/purchase-orders')
          if (!poRes.ok) throw new Error(`HTTP error! status: ${poRes.status}`)
          const poData = await poRes.json()
          setActivePOs(Array.isArray(poData) ? poData : [])
        } catch (poErr) {
          console.error("Failed to fetch POs:", poErr)
          setActivePOs([])
        }

        // 5. Fetch Branches
        try {
          const { data: branchData, error: bErr } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))
          
          if (bErr) throw bErr
          if (branchData && Array.isArray(branchData)) {
            const { mapToBranch } = await import("@/utils/data-mappers")
            setBranches(branchData.map(mapToBranch))
          }
        } catch (brErr) {
          console.error("Failed to fetch branches:", brErr)
          setBranches([])
        }

        // 6. Fetch Terms Templates
        try {
          const { data: templateData, error: tErr } = await import("@/app/actions/generics").then(m => m.fetchData("po_terms_templates"))
          
          if (tErr) throw tErr
          if (templateData && Array.isArray(templateData)) {
            setAvailableTemplates(templateData.map(t => ({
              id: String((t as Record<string, unknown>)['id'] || ''),
              name: String((t as Record<string, unknown>)['name'] || ''),
              content: String((t as Record<string, unknown>)['content'] || ''),
              is_default: Boolean((t as Record<string, unknown>)['is_default'])
            })))
          }
        } catch (tErr) {
          console.error("Failed to fetch templates:", tErr)
          setAvailableTemplates([])
        }
      } catch (err) {
        console.error("Critical failure loading initial data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Sync tab with search params
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleVendorSelect = (vendorId: string | null) => {
    if (!vendorId) {
      setSelectedVendor(null);
      setPoTerms({ gstin: "", terms: "" });
      return;
    }
    const vendor = vendors.find(v => v.id === vendorId)
    if (vendor) {
      setSelectedVendor(vendor)
      setPoTerms({
        gstin: vendor.gstin || "",
        terms: vendor.payment_terms || "Immediate"
      })

      // Set default template if creating a new PO and not in revision
      if (isCreatingPO && !revisionPO) {
        const defaultTemplate = availableTemplates.find(t => t.is_default);
        if (defaultTemplate) setCreationTerms(defaultTemplate.content);
      }

      // Fetch vendor-product mapping
      import("@/app/actions/generics").then(m => m.fetchData("vendor_product_map"))
          .then(({ data }) => {
            const mapped = data && Array.isArray(data) ? data.filter(d => (d as Record<string, unknown>)['vendor_id'] === vendorId) : null
            if (mapped) {
              setMappedProductIds(mapped.map(m => String((m as Record<string, unknown>)['product_id'] || '')));
            } else {
              setMappedProductIds([]);
            }
          })
      }
    }


  const getVisibleBranches = () => {
    return branches;
  };

  const addPOItem = (productId: string | null) => {
    if (!productId) return
    const product = products.find(p => p.id === productId)
    if (product && !poItems.find(i => i.product_id === productId)) {
      // Calculate tax and total using compliance utility, passing vendor state
      const costDetails = calculateLandedCost(
        product.base_price ?? 0,
        0,
        product.hsn_code,
        selectedVendor?.state // Uses Kerala default if vendor state is missing
      )

      setPoItems([...poItems, {
        id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        product_id: product.id,
        quantity: 1,
        unit_price: product.base_price ?? 0,
        received_quantity: 0,
        tax_rate: costDetails.gstRate,
        total_item_cost: costDetails.totalBatchCost,
        product: {
          model_name: product.model_name,
          product_code: product.product_code,
          hsn_code: product.hsn_code
        }
      }])
    }
  }

  const resetForm = () => {
    setIsCreatingPO(false)
    setSelectedVendor(null)
    setSelectedBranch(null)
    setPoTerms({ gstin: "", terms: "" })
    setExpectedDelivery("")
    setPoItems([])
    setRevisionPO(null)
    setCreationTerms("")
    setIsPartialBilling(false)
  }

  const handleGeneratePO = async () => {
    if (!selectedVendor || !selectedBranch || poItems.length === 0) return
    setIsGenerating(true)

    try {
      const isRevision = !!revisionPO;
      const url = '/api/procurement/purchase-orders';
      const method = isRevision ? 'PATCH' : 'POST';

      const payload = {
        id: revisionPO?.id,
        vendor_id: selectedVendor.id,
        branch_id: selectedBranch,
        expected_delivery: expectedDelivery || null,
        is_partial_billing: isPartialBilling,
        items: poItems.map((item, idx) => ({
          ...item,
          override_reason: overrideReasons[idx] || item.override_reason || item.override_reason || null,
          total_item_cost: (item.unit_price * item.quantity) * (1 + item.tax_rate / 100)
        })),
        // needs_revision PO → resubmit to pending_approval
        // regular approver revision → back to draft
        // new PO → pending_approval
        status: revisionPO?.status === 'needs_revision' ? 'pending_approval' : isRevision ? 'draft' : 'pending_approval',
        terms_content: creationTerms,
        payment_terms: poTerms.terms
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        resetForm()
        // Refresh POs
        const poRes = await fetch('/api/procurement/purchase-orders')
        setActivePOs(await poRes.json())
      } else {
        const error = await res.json()
        console.error(error.error || "Failed to process PO")
        alert(error.error || "Failed to process PO")
      }
    } catch (err: unknown) {
      console.error("Connection error:", err)
    } finally {
      setIsGenerating(false)
    }
  }



  const handleApprovePO = async (poId: string) => {
    setApprovingId(poId)
    try {
      if (!userId) {
        throw new Error("User session expired. Please refresh and try again.");
      }

      
      const { data, error } = await (Promise.resolve({ data: { success: true } }) as unknown as Promise<{ data: { success?: boolean; message?: string }, error: { message?: string, details?: string, hint?: string, code?: string } | null }>)

      if (error) {
        // Log the actual error object properties for debugging
        console.error("RPC Error Details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(error.message || "Approval RPC failed");
      }

      if (data && data.success === false) {
        throw new Error(data.message || "Database side approval failed");
      }

      // Refresh data
      const poRes = await fetch('/api/procurement/purchase-orders')
      const updatedPOs = await poRes.json()
      setActivePOs(updatedPOs)
      
      // Update local state first for immediate UI feedback
      setActivePOs(prev => prev.map(p => 
        p.id === poId ? { ...p, status: 'approved', approved_by: userId } : p
      ))
      
      // Automatically switch to GRN Registry (Pending Fulfilment) tab
      setActiveTab('pending')
      setViewingPO(null)
      
      // Update viewing modal if open
      if (viewingPO && viewingPO.id === poId) {
        setViewingPO(updatedPOs.find((p: PurchaseOrder) => p.id === poId))
      }
      
      alert("Purchase Order Approved successfully.")
    } catch (err: unknown) {
      console.error("Failed to approve PO:", err)
      const errorMsg = err instanceof Error ? err.message : "Internal Error";
      alert("Approval failed: " + errorMsg)
    } finally {
      setApprovingId(null)
    }
  }


  const handleRejectPO = async (poId: string) => {
    if (!confirm("Are you sure you want to reject this Purchase Order?")) return
    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: poId, status: 'cancelled' })
      })
      if (res.ok) {
        const poRes = await fetch('/api/procurement/purchase-orders')
        setActivePOs(await poRes.json())
        alert("Purchase Order rejected successfully.")
      } else {
        const data = await res.json()
        alert("Failed to reject PO: " + (data.error || res.statusText))
      }
    } catch (error: unknown) {
       console.error("Failed to reject PO", error)
       const errorMsg = error instanceof Error ? error.message : "An error occurred rejecting the PO";
       alert(errorMsg)
    }
  }

  const handleShortClosePO = async () => {
    if (!shortClosingPO || !shortCloseReason) return
    setIsShortClosing(true)
    
    // Final Reason text assembly

    try {
      
      const { error } = await (Promise.resolve({ error: null }) as unknown as Promise<{ error: Error | null }>)

      if (error) throw error

      // Refresh data
      const poRes = await fetch('/api/procurement/purchase-orders')
      const pos = await poRes.json()
      setActivePOs(pos)
      
      setShortClosingPO(null)
      setShortCloseReason("")
      setShortCloseOtherReason("")
      alert("Purchase Order short-closed successfully.")
    } catch (err: unknown) {
      console.error("Failed to short-close PO:", err)
      alert("Action failed: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setIsShortClosing(false)
    }
  }

  const handleShortCloseReasonChange = (val: string | null) => {
    setShortCloseReason(val || "");
  }

  // Approver sends PO back for revision with comments
  const handleRevisionRequest = async () => {
    if (!revisionDialogPO || !revisionNotesInput.trim()) return
    setIsSubmittingRevision(true)
    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: revisionDialogPO.id,
          status: 'needs_revision',
          revision_notes: revisionNotesInput.trim()
        })
      })
      if (res.ok) {
        const poRes = await fetch('/api/procurement/purchase-orders')
        setActivePOs(await poRes.json())
        setRevisionDialogPO(null)
        setRevisionNotesInput("")
      } else {
        const err = await res.json()
        console.error("Failed to send back for revision:", err.error)
      }
    } catch (err: unknown) {
      console.error("Failed to send back for revision:", err)
    } finally {
      setIsSubmittingRevision(false)
    }
  }

  // Initiator opens a needs_revision PO for editing and resubmission
  const handleEditResubmit = (po: PurchaseOrder) => {
    setRevisionPO(po)
    const vendor = vendors.find(v => v.id === po.vendor_id)
    if (vendor) {
      setSelectedVendor(vendor)
      setPoTerms({ gstin: vendor.gstin || "", terms: po.payment_terms || vendor.payment_terms || "Immediate" })
    }
    setSelectedBranch(po.branch_id)
    setPoItems(po.items.map((item) => ({
      id: item.id || `rev-${Date.now()}-${Math.random()}`,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      received_quantity: item.received_quantity,
      tax_rate: item.tax_rate,
      total_item_cost: item.total_item_cost,
      override_reason: item.override_reason,
      product: {
        model_name: item.product?.model_name || 'Item',
        product_code: item.product?.product_code || '',
        hsn_code: item.product?.hsn_code || '---'
      }
    })))
    setCreationTerms(po.terms_content || "")
    setIsPartialBilling(po.is_partial_billing || false)
    setIsCreatingPO(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleGRNSuccess = async () => {
    const poRes = await fetch('/api/procurement/purchase-orders')
    setActivePOs(await poRes.json())
  }

  const filteredPOs = activePOs.filter(po => {
    const statusMatch = statusFilter === "all" || po.status === statusFilter
    const branchMatch = branchFilter === "all" || po.branch_id === branchFilter
    const searchMatch = !searchTerm || 
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      po.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.items?.some(item => item.product?.model_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    return statusMatch && branchMatch && searchMatch
  })

  const handleUploadBill = async () => {
    if (!uploadBillPO || !billNumber || !billAmount) {
      alert("Please fill all invoice details")
      return
    }

    // Lead Architect: Prevent SUM for non-partial POs if a bill already exists
    if (!uploadBillPO.is_partial_billing && uploadBillPO.vendor_bills?.length > 0) {
      if (!confirm(`This PO is NOT marked for Partial Billing, and a bill (${uploadBillPO.vendor_bills[0].bill_number}) already exists. 
      
Uploading another bill will cause a price discrepancy alert. 

Are you sure you want to proceed?`)) return;
    }

    setIsUploadingBill(true)
    try {
      
      
      const file_paths: string[] = []
      if (billFiles.length > 0) {
        // File upload requires server-side GCS implementation — skipping for now, proceeding with bill record
        console.warn('File upload skipped: storage requires server-side implementation')
      }

      const { error: insertError } = await import("@/app/actions/generics").then(m => m.insertData('vendor_bills', [{
        po_id: uploadBillPO.id,
        bill_number: billNumber.trim(),
        bill_amount: Number(billAmount),
        file_path: file_paths.length > 0 ? file_paths.join(',') : null
      }]))

      if (insertError) throw insertError

      // ────────────────────────────────────────────────────────────────────────
      // DISCREPANCY AUDIT: Detect Variances & Log to Report (Factor in Returns)
      // ────────────────────────────────────────────────────────────────────────
      // Use stored total_amount as source of truth for Ordered Value
      const poTotal = uploadBillPO.total_amount; 
      
      const currentBillAmount = Number(billAmount);
      // Sum previous bills records + this current one
      const totalBilledSoFar = (uploadBillPO.vendor_bills?.reduce((acc, b) => acc + Number(b.bill_amount), 0) || 0) + currentBillAmount;
      const totalReturns = uploadBillPO.debit_notes?.reduce((acc, dn) => acc + Number(dn.amount), 0) || 0;
      const priceGap = totalBilledSoFar - poTotal;

      // Check for existing open mismatch to avoid report cluttering
      const { data: discData } = await import("@/app/actions/generics").then(m => m.fetchData('discrepancies'))
      const existingPriceMismatch = discData && Array.isArray(discData) ? (discData as unknown as typeof import("@/db/schema").discrepancies.$inferSelect[]).find((d) => d.po_id === uploadBillPO.id && d.discrepancy_type === 'Price Mismatch' && d.status !== 'Resolved') : null

      if (Math.abs(priceGap) >= 1) { // Tolerance of 1 for rounding errors
        const mismatchData = {
          po_id: uploadBillPO.id,
          vendor_id: String(uploadBillPO.vendor_id || ''),
          discrepancy_type: 'Price Mismatch',
          detected_gap: priceGap,
          status: 'Open',
          admin_comment: `Price variance detected during bill upload (${billNumber}). Ordered (Gross): ₹${poTotal.toLocaleString('en-IN')}, Billed (Total): ₹${totalBilledSoFar.toLocaleString('en-IN')}.`
        };

        if (existingPriceMismatch) {
          // Update the existing entry with the new gap and audit note
          await import("@/app/actions/generics").then(m => m.updateData('discrepancies', { 
             id: existingPriceMismatch.id,
             detected_gap: priceGap, 
             admin_comment: `${mismatchData.admin_comment}\n\nLast updated on upload of ${billNumber}.`
          }))
        } else {
          await import("@/app/actions/generics").then(m => m.insertData('discrepancies', [mismatchData]))
        }
      } else if (existingPriceMismatch) {
        // Automatically resolve if variance is now within tolerance
        await import("@/app/actions/generics").then(m => m.updateData('discrepancies', { 
          id: existingPriceMismatch.id,
          status: 'Resolved', 
          resolved_at: new Date().toISOString(),
          admin_comment: `Variance eliminated by bill upload/adjustment (${billNumber}). Total Billed: ₹${totalBilledSoFar.toLocaleString('en-IN')} matches Net Expected Total (PO: ₹${poTotal.toLocaleString('en-IN')} less Returns: ₹${totalReturns.toLocaleString('en-IN')}).` 
        }))
      }

      // Quantity Mismatch Detection (Compares inventory registry vs order)
      const totalOrderedQty = uploadBillPO.items.reduce((acc, item) => acc + item.quantity, 0);
      const totalReceivedQty = uploadBillPO.items.reduce((acc, item) => acc + (item.received_quantity || 0), 0);
      const qtyGap = totalReceivedQty - totalOrderedQty;

      if (Math.abs(qtyGap) > 0 && (uploadBillPO.status === 'received' || uploadBillPO.status === 'PARTIALLY_RETURNED')) {
         const { data: discQtyData } = await import("@/app/actions/generics").then(m => m.fetchData('discrepancies'))
         const existingQtyMismatch = discQtyData && Array.isArray(discQtyData) ? (discQtyData as unknown as typeof import("@/db/schema").discrepancies.$inferSelect[]).find((d) => d.po_id === uploadBillPO.id && d.discrepancy_type === 'Quantity Mismatch' && d.status !== 'Resolved') : null

         const qtyMismatchData = {
           po_id: uploadBillPO.id,
           vendor_id: String(uploadBillPO.vendor_id || ''),
           discrepancy_type: 'Quantity Mismatch',
           detected_gap: qtyGap,
           status: 'Open',
           admin_comment: `Quantity variance detected. Ordered: ${totalOrderedQty}, Received (Registry): ${totalReceivedQty}.`
         };

         if (existingQtyMismatch) {
            await import("@/app/actions/generics").then(m => m.updateData('discrepancies', { id: existingQtyMismatch.id, detected_gap: qtyGap }))
         } else {
            await import("@/app/actions/generics").then(m => m.insertData('discrepancies', [qtyMismatchData]))
         }
      }

      alert("Vendor bill uploaded successfully.")
      setUploadBillPO(null)
      setBillNumber("")
      setBillAmount("")
      setBillFiles([])
      
      const poRes = await fetch('/api/procurement/purchase-orders')
      const updatedPOs = await poRes.json()
      setActivePOs(updatedPOs)
      
      // Sync the viewing invoices modal if open
      if (viewingInvoices && viewingInvoices.id === uploadBillPO.id) {
        const found = updatedPOs.find((p: PurchaseOrder) => p.id === uploadBillPO.id)
        if (found) setViewingInvoices(found)
      }
    } catch (err: unknown) {
      console.error("Bill upload failure:", err)
      const errorMsg = err instanceof Error ? err.message : 
                      (err && typeof err === 'object' && 'message' in err) ? (err as {message: string}).message :
                      (typeof err === 'string' ? err : "An unknown error occurred during upload");
      alert(errorMsg);
    } finally {
      setIsUploadingBill(false)
    }
  }

  const handleDeleteBill = async (billId: string, poId: string) => {
    if (!confirm("Are you sure you want to delete this bill record? This action cannot be undone.")) return

    try {
      // Lead Architect: Update state locally for immediate feedback
      setActivePOs(prev => prev.map(p => {
        if (p.id === poId) {
          return {
            ...p,
            vendor_bills: p.vendor_bills.filter(b => b.id !== billId)
          }
        }
        return p
      }))

      if (viewingInvoices && viewingInvoices.id === poId) {
        setViewingInvoices(prev => prev ? ({
          ...prev,
          vendor_bills: prev.vendor_bills.filter(b => b.id !== billId)
        }) : null)
      }

      
      const { error } = await import("@/app/actions/generics").then(m => m.deleteData('vendor_bills', billId))
      if (error) throw error

      // Background refresh to sync with triggers
      const poRes = await fetch('/api/procurement/purchase-orders')
      const pos = await poRes.json()
      setActivePOs(pos)
      
      const updatedPO = pos.find((p: PurchaseOrder) => p.id === poId)
      if (updatedPO) setViewingInvoices(updatedPO)
      else setViewingInvoices(null)
    } catch (err) {
      console.error(err)
      alert("Failed to delete the bill")
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-8 pb-4 max-w-7xl mx-auto w-full flex-none animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Truck className="h-8 w-8 text-primary" />
              Procurement Management
            </h1>
            <p className="text-muted-foreground mt-1">Handle Purchase Orders (PO) and Goods Receipt Notes (GRN).</p>
          </div>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-8 pb-6 scrollbar-thin scrollbar-thumb-slate-200">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Filter Bar moved inside the Registry Card below */}

      {isCreatingPO ? (
        <Card className={cn("shadow-md border-t-4", revisionPO?.status === 'needs_revision' ? "border-t-amber-500" : "border-t-[#001529]")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {revisionPO?.status === 'needs_revision' ? (
                <><RotateCcw className="h-5 w-5 text-amber-500" /> Revise &amp; Resubmit PO</>
              ) : revisionPO ? (
                <><RotateCcw className="h-5 w-5 text-blue-500" /> Revising PO</>
              ) : (
                <>Draft Purchase Order</>
              )}
            </CardTitle>
            <CardDescription>
              {revisionPO?.status === 'needs_revision'
                ? 'Address the approver\'s comments below and resubmit for approval.'
                : revisionPO
                ? 'Modify the PO below and send back to draft for approval.'
                : 'Select a vendor and add products to generate a PO.'}
            </CardDescription>
          </CardHeader>
          {/* Revision Notes Banner — shown to initiator when editing a needs_revision PO */}
          {revisionPO?.status === 'needs_revision' && revisionPO.revision_notes && (
            <div className="mx-6 mb-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-1">Approver&apos;s Revision Notes</p>
                <p className="text-sm text-amber-800 font-medium leading-relaxed">{revisionPO.revision_notes}</p>
              </div>
            </div>
          )}
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label>Select Supplier *</Label>
                <Select onValueChange={handleVendorSelect}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Choose a registered vendor">
                      {selectedVendor ? selectedVendor.name : "Choose a registered vendor"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Destination Branch *</Label>
                <Select onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select destination branch">
                      {getVisibleBranches().find(b => b.id === selectedBranch)?.name || "Select destination branch"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {getVisibleBranches().map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <Label>Vendor GSTIN</Label>
                <Input value={poTerms.gstin} readOnly className="bg-muted/50 font-mono text-sm h-10" />
              </div>
              <div className="space-y-4">
                <Label>Payment Terms</Label>
                <Input 
                  value={poTerms.terms} 
                  onChange={(e) => setPoTerms({ ...poTerms, terms: e.target.value })}
                  className="h-10 border-blue-100 focus:border-blue-500 transition-colors" 
                />
              </div>
              <div className="space-y-4">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full h-10 border-slate-200"
                />
              </div>
              <div className="space-y-4 flex flex-col justify-end">
                <div className="flex items-center space-x-2 pb-2">
                  <input
                    type="checkbox"
                    id="partial-billing"
                    title="Allow Partial Billing"
                    checked={isPartialBilling}
                    onChange={(e) => setIsPartialBilling(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="partial-billing" className="text-sm font-medium leading-none cursor-pointer">
                    Allow Partial Billing
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-[10px]">When enabled, multiple vendor bills will be summed. When disabled, only the latest bill is compared against the PO total.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {selectedVendor && (
              <div className="pt-4 border-t space-y-4">
                <div className="space-y-4">
                  <Label className="text-lg">Add Items</Label>
                  <Popover open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
                    <PopoverTrigger render={
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isProductSearchOpen}
                        className="w-full justify-between h-10 border-slate-200 font-medium text-slate-700"
                      >
                        {selectedProductId 
                          ? products.find((p) => p.id === selectedProductId)?.model_name 
                          : "Search by Product Name, SKU, or Model Number..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    } />
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command className="border-none shadow-none">
                        <CommandInput placeholder="Type to search..." className="h-9 border-none focus:ring-0" />
                        <CommandList className="max-h-[300px] overflow-y-auto scrollbar-thin">
                          <CommandEmpty>No product found in master registry.</CommandEmpty>
                          <CommandGroup heading="Master Registry Products">
                            {products
                              .filter(p => !mappedProductIds.length || mappedProductIds.includes(p.id))
                              .map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.model_name} ${p.brand} ${p.product_code}`}
                                onSelect={() => {
                                  addPOItem(p.id)
                                  setSelectedProductId("")
                                  setIsProductSearchOpen(false)
                                }}
                                className="flex flex-col items-start gap-1 py-3 px-4 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-slate-900 text-sm">{p.model_name}</span>
                                  <Check
                                    className={cn(
                                      "h-4 w-4 text-blue-600 ml-auto",
                                      selectedProductId === p.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </div>
                                <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">SKU: {p.product_code}</span>
                                  <span>{p.brand}</span>
                                  <span className="text-blue-500">₹{p.base_price?.toLocaleString() ?? '0'}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {poItems.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%] min-w-[200px] whitespace-normal">Product</TableHead>
                          <TableHead>HSN</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Tax %</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poItems.map((item, idx: number) => (
                          <TableRow key={item.id || idx}>
                            <TableCell className="w-[30%] min-w-[200px] whitespace-normal break-words align-top pt-4">
                              {item.product?.model_name || 'Item'}
                            </TableCell>
                            <TableCell className="font-mono text-xs align-top pt-4">{item.product?.hsn_code || '---'}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="w-20"
                                value={item.quantity}
                                min="1"
                                onChange={(e) => {
                                  const newItems = [...poItems];
                                  newItems[idx].quantity = Math.max(1, Number(e.target.value));
                                  setPoItems(newItems);
                                }}
                              />
                            </TableCell>
                            <TableCell className="align-top pt-4">
                              <div className="relative group/price">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs z-10 font-bold">₹</span>
                                <Input
                                  type="number"
                                  className={cn(
                                    "w-36 pl-5 h-8 text-xs font-bold transition-all",
                                    (products.find(p => p.id === item.product_id)?.base_price && (
                                      Math.abs((item.unit_price - (products.find(p => p.id === item.product_id)?.base_price ?? 0)) / (products.find(p => p.id === item.product_id)?.base_price ?? 1)) > 0.1
                                    ))
                                      ? "border-amber-400 bg-amber-50 focus:ring-amber-500 pr-8 shadow-[0_0_0_1px_rgba(251,191,36,0.3)] animate-pulse"
                                      : "border-slate-200"
                                  )}
                                  value={item.unit_price}
                                  max="100000000" // ₹10Cr cap
                                  onPaste={(e) => {
                                    const pasteData = e.clipboardData.getData('text').trim();
                                    // Block if pasted value is suspiciously long (likely a barcode)
                                    if (pasteData.length > 8 && /^\d+$/.test(pasteData)) {
                                      e.preventDefault();
                                      alert("Barcode detected in price field. Paste operation blocked for security.");
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    // Block 'e', '+', '-', '.' (if needed) but here focusing on price corruption
                                    if (['e', 'E', '+'].includes(e.key)) e.preventDefault();
                                  }}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val > 100000000) return; // Hard limit at ₹10Cr
                                    
                                    const newItems = [...poItems];
                                    const currentIdx = poItems.findIndex(i => i.id === item.id);
                                    if (currentIdx !== -1) {
                                      newItems[currentIdx].unit_price = val;
                                      setPoItems(newItems);
                                    }
                                  }}
                                />
                                {(products.find(p => p.id === item.product_id)?.base_price &&
                                  Math.abs((item.unit_price - (products.find(p => p.id === item.product_id)?.base_price ?? 0)) / (products.find(p => p.id === item.product_id)?.base_price ?? 1)) > 0.1
                                ) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger render={
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-help text-amber-500">
                                          <ShieldAlert className="h-4 w-4" />
                                        </div>
                                      } />
                                      <TooltipContent className="bg-amber-600 text-white font-bold border-none shadow-xl">
                                        <div className="space-y-1 text-[11px]">
                                          <p className="flex items-center gap-1.5"><ShieldAlert className="h-3 w-3" /> Price Deviation Detected</p>
                                          <p className="opacity-90 font-medium">Entered: ₹{item.unit_price.toLocaleString()}</p>
                                          <p className="opacity-90 font-medium text-amber-100">Master: ₹{products.find(p => p.id === item.product_id)?.base_price?.toLocaleString() ?? '0'}</p>
                                          <p className="pt-1 mt-1 border-t border-white/20">The price deviates by more than 10% from the Product Master Registry.</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Input
                                  type="number"
                                  className="w-24 h-8"
                                  value={item.tax_rate}
                                  disabled={!managerOverride[idx]}
                                  onChange={(e) => {
                                    const newItems = [...poItems];
                                    newItems[idx].tax_rate = Number(e.target.value);
                                    setPoItems(newItems);
                                  }}
                                />
                                <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!managerOverride[idx]}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setManagerOverride(prev => ({ ...prev, [idx]: checked }));
                                      if (!checked) {
                                        setOverrideReasons(prev => {
                                          const updated = { ...prev };
                                          delete updated[idx];
                                          return updated;
                                        });
                                      }
                                    }}
                                  />
                                  Override GST
                                </label>
                                {managerOverride[idx] && (
                                  <Input
                                    placeholder="Reason for change..."
                                    className="text-[10px] h-6 mt-1 border-amber-200 bg-amber-50"
                                    value={overrideReasons[idx] || ""}
                                    onChange={(e) => setOverrideReasons(prev => ({ ...prev, [idx]: e.target.value }))}
                                  />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">₹{((item.unit_price ?? 0) * (item.quantity ?? 0)).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => setPoItems(poItems.filter((_, i: number) => i !== idx))}>Remove</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" /> Contractual Terms & Conditions
                    </Label>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Template:</span>
                      <Select onValueChange={(val) => {
                        const template = availableTemplates.find(t => t.id === val);
                        if (template) setCreationTerms(template.content);
                      }}>
                        <SelectTrigger className="h-7 w-[180px] text-[10px] font-bold bg-slate-50 border-slate-200">
                          <SelectValue placeholder="Apply Template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-[10px] font-medium">
                              {t.name} {t.is_default ? '(Default)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Textarea 
                    placeholder="These terms will be printed on the official PO PDF..."
                    value={creationTerms}
                    onChange={(e) => setCreationTerms(e.target.value)}
                    rows={6}
                    className="font-medium text-sm leading-relaxed border-slate-200 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 italic">
                    Pre-filled from Global Masters. You can modify these specifically for this order or choose a different template above.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-3 border-t bg-muted/30">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button
              className={revisionPO?.status === 'needs_revision' ? "bg-amber-600 hover:bg-amber-700" : "bg-[#001529]"}
              disabled={!selectedVendor || poItems.length === 0 || poTerms.gstin.length !== 15 || isGenerating}
              onClick={handleGeneratePO}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {revisionPO?.status === 'needs_revision' ? "Resubmit for Approval" : revisionPO ? "Send Back to Draft" : "Generate Purchase Order"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          {/* Registry with Tabs Integration */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-0">
            <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-slate-200/60 bg-slate-50/50 p-1">
              <TabsList className="h-auto p-0 bg-transparent flex w-max min-w-full rounded-none border-none gap-1">
                <TabsTrigger 
                  value="all" 
                  className="data-active:bg-[#001529] data-active:text-white data-active:shadow-md rounded-lg px-4 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-normal group border border-slate-200 data-active:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80"
                >
                  <FileText className="h-3.5 w-3.5 group-data-active:text-[#7FD1E3] transition-colors" />
                  PO Registry
                </TabsTrigger>
                <TabsTrigger 
                  value="pending" 
                  className="data-active:bg-[#001529] data-active:text-white data-active:shadow-md rounded-lg px-4 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-normal group relative border border-slate-200 data-active:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80"
                >
                  <Clock className="h-3.5 w-3.5 group-data-active:text-amber-400 transition-colors" />
                  GRN Registry
                  {pendingFulfilmentCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-semibold h-[21px] w-[21px] rounded-full flex items-center justify-center border border-white shadow-sm ring-2 ring-white">
                      {pendingFulfilmentCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="reconciliation" 
                  className="data-active:bg-[#001529] data-active:text-white data-active:shadow-md rounded-lg px-4 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-normal group border border-slate-200 data-active:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80 relative"
                >
                  <Scale className="h-3.5 w-3.5 group-data-active:text-[#7FD1E3] transition-colors" />
                  3-Way Match Audit
                  {auditActionCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-semibold h-[21px] w-[21px] rounded-full flex items-center justify-center border border-white shadow-sm ring-2 ring-white">
                      {auditActionCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="returns" 
                  className="data-active:bg-[#001529] data-active:text-white data-active:shadow-md rounded-lg px-4 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-normal group border border-slate-200 data-active:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80 relative"
                >
                  <RotateCcw className="h-3.5 w-3.5 group-data-active:text-orange-400 transition-colors" />
                  Purchase Returns
                  {returnActionCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-semibold h-[21px] w-[21px] rounded-full flex items-center justify-center border border-white shadow-sm ring-2 ring-white">
                      {returnActionCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="discrepancy" 
                  className="data-active:bg-[#001529] data-active:text-white data-active:shadow-md rounded-lg px-4 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-normal group data-active:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80 border border-slate-200 relative"
                >
                  <ShieldAlert className="h-3.5 w-3.5 group-data-active:text-red-400 transition-colors" />
                  Discrepancy Report
                  {discrepancyActionCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-semibold h-[21px] w-[21px] rounded-full flex items-center justify-center border border-white shadow-sm ring-2 ring-white">
                      {discrepancyActionCount}
                    </span>
                  )}
                </TabsTrigger>
        </TabsList>
      </div>

        <TabsContent value="all" className="animate-in slide-in-from-left-2 duration-300 mt-0">
          <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none py-0">
                        <CardHeader className="bg-[#001529]/95 backdrop-blur-md sticky top-0 z-20 pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none shadow-[0_4px_12px_-4px_rgba(0,21,41,0.35)] text-white">

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <FileText className="h-5 w-5 text-white" />
                      Purchase Order Registry
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                          "gap-2 border-white/20 h-8 shadow-sm transition-all text-xs bg-white/5 text-white hover:bg-[#7FD1E3] hover:text-[#001529] hover:border-[#7FD1E3] font-bold group",
                          showFilters && "bg-[#7FD1E3] text-[#001529] border-[#7FD1E3]"
                        )}
                      >
                        <Settings2 className={cn("h-3.5 w-3.5 transition-colors", showFilters ? "text-[#001529]" : "text-white group-hover:text-[#001529]")} />
                        {showFilters ? "Hide Filters" : "Advance Filters"}
                      </Button>

                      <Button
                        onClick={() => {
                          setIsCreatingPO(true)
                          setSelectedPO(null)
                        }}
                        size="sm"
                        className="bg-white text-[#001529] hover:bg-slate-100 gap-2 shadow-md h-8 text-xs px-4 font-bold border-none"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create New PO
                      </Button>

                      <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest text-white/40 border-white/10">
                        Corporate Archive
                      </Badge>
                    </div>
                  </div>

                  {showFilters && (
                    <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                      <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input
                          placeholder="Search PO Number, Vendor or Item..."
                          className="pl-9 h-8 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/30 rounded-lg text-xs"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                        <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Ship To</span>
                        <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v || "all")}>
                          <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                            <SelectValue placeholder="All Branches" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#001529] border-white/10 text-white">
                            <SelectItem value="all">All Branches</SelectItem>
                            {branches.map(b => (
                              <SelectItem key={b.id} value={b.id} className="focus:bg-white/10 focus:text-[#7FD1E3]">{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                        <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Status</span>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
                          <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#001529] border-white/10 text-white">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending_approval" className="focus:bg-white/10 focus:text-[#7FD1E3]">Pending</SelectItem>
                            <SelectItem value="approved" className="focus:bg-white/10 focus:text-[#7FD1E3]">Approved</SelectItem>
                            <SelectItem value="partially_received" className="focus:bg-white/10 focus:text-[#7FD1E3]">Partial</SelectItem>
                            <SelectItem value="received" className="focus:bg-white/10 focus:text-[#7FD1E3]">Received</SelectItem>
                            <SelectItem value="cancelled" className="focus:bg-white/10 focus:text-[#7FD1E3]">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(searchTerm || statusFilter !== "all" || branchFilter !== "all") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("")
                            setStatusFilter("all")
                            setBranchFilter("all")
                          }}
                          className="h-7 text-white/40 hover:text-white hover:bg-white/5 text-[9px] font-bold uppercase tracking-widest ml-auto gap-2"
                        >
                          <X className="h-3 w-3" />
                          Clear All
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[calc(100vh-380px)] border-b scrollbar-thin scrollbar-thumb-slate-200">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">PO Number</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Payment</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Item</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Status</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Total Amount</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] text-left">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPOs
                          .map((po) => (
                            <TableRow
                              key={po.id}
                              className="group hover:bg-slate-50/50 transition-colors border-b last:border-0 text-xs"
                            >
                              <TableCell
                                className="py-2 px-2 font-bold text-[#001529] font-mono cursor-pointer hover:underline border-r border-slate-100/50"
                                onClick={() => setViewingPO(po)}
                              >
                                {po.po_number}
                              </TableCell>
                              <TableCell className="py-2 px-2 font-semibold text-slate-600 border-r border-slate-100/50">{po.vendor?.name}</TableCell>
                              <TableCell className="py-2 px-2 border-r border-slate-100/50">
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                                  {po.payment_terms || po.vendor?.payment_terms || 'Immediate'}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 px-2 text-slate-500 border-r border-slate-100/50">
                                <div className="font-semibold text-slate-700">
                                  {po.items[0]?.product?.model_name || '---'}
                                </div>
                                {po.items.length > 1 && (
                                  <div className="text-[9px] text-slate-400 font-bold uppercase">
                                    + {po.items.length - 1} OTHER ITEMS
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-2 px-2 border-r border-slate-100/50">
                                <Badge className={
                                  po.status === 'received' ? "bg-green-100 text-green-700 hover:bg-green-200 text-[9px] px-1.5 py-0 font-bold" :
                                    po.status === 'approved' ? "bg-blue-100 text-blue-700 hover:bg-blue-200 text-[9px] px-1.5 py-0 font-bold" :
                                      po.status === 'cancelled' ? "bg-red-100 text-red-700 hover:bg-red-200 text-[9px] px-1.5 py-0 font-bold" :
                                        po.status === 'partially_received' ? "bg-amber-100 text-amber-700 hover:bg-amber-200 text-[9px] px-1.5 py-0 font-bold" :
                                          po.status === 'needs_revision' ? "bg-orange-100 text-orange-700 hover:bg-orange-200 text-[9px] px-1.5 py-0 font-bold border border-orange-200" :
                                            po.status === 'PARTIALLY_RETURNED' ? "bg-pink-100 text-pink-700 hover:bg-pink-200 text-[9px] px-1.5 py-0 font-bold" :
                                              po.status === 'RETURNED' ? "bg-rose-100 text-rose-700 hover:bg-rose-200 text-[9px] px-1.5 py-0 font-bold" :
                                                po.status === 'SHORT_CLOSED' ? "bg-slate-100 text-slate-500 hover:bg-slate-200 text-[9px] px-1.5 py-0 font-bold border border-slate-200" :
                                                  "bg-slate-100 text-slate-700 hover:bg-slate-200 text-[9px] px-1.5 py-0 font-bold"
                                }>
                                  {po.status === 'partially_received' ? 'PARTIAL' : po.status === 'needs_revision' ? 'NEEDS REVISION' : po.status === 'SHORT_CLOSED' ? 'SHORT-CLOSED' : po.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 px-2 font-bold text-[#001529] border-r border-slate-100/50">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger render={
                                      <span className="cursor-help hover:text-blue-600 transition-colors">
                                        {formatCurrency(po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity) * (1 + Number(item.tax_rate) / 100)), 0))}
                                      </span>
                                    } />
                                    <TooltipContent className="bg-[#001529] text-white border-slate-700 w-64">
                                      <div className="space-y-2 text-[10px]">
                                        <div className="flex justify-between gap-4">
                                          <span className="text-white/60 uppercase font-bold tracking-wider text-[8px]">Excl. Tax</span>
                                          <span className="font-mono">{formatCurrency(po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity)), 0))}</span>
                                        </div>
                                        <div className="space-y-1 border-t border-white/10 pt-2">
                                          <p className="text-[8px] font-black uppercase text-blue-400 tracking-widest mb-1">GST Breakdown</p>
                                          {Object.entries(
                                            po.items.reduce((acc: Record<number, { tax: number }>, item) => {
                                              const rate = Number(item.tax_rate);
                                              const tax = Number(item.unit_price) * Number(item.quantity) * (rate / 100);
                                              if (!acc[rate]) acc[rate] = { tax: 0 };
                                              acc[rate].tax += tax;
                                              return acc;
                                            }, {} as Record<number, { tax: number }>)
                                          ).map(([rate, data]) => (
                                            <div key={rate} className="flex justify-between text-[9px]">
                                              <span className="opacity-60">Rate @ {rate}%:</span>
                                              <span className="font-mono">{formatCurrency(data.tax / 2)} + {formatCurrency(data.tax / 2)}</span>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="flex justify-between gap-4 border-t border-white/20 pt-1 font-black text-blue-400">
                                          <span className="uppercase tracking-wider text-[8px]">Total GST</span>
                                          <span className="font-mono">{formatCurrency(po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity) * Number(item.tax_rate) / 100), 0))}</span>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-left py-4 px-2">
                                <div className="flex items-center gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger render={
                                      <Button className="bg-[#001529] text-white hover:bg-slate-800 border-none shadow-md font-bold h-8 text-[11px] gap-2 px-4 transition-all active:scale-95">
                                        Actions <ChevronDown className="h-3 w-3" />
                                      </Button>
                                    } />
                                    <DropdownMenuContent align="end" className="w-56">
                                      {po.status === 'pending_approval' && (
                                        <>
                                          {isAdmin && (
                                            <>
                                              <DropdownMenuItem 
                                                onClick={() => handleApprovePO(po.id)}
                                                className="text-green-600 focus:text-green-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                                disabled={approvingId === po.id}
                                              >
                                                <CheckCircle2 className="h-4 w-4 mr-2" /> Approve PO
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  setRevisionDialogPO(po)
                                                  setRevisionNotesInput("")
                                                }}
                                                className="text-amber-600 focus:text-amber-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                              >
                                                <RotateCcw className="h-4 w-4 mr-2" /> Revise PO
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onClick={() => handleRejectPO(po.id)}
                                                className="text-red-600 focus:text-red-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                              >
                                                <XCircle className="h-4 w-4 mr-2" /> Reject PO
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                        </>
                                      )}
                                      {po.status === 'needs_revision' && (
                                        <DropdownMenuItem 
                                          onClick={() => handleEditResubmit(po)}
                                          className="text-amber-600 focus:text-amber-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                        >
                                          <RotateCcw className="h-4 w-4 mr-2" /> Edit &amp; Resubmit
                                        </DropdownMenuItem>
                                      )}

                                      {po.status === 'draft' && (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            const res = await fetch('/api/procurement/purchase-orders', {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ id: po.id, status: 'pending_approval' })
                                            })
                                            if (res.ok) {
                                              const poRes = await fetch('/api/procurement/purchase-orders')
                                              setActivePOs(await poRes.json())
                                            }
                                          }}
                                          className="text-blue-600 focus:text-blue-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                        >
                                          <CheckCircle2 className="h-4 w-4 mr-2" /> Submit for Approval
                                        </DropdownMenuItem>
                                      )}

                                      {(po.status === 'approved' || po.status === 'partially_received') && (
                                        <>
                                          <DropdownMenuItem 
                                            onClick={(e) => { e.stopPropagation(); setSelectedPO(po); }}
                                            className="text-[#001529] focus:text-[#001529] cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                          >
                                            <Truck className="h-4 w-4 mr-2" /> Process GRN
                                          </DropdownMenuItem>

                                          {po.status === 'partially_received' && isAdmin && (
                                            <DropdownMenuItem 
                                              onClick={(e) => { e.stopPropagation(); setShortClosingPO(po); }}
                                              className="text-slate-500 focus:text-slate-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                            >
                                              <Ban className="h-4 w-4 mr-2" /> Short-Close PO
                                            </DropdownMenuItem>
                                          )}
                                        </>
                                      )}

                                      {(po.status === 'received' || po.status === 'partially_received' || po.status === 'RETURNED' || po.status === 'PARTIALLY_RETURNED') && (
                                        <>
                                          {po.grns && po.grns.length > 0 ? (
                                            po.grns.map((grn) => (
                                              <DropdownMenuItem 
                                                key={grn.id}
                                                onSelect={(e) => e.preventDefault()}
                                                onClick={() => handleDownloadGRN(po, grn.id)}
                                                className="text-emerald-600 focus:text-emerald-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                                disabled={isDownloading === grn.id + '_grn'}
                                              >
                                                {isDownloading === grn.id + '_grn' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-2" />}
                                                {po.grns && po.grns.length > 1 ? `View GRN: ${grn.grn_number}` : "View GRN"}
                                              </DropdownMenuItem>
                                            ))
                                          ) : (
                                            <DropdownMenuItem 
                                              onSelect={(e) => e.preventDefault()}
                                              onClick={() => handleDownloadGRN(po)}
                                              className="text-emerald-600 focus:text-emerald-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                              disabled={isDownloading === po.id + '_grn'}
                                            >
                                              {isDownloading === po.id + '_grn' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                                              View GRN
                                            </DropdownMenuItem>
                                          )}
                                        </>
                                      )}


                                        <DropdownMenuItem 
                                          onSelect={(e) => e.preventDefault()}
                                          onClick={() => setViewingPO(po)} 
                                          className="cursor-pointer font-bold text-[10px] uppercase tracking-wider text-slate-700"
                                        >
                                          <FileText className="h-4 w-4 mr-2" /> View Purchase Order
                                        </DropdownMenuItem>

                                        {po.vendor_bills && po.vendor_bills.length > 0 ? (
                                          <DropdownMenuItem 
                                            onSelect={(e) => e.preventDefault()}
                                            onClick={() => setViewingInvoices(po)} 
                                            className="text-blue-600 focus:text-blue-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                          >
                                            <FileCheck className="h-4 w-4 mr-2" /> View Voice/Bill
                                          </DropdownMenuItem>
                                        ) : (
                                          (po.status === 'approved' || po.status === 'partially_received' || po.status === 'received' || po.status === 'PARTIALLY_RETURNED') && (
                                            <DropdownMenuItem 
                                              onSelect={(e) => e.preventDefault()}
                                              onClick={() => setUploadBillPO(po)} 
                                              className="text-amber-600 focus:text-amber-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                            >
                                              <Upload className="h-4 w-4 mr-2" /> Upload Bill Details
                                            </DropdownMenuItem>
                                          )
                                        )}
                                        
                                        {/* Lead Architect: Always allow additional uploads if bills exist but it's a Partial Billing PO */}
                                        {po.vendor_bills && po.vendor_bills.length > 0 && po.is_partial_billing && (
                                          <DropdownMenuItem 
                                            onSelect={(e) => e.preventDefault()}
                                            onClick={() => setUploadBillPO(po)} 
                                            className="text-amber-600 focus:text-amber-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                          >
                                            <Plus className="h-4 w-4 mr-2" /> Upload Addl. Bill
                                          </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {activePOs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-16">
                              <div className="flex flex-col items-center gap-2 grayscale opacity-50">
                                <PackageSearch className="h-12 w-12" />
                                <p className="text-slate-500">No purchase orders found</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

        <TabsContent value="pending" className="animate-in slide-in-from-right-2 duration-300 mt-0">
          <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none py-0">
            <CardHeader className="bg-[#001529]/95 backdrop-blur-md sticky top-0 z-20 pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none shadow-[0_4px_12px_-4px_rgba(0,21,41,0.35)] text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <Clock className="h-5 w-5 text-amber-400" />
                      GRN Registry
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowPendingFilters(!showPendingFilters)}
                        className={cn(
                          "gap-2 border-white/20 h-8 shadow-sm transition-all text-xs bg-white/5 text-white hover:bg-amber-400 hover:text-[#001529] hover:border-amber-400 font-bold group",
                          showPendingFilters && "bg-amber-400 text-[#001529] border-amber-400"
                        )}
                      >
                        <Settings2 className={cn("h-3.5 w-3.5 transition-colors", showPendingFilters ? "text-[#001529]" : "text-white group-hover:text-[#001529]")} />
                        {showPendingFilters ? "Hide Filters" : "Advance Filters"}
                      </Button>

                      <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-white/40 border-white/10">
                        Unfulfilled Stock
                      </Badge>
                    </div>
                  </div>

                  {showPendingFilters && (
                    <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                      <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input
                          placeholder="Search PO Number, Vendor or Item..."
                          className="pl-9 h-8 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/30 rounded-lg text-xs"
                          value={pendingSearch}
                          onChange={(e) => setPendingSearch(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                        <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Branch</span>
                        <Select value={pendingBranchFilter} onValueChange={(v) => setPendingBranchFilter(v || "all")}>
                          <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                            <SelectValue placeholder="All Branches" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#001529] border-white/10 text-white">
                            <SelectItem value="all">All Branches</SelectItem>
                            {branches.map(b => (
                              <SelectItem key={b.id} value={b.id} className="focus:bg-white/10 focus:text-[#7FD1E3]">{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(pendingSearch || pendingBranchFilter !== "all") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPendingSearch("")
                            setPendingBranchFilter("all")
                          }}
                          className="h-7 text-white/40 hover:text-white hover:bg-white/5 text-[9px] font-bold uppercase tracking-widest ml-auto gap-2"
                        >
                          <X className="h-3 w-3" />
                          Clear All
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[calc(100vh-380px)] border-b scrollbar-thin scrollbar-thumb-slate-200">
                    <Table>
                    <TableHeader className="bg-slate-50 border-b sticky top-0 z-10 shadow-sm transition-all duration-300">
                      <TableRow>
                        <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">PO Number</TableHead>
                        <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Delayed By</TableHead>
                        <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor</TableHead>
                        <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-[300px]">Item Progress</TableHead>
                        <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePOs
                        .filter(p => (p.status === 'approved' || p.status === 'partially_received'))
                        .filter(p => {
                          const branchMatch = pendingBranchFilter === "all" || p.branch_id === pendingBranchFilter;
                          const searchMatch = !pendingSearch || 
                            p.po_number.toLowerCase().includes(pendingSearch.toLowerCase()) || 
                            p.vendor?.name?.toLowerCase().includes(pendingSearch.toLowerCase());
                          return branchMatch && searchMatch;
                        })
                        .map((po) => {
                          const daysOutstanding = Math.floor((new Date().getTime() - new Date(po.created_at).getTime()) / (1000 * 3600 * 24));
                          return (
                            <TableRow key={po.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0 text-xs text-xs">
                              <TableCell className="py-2 px-2 border-r border-slate-100/50">
                                <div className="font-bold text-[#001529] font-mono">{po.po_number}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{po.branch?.name}</div>
                              </TableCell>
                              <TableCell className="py-2 px-2 border-r border-slate-100/50">
                                <div className="flex items-center gap-1.5">
                                  <div className={`h-2 w-2 rounded-full ${daysOutstanding > 5 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                                  <span className={`font-bold ${daysOutstanding > 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {daysOutstanding} Days
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 px-2 border-r border-slate-100/50 font-semibold text-slate-600">
                                {po.vendor?.name}
                              </TableCell>
                              <TableCell className="py-4 px-2">
                                <div className="space-y-3">
                                  {po.items.map((item) => {
                                    const progress = (item.received_quantity / item.quantity) * 100;
                                    return (
                                      <div key={item.id} className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-medium text-slate-500">
                                          <span>{item.product.model_name}</span>
                                          <span className={progress === 100 ? "text-green-600 font-bold" : "text-slate-900"}>
                                            {item.received_quantity} / {item.quantity}
                                          </span>
                                        </div>
                                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                                            <div
                                              className={cn(
                                                "h-full transition-all duration-700",
                                                progress === 100 ? "bg-green-500 w-full" : 
                                                progress >= 75 ? "bg-[#7FD1E3] w-3/4" :
                                                progress >= 50 ? "bg-[#7FD1E3] w-1/2" :
                                                progress >= 25 ? "bg-[#7FD1E3] w-1/4" :
                                                progress > 0 ? "bg-[#7FD1E3] w-[10%]" : "w-0"
                                              )}
                                            />
                                          </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-4 px-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={
                                    <Button className="bg-[#001529] text-white hover:bg-slate-800 border-none shadow-md font-bold h-8 text-[11px] gap-2 px-4 transition-all active:scale-95">
                                      Actions <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  } />
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      onClick={() => setSelectedPO(po)}
                                      className="text-[#001529] focus:text-[#001529] cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                    >
                                      <Truck className="h-4 w-4 mr-2" /> Process GRN
                                    </DropdownMenuItem>
                                    {isAdmin && (
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        onClick={() => setShortClosingPO(po)}
                                        className="text-slate-500 focus:text-slate-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                      >
                                        <Ban className="h-4 w-4 mr-2" /> Short-Close PO
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      onClick={() => setViewingPO(po)} 
                                      className="cursor-pointer font-bold text-[10px] uppercase tracking-wider text-slate-700"
                                    >
                                      <FileText className="h-4 w-4 mr-2" /> View Purchase Order
                                    </DropdownMenuItem>

                                    {po.items.some(i => i.received_quantity > 0) && (
                                      <>
                                        {po.grns && po.grns.length > 0 ? (
                                          po.grns.map((grn) => (
                                            <DropdownMenuItem 
                                              key={grn.id}
                                              onSelect={(e) => e.preventDefault()}
                                              onClick={() => handleDownloadGRN(po, grn.id)}
                                              className="text-emerald-600 focus:text-emerald-600 cursor-pointer font-bold text-[10px]"
                                              disabled={isDownloading === grn.id + '_grn'}
                                            >
                                              {isDownloading === grn.id + '_grn' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-2" />}
                                              {po.grns && po.grns.length > 1 ? `View GRN: ${grn.grn_number}` : "View GRN"}
                                            </DropdownMenuItem>
                                          ))
                                        ) : (
                                          <DropdownMenuItem 
                                            onSelect={(e) => e.preventDefault()}
                                            onClick={() => handleDownloadGRN(po)}
                                            className="text-emerald-600 focus:text-emerald-600 cursor-pointer font-medium"
                                          >
                                            {isDownloading === po.id + '_grn' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                                            View Latest GRN
                                          </DropdownMenuItem>
                                        )}
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      {activePOs.filter(p => p.status === 'approved' || p.status === 'partially_received').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-20">
                            <div className="flex flex-col items-center gap-3">
                              <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                                <CheckCircle2 className="h-8 w-8" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-lg font-bold text-slate-900">All shipments fulfilled</p>
                                <p className="text-sm text-slate-500">There are no pending deliveries at this time.</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              </Card>
            </TabsContent>
        <TabsContent value="reconciliation" className="animate-in slide-in-from-right-2 duration-300 mt-0">
          <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none py-0">
            <CardHeader className="bg-[#001529]/95 backdrop-blur-md sticky top-0 z-20 pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none shadow-[0_4px_12px_-4px_rgba(0,21,41,0.35)] text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <Scale className="h-5 w-5 text-[#7FD1E3]" />
                        3-Way Match Verification
                      </CardTitle>
                      <CardDescription className="text-white/40 text-[11px] font-medium leading-tight">
                        Auditing Purchase Agreements vs. Receiving Reality vs. Vendor Demand
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowAuditFilters(!showAuditFilters)}
                        className={cn(
                          "gap-2 border-white/20 h-8 shadow-sm transition-all text-xs bg-white/5 text-white hover:bg-[#7FD1E3] hover:text-[#001529] hover:border-[#7FD1E3] font-bold group",
                          showAuditFilters && "bg-[#7FD1E3] text-[#001529] border-[#7FD1E3]"
                        )}
                      >
                        <Settings2 className={cn("h-3.5 w-3.5 transition-colors", showAuditFilters ? "text-[#001529]" : "text-white group-hover:text-[#001529]")} />
                        {showAuditFilters ? "Hide Filters" : "Advance Filters"}
                      </Button>

                      <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-white/40 border-white/10">
                        Oversight Engine
                      </Badge>
                    </div>
                  </div>

                  {showAuditFilters && (
                    <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                      <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input
                          placeholder="Search PO Reference..."
                          className="pl-9 h-8 border-white/10 bg-white/5 focus-visible:bg-white/10 text-white placeholder:text-white/30 rounded-lg text-xs"
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                        <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Match Status</span>
                        <Select value={auditMatchFilter} onValueChange={(v) => setAuditMatchFilter(v || "all")}>
                          <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0 text-xs font-bold h-7 p-0 bg-transparent text-white">
                            <SelectValue placeholder="All Results" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#001529] border-white/10 text-white">
                            <SelectItem value="all">All Results</SelectItem>
                            <SelectItem value="match" className="focus:bg-white/10 focus:text-[#7FD1E3]">Full Match</SelectItem>
                            <SelectItem value="variance" className="focus:bg-white/10 focus:text-[#7FD1E3]">Variance</SelectItem>
                            <SelectItem value="pending" className="focus:bg-white/10 focus:text-[#7FD1E3]">Pending Bill</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(auditSearch || auditMatchFilter !== "all") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAuditSearch("")
                            setAuditMatchFilter("all")
                          }}
                          className="h-7 text-white/40 hover:text-white hover:bg-white/5 text-[9px] font-bold uppercase tracking-widest ml-auto gap-2"
                        >
                          <X className="h-3 w-3" />
                          Clear All
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[calc(100vh-380px)] border-b scrollbar-thin scrollbar-thumb-slate-200">
                    <Table>
                    <TableHeader className="bg-slate-50 border-b sticky top-0 z-10 shadow-sm transition-all duration-300">
                        <TableRow>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">PO Reference</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Delayed By</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Ordered Amount</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Received Value</TableHead>
                           <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor&apos;s Invoice</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center">Status</TableHead>
                          <TableHead className="py-2.5 px-2 font-bold text-slate-400 tracking-wider text-[9px] text-left">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePOs
                        .filter(p => p.status === 'received' || p.status === 'partially_received' || p.status === 'PARTIALLY_RETURNED' || p.status === 'SHORT_CLOSED')
                        .filter(p => {
                          const searchMatch = !auditSearch || p.po_number.toLowerCase().includes(auditSearch.toLowerCase()) || p.vendor?.name?.toLowerCase().includes(auditSearch.toLowerCase());
                          
                          if (auditMatchFilter === "all") return searchMatch;
                          
                          const poTotal = p.items.reduce((acc, item) => acc + (Number(item.unit_price) * item.quantity * (1 + (Number(item.tax_rate) || 0) / 100)), 0);
                          const grnTotal = p.items.reduce((acc, item) => acc + (Number(item.unit_price) * item.received_quantity * (1 + (Number(item.tax_rate) || 0) / 100)), 0);
                          const billAmount = p.vendor_bills?.reduce((acc: number, b: VendorBill) => acc + Number(b.bill_amount), 0) || 0;
                          const hasBill = p.vendor_bills?.length > 0;
                          const isMatch = (Math.abs(poTotal - billAmount) < 1 && Math.abs(grnTotal - billAmount) < 1) || 
                                           p.discrepancies?.some((d: { status: string }) => d.status === 'Resolved' || d.status === 'resolved');
                          
                          if (auditMatchFilter === "match") return searchMatch && hasBill && isMatch;
                          if (auditMatchFilter === "variance") return searchMatch && hasBill && !isMatch;
                          if (auditMatchFilter === "pending") return searchMatch && !hasBill;
                          
                          return searchMatch;
                        })
                        .map((po) => {
                             const subtotal = po.items.reduce((acc, item) => {
                               const qtyToAudit = po.status === 'SHORT_CLOSED' ? Number(item.received_quantity) : Number(item.quantity);
                               return acc + (Number(item.unit_price) * qtyToAudit);
                             }, 0);
                             const taxTotal = po.items.reduce((acc, item) => {
                               const qtyToAudit = po.status === 'SHORT_CLOSED' ? Number(item.received_quantity) : Number(item.quantity);
                               return acc + (Number(item.unit_price) * qtyToAudit * (Number(item.tax_rate) / 100));
                             }, 0);
                             const poTotal = subtotal + taxTotal;
                             
                             const grnSubtotal = po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.received_quantity)), 0);
                             const grnTaxTotal = po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.received_quantity) * (Number(item.tax_rate) / 100)), 0);
                             const grnFreightTotal = po.grns?.reduce((acc: number, grn: { grn_items?: { freight_value: number }[] }) => 
                               acc + (grn.grn_items?.reduce((iAcc: number, item: { freight_value: number }) => iAcc + Number(item.freight_value || 0), 0) || 0), 0) || 0;
                             const grnTotal = grnSubtotal + grnTaxTotal + grnFreightTotal;
                             
                             const billAmount = po.vendor_bills?.reduce((acc: number, b: VendorBill) => acc + Number(b.bill_amount), 0) || 0;
                             
                             const hasOpenDiscrepancy = po.discrepancies?.some((d: { status: string }) => d.status === 'Open' || d.status === 'open');
                             const isMatch = !hasOpenDiscrepancy && 
                                            Math.abs(poTotal - billAmount) < 1 && 
                                            Math.abs(grnTotal - billAmount) < 1;
                             
                             const matchesPO = !hasOpenDiscrepancy && Math.abs(poTotal - billAmount) < 1;
                            const hasBill = po.vendor_bills?.length > 0;
                            const daysOutstanding = Math.floor((new Date().getTime() - new Date(po.created_at).getTime()) / (1000 * 3600 * 24));

                           return (
                             <TableRow key={po.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0 text-xs">
                               <TableCell className="py-2 px-2 border-r border-slate-100/50 font-bold font-mono text-[#001529]">{po.po_number}</TableCell>
                               <TableCell className="py-2 px-2 border-r border-slate-100/50">
                                 <div className="flex items-center gap-1.5">
                                   <div className={`h-2 w-2 rounded-full ${daysOutstanding > 5 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                                   <span className={`font-bold ${daysOutstanding > 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                     {daysOutstanding} Days
                                   </span>
                                 </div>
                               </TableCell>
                               <TableCell className="py-2 px-2 border-r border-slate-100/50 font-semibold text-slate-600">{po.vendor?.name}</TableCell>
                               <TableCell className="py-2 px-2 border-r border-slate-100/50 font-bold text-slate-500">
                                 <TooltipProvider>
                                   <Tooltip>
                                     <TooltipTrigger render={
                                       <span className="cursor-help hover:text-blue-600 transition-colors">
                                         {formatCurrency(poTotal)}
                                       </span>
                                     } />
                                     <TooltipContent className="bg-[#001529] text-white border-slate-700">
                                       <div className="space-y-1 text-[10px]">
                                         <div className="flex justify-between gap-4">
                                           <span className="text-white/60 uppercase font-bold tracking-wider text-[8px]">Excl. Tax</span>
                                           <span className="font-mono">{formatCurrency(subtotal)}</span>
                                         </div>
                                         <div className="flex justify-between gap-4 border-t border-white/10 pt-1">
                                           <span className="text-white/60 uppercase font-bold tracking-wider text-[8px]">GST Amount</span>
                                           <span className="font-mono">{formatCurrency(taxTotal)}</span>
                                         </div>
                                       </div>
                                     </TooltipContent>
                                   </Tooltip>
                                 </TooltipProvider>
                               </TableCell>
                               <TableCell className="py-2 px-2 border-r border-slate-100/50 font-bold text-blue-600">
                                 <TooltipProvider>
                                   <Tooltip>
                                     <TooltipTrigger render={
                                       <span className="cursor-help hover:text-blue-600 transition-colors">
                                         {formatCurrency(grnTotal)}
                                       </span>
                                     } />
                                     <TooltipContent className="bg-[#001529] text-white border-slate-700">
                                       <div className="space-y-1 text-[10px]">
                                         <div className="flex justify-between gap-4">
                                           <span className="text-white/60 uppercase font-bold tracking-wider text-[8px]">Excl. Tax</span>
                                           <span className="font-mono">{formatCurrency(grnSubtotal)}</span>
                                         </div>
                                         <div className="flex justify-between gap-4 border-t border-white/10 pt-1">
                                           <span className="text-white/60 uppercase font-bold tracking-wider text-[8px]">GST Amount</span>
                                           <span className="font-mono">{formatCurrency(grnTaxTotal)}</span>
                                         </div>
                                       </div>
                                     </TooltipContent>
                                   </Tooltip>
                                 </TooltipProvider>
                               </TableCell>
                               <TableCell className={cn(
                                 "py-2 px-2 border-r border-slate-100/50 font-bold",
                                 hasBill 
                                   ? (matchesPO ? "text-[#001529]" : "text-red-600 font-black underline decoration-double") 
                                   : "text-amber-600"
                               )}>
                                 {hasBill ? formatCurrency(billAmount) : "Awaiting Bill"}
                               </TableCell>
                              <TableCell className="text-center">
                                {hasBill ? (
                                  isMatch ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                      <ShieldCheck className="h-3 w-3 mr-1" /> MATCHED
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 animate-pulse">
                                      <ShieldAlert className="h-3 w-3 mr-1" /> VARIANCE
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="text-slate-400">PENDING</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-left py-4 px-2">
                                <div className="flex justify-start gap-2">
                                  <DropdownMenu>
                                  <DropdownMenuTrigger render={
                                    <Button className="bg-[#001529] text-white hover:bg-slate-800 border-none shadow-md font-bold h-8 text-[11px] gap-2 px-4 transition-all active:scale-95">
                                      Actions <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  } />
                                  <DropdownMenuContent align="end" className="w-56">

                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        onClick={() => {
                                          if (!isMatch) {
                                            setActiveTab('discrepancy');
                                          } else {
                                            setViewingPO(po);
                                          }
                                        }} 
                                        className="cursor-pointer font-bold text-[10px] uppercase tracking-wider text-[#001529]"
                                      >
                                        <Search className="h-4 w-4 mr-2" /> Audit & Reconcile
                                      </DropdownMenuItem>


                                    {po.items.some(i => i.received_quantity > 0) && (
                                      <>
                                        {po.grns && po.grns.length > 0 ? (
                                          po.grns.map((grn) => (
                                            <DropdownMenuItem 
                                              key={grn.id}
                                              onSelect={(e) => e.preventDefault()}
                                              onClick={() => handleDownloadGRN(po, grn.id)}
                                              className="text-emerald-600 focus:text-emerald-600 cursor-pointer font-bold text-[10px]"
                                              disabled={isDownloading === grn.id + '_grn'}
                                            >
                                              {isDownloading === grn.id + '_grn' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-2" />}
                                              {po.grns && po.grns.length > 1 ? `View GRN: ${grn.grn_number}` : "View GRN"}
                                            </DropdownMenuItem>
                                          ))
                                        ) : (
                                          <DropdownMenuItem 
                                            onSelect={(e) => e.preventDefault()}
                                            onClick={() => handleDownloadGRN(po)}
                                            className="text-emerald-600 focus:text-emerald-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                            disabled={isDownloading === po.id + '_grn'}
                                          >
                                            {isDownloading === po.id + '_grn' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                                            View GRN
                                          </DropdownMenuItem>
                                        )}
                                      </>
                                    )}
                                      
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      onClick={() => setUploadBillPO(po)} 
                                      className="cursor-pointer font-bold text-[10px] uppercase tracking-wider text-amber-600 focus:text-amber-600"
                                    >
                                      <Upload className="h-4 w-4 mr-2" /> {hasBill ? "Upload Addl. Bill" : "Upload Bill Details"}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      onClick={() => setViewingPO(po)} 
                                      className="cursor-pointer font-bold text-[10px] uppercase tracking-wider text-[#001529]"
                                    >
                                      <FileText className="h-4 w-4 mr-2" /> View Purchase Order
                                    </DropdownMenuItem>

                                    {hasBill && (
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        onClick={() => setViewingInvoices(po)} 
                                        className="text-blue-600 focus:text-blue-600 cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                                      >
                                        <FileCheck className="h-4 w-4 mr-2" /> View Invoice
                                      </DropdownMenuItem>
                                    )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              </Card>
            </TabsContent>
        <TabsContent value="returns" className="animate-in slide-in-from-right-2 duration-300 mt-0">
          <ProcessReturns />
        </TabsContent>
        <TabsContent value="discrepancy" className="animate-in slide-in-from-right-2 duration-300 mt-0">
          <DiscrepancyReportPage />
        </TabsContent>
      </Tabs>
      </>
    )}

      {/* PO Detail View Modal */}
      {viewingPO && (
        <Dialog open={!!viewingPO} onOpenChange={(open) => {
          if (!open) {
            setViewingPO(null);

          }
        }}>
          <DialogContent className="w-[90vw] !max-w-[1200px] md:max-w-none h-[90vh] flex flex-col p-0 gap-0 border-none shadow-2xl rounded-xl overflow-hidden [&>button]:text-white">
            <DialogHeader className="bg-[#111827] p-8 text-white rounded-t-lg shrink-0">
              <div className="flex justify-between items-start w-full">
                {/* Left Side: PO Reference and Date */}
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tighter text-white m-0 leading-none">
                    Purchase Order
                  </h1>
                  <div className="space-y-1">
                    <p className="text-xl font-bold m-0 flex items-center gap-2">
                      <span className="opacity-60 text-sm uppercase tracking-widest font-black">Ref:</span>
                      {viewingPO.po_number}
                    </p>
                    <div className="text-slate-400 font-medium m-0 flex flex-col gap-1 text-sm">
                      <span className="flex items-center">
                        <span className="opacity-60 text-[10px] uppercase tracking-widest font-black mr-2">Date:</span>
                        {new Date(viewingPO.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="flex items-center">
                        <span className="opacity-60 text-[10px] uppercase tracking-widest font-black mr-2">Payment:</span>
                        <span className="text-blue-400 font-bold">{viewingPO.payment_terms || viewingPO.vendor?.payment_terms || 'Immediate'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: Approval Actions for Administrators */}
                {viewingPO.status === 'pending_approval' && isAdmin && (
                  <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                    <Button 
                      onClick={() => handleApprovePO(viewingPO.id)}
                      disabled={approvingId === viewingPO.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] px-6 h-10 shadow-lg shadow-emerald-900/20 gap-2 border-none"
                    >
                      {approvingId === viewingPO.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Approve Purchase Order
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleRejectPO(viewingPO.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] px-6 h-10 shadow-lg shadow-rose-900/20 gap-2 border-none"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject PO
                    </Button>
                  </div>
                )}

                {/* Right Side: Logo and Company Info */}
                <div className="text-right flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-black text-white m-0 uppercase tracking-tighter">Ethan Home Appliances</p>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-black m-0 text-[#7FD1E3]">Ops360 Enterprise ERP</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg">
                       <Image src="/ethan-logo.png" alt="Ethan Logo" width={40} height={40} className="h-10 w-auto object-contain" />
                    </div>
                  </div>
                  
                  {(() => {
                    const corporateHQ = branches.find(b => b.name === "Corporate Headquarters") || branches[0];
                    return (
                      <div className="text-[10px] text-slate-400 font-bold max-w-[280px] leading-tight mt-1 italic">
                        <p className="m-0 uppercase tracking-widest text-[#7FD1E3] mb-0.5">Corporate Headquarters</p>
                        <p className="m-0 mb-0.5 whitespace-nowrap">{corporateHQ?.full_address || 'Building 42, Innovation Hub, Kochi, Kerala'}</p>
                        <p className="m-0 uppercase tracking-widest font-black">GSTIN: {corporateHQ?.gstin || '32AAAAA0000A1Z5'}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8 bg-white">
              {/* 3-Column Metadata Grid */}
              <div className="grid md:grid-cols-3 gap-8 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <Building2 className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Ship-To Destination</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    {(() => {
                      const branch = branches.find(b => b.id === viewingPO.branch_id);
                      return (
                        <>
                          <p className="font-bold text-lg text-slate-900 leading-none">{branch?.name || viewingPO.branch.name}</p>
                          <p className="text-xs text-slate-500 font-medium mt-1">Branch Logistics Registry</p>
                          <p className="text-[10px] text-slate-400 mt-1 italic">{branch?.full_address || 'Address pending verification'}</p>
                          <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-wider">GSTIN: {branch?.gstin || '32BBBBB0000B1Z5'}</p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <Building2 className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Corporate Headquarters</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="font-bold text-lg text-slate-900">Ethan Home Appliances</p>
                    <p className="text-xs text-slate-500 font-medium">Ops360 Governance Hub</p>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Authorized Central Registry</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <Truck className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendor Partner</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="font-bold text-lg text-slate-900">{viewingPO.vendor.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{viewingPO.vendor.state}</p>
                    <p className="text-[10px] font-mono mt-1 text-slate-400">GSTIN: {vendors.find(v => v.id === viewingPO.vendor_id)?.gstin || 'Awaiting Verification'}</p>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Contractual Terms & Conditions
                  </h4>
                </div>
                <div className="relative group">
                  <Textarea
                    className="min-h-[120px] bg-slate-50 border-slate-200 text-xs leading-relaxed focus:bg-white transition-all resize-none font-medium text-slate-700"
                    placeholder="Enter specific PO terms..."
                    defaultValue={viewingPO.terms_content || "1. Supply as per agreed specifications and delivery schedule.\n2. Invoices must mention the PO Number and GSTIN of both parties.\n3. Subject to Bengaluru Jurisdiction."}

                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge variant="outline" className="bg-white/80 backdrop-blur-sm text-[8px] uppercase">Editable Document View</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-sm uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Line Item Breakdown
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableHead className="w-[50px] text-center font-black uppercase text-[9px] tracking-tight text-black">#</TableHead>
                          <TableHead className="w-[25%] min-w-[150px] font-black uppercase text-[9px] tracking-tight text-black">Model Specification</TableHead>
                          <TableHead className="font-black uppercase text-[9px] tracking-tight text-black">HSN/SAC</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] tracking-tight text-black">Qty</TableHead>
                          <TableHead className="text-right font-black uppercase text-[9px] tracking-tight text-black">Unit Price</TableHead>
                          <TableHead className="text-right font-black uppercase text-[9px] tracking-tight text-black min-w-[100px]">Tax Slab</TableHead>
                          <TableHead className="text-right font-black uppercase text-[9px] tracking-tight text-black">Total GST</TableHead>
                          <TableHead className="text-right font-black uppercase text-[9px] tracking-tight text-black">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingPO.items.map((item: POItem, idx: number) => {
                          const qty = Number(item.quantity)
                          const price = Number(item.unit_price)
                          const rate = Number(item.tax_rate)
                          const taxable = price * qty
                          const taxTotal = taxable * (rate / 100)
                          const lineTotal = taxable + taxTotal
  
                          return (
                            <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                              <TableCell className="text-center font-bold text-slate-400 text-xs align-top pt-4">{idx + 1}</TableCell>
                              <TableCell className="w-[25%] align-top pt-4 pb-4">
                                <div className="font-bold text-slate-900 text-xs whitespace-normal break-words leading-tight">{item.product?.model_name || 'Item'}</div>
                                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter mt-1">SKU: {item.product?.product_code}</div>
                              </TableCell>
                              <TableCell className="text-slate-500 font-mono text-[10px] font-bold tracking-tighter align-top pt-4">{item.product?.hsn_code || '---'}</TableCell>
                              <TableCell className="text-center font-black text-slate-900 text-sm align-top pt-4">{qty}</TableCell>
                              <TableCell className="text-right font-bold text-slate-600 align-top pt-4">{formatCurrency(price)}</TableCell>
                              <TableCell className="text-right align-top pt-4">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-[#001529]">GST @ {rate}%</span>
                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">({rate/2}% + {rate/2}%)</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-500 align-top pt-4">
                                {formatCurrency(taxTotal)}
                              </TableCell>
                              <TableCell className="text-right font-black text-[#001529] align-top pt-4">
                                {formatCurrency(lineTotal)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>



                {/* Lead Architect: Financial Flow & Totals */}
                <div className="flex justify-end pt-4">
                  <div className="w-[340px] space-y-2 p-6 rounded-2xl bg-[#001529]/5 border border-[#001529]/10 animate-in fade-in slide-in-from-right-4">
                    {(() => {
                      const netTaxableValue = viewingPO.items.reduce((acc: number, item: POItem) => acc + (Number(item.unit_price) * Number(item.quantity)), 0);
                      const taxTotal = viewingPO.items.reduce((acc: number, item: POItem) => acc + (Number(item.unit_price) * Number(item.quantity) * (Number(item.tax_rate) / 100)), 0);
                      const grandTotal = netTaxableValue + taxTotal;
                      
                      return (
                        <>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 uppercase tracking-tight">Net Taxable Value</span>
                            <span className="font-black text-slate-900">{formatCurrency(netTaxableValue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                            <span className="font-bold text-slate-500 uppercase tracking-tight">Total Tax (GST)</span>
                            <span className="font-black text-slate-900">{formatCurrency(taxTotal)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-[#001529] uppercase tracking-tighter leading-none">Grand Total</span>
                              <span className="text-[10px] text-blue-600 font-bold uppercase mt-1 px-2 p-0.5 rounded bg-blue-50 w-fit">{viewingPO.status.replace('_', ' ')}</span>
                            </div>
                            <span className="text-2xl font-black text-[#001529]">{formatCurrency(grandTotal)}</span>
                          </div>
                          <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
                             <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Total Value in Words</Label>
                             <p className="text-[10px] font-black text-[#001529] italic leading-tight">
                                {numberToWords(Math.round(grandTotal))}.
                             </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Document Verification Footer */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <ShieldCheck className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black uppercase tracking-tighter text-[#7FD1E3]">Document Verification</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">This is an electronically generated document. No physical signature is required.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Generated By</p>
                      <p className="text-xs font-bold uppercase">OPS360 ENTERPRISE ERP</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-[#7FD1E3] uppercase tracking-widest leading-none">Scan to Verify</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Authenticity</p>
                      </div>
                      <div className="bg-white p-1 rounded-lg">
                        <Image 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`OPS360-PO-VERIFY-${viewingPO.po_number}`)}`} 
                          alt="Verification QR" 
                          width={40}
                          height={40}
                          unoptimized
                          className="h-10 w-10 block grayscale contrast-125"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-8 border-t rounded-b-lg shrink-0">
              <div className="flex justify-end items-center w-full gap-4">
                <Button
                  variant="outline"
                  className="bg-white rounded-xl font-bold text-xs uppercase tracking-widest h-12 border-2 hover:bg-slate-100 hover:border-slate-300 transition-all px-8"
                  onClick={() => setViewingPO(null)}
                >
                  Close Document
                </Button>
                <Button
                  className="bg-[#001529] text-white hover:bg-slate-800 font-bold text-xs uppercase h-12 px-8 rounded-xl shadow-md transition-all active:scale-95 flex gap-2"
                  onClick={() => { handleDownloadPDF(viewingPO); }}
                  disabled={isDownloading === viewingPO.id}
                >
                  {isDownloading === viewingPO.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Generate Formal PDF
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* GRN Detail View Modal */}
      {viewingGRN && (
        <Dialog open={!!viewingGRN} onOpenChange={(open) => {
          if (!open) {
            setViewingGRN(null);
          }
        }}>
          <DialogContent className="w-[90vw] !max-w-[1200px] md:max-w-none h-[90vh] flex flex-col p-0 gap-0 border-none shadow-2xl rounded-xl overflow-hidden [&>button]:text-white">
            <DialogHeader className="bg-[#111827] p-8 text-white rounded-t-lg shrink-0">
              <div className="flex justify-between items-start w-full">
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tighter text-white m-0 leading-none">
                    Goods Receipt Note
                  </h1>
                  <div className="space-y-1">
                    <p className="text-xl font-bold m-0 flex items-center gap-2">
                      <span className="opacity-60 text-sm uppercase tracking-widest font-black">Ref:</span>
                      {viewingGRN.grn_number}
                    </p>
                    <div className="text-slate-400 font-medium m-0 flex flex-col gap-1 text-sm">
                      <span className="flex items-center">
                        <span className="opacity-60 text-[10px] uppercase tracking-widest font-black mr-2">Received:</span>
                        {new Date(viewingGRN.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="flex items-center">
                        <span className="opacity-60 text-[10px] uppercase tracking-widest font-black mr-2">PO Link:</span>
                        <span className="text-blue-400 font-bold">{viewingGRN.po_number || "---"}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-black text-white m-0 uppercase tracking-tighter">Ethan Home Appliances</p>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-black m-0 text-[#7FD1E3]">Ops360 Enterprise ERP</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg">
                       <Image src="/ethan-logo.png" alt="Ethan Logo" width={40} height={40} className="h-10 w-auto object-contain" />
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold max-w-[280px] leading-tight mt-1 italic">
                    <p className="m-0 uppercase tracking-widest text-[#7FD1E3] mb-0.5">Corporate Headquarters</p>
                    <p className="m-0 mb-0.5 whitespace-nowrap">Minzta Hotel, Vazhappilly Tower, Koratty, Thrissur, Kerala</p>
                    <p className="m-0 uppercase tracking-widest font-black">GSTIN: 32BBBBB0000B1Z5</p>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-8 bg-white space-y-8">
              <div className="grid md:grid-cols-3 gap-8 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <Building2 className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Receiving Branch</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="font-bold text-lg text-slate-900 leading-none">{viewingGRN.branch_name || "Central Warehouse"}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Inventory Intake Point</p>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Storage Zone: SEC-A / RECEIVED</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <ShieldCheck className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Audit Verification</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="font-bold text-lg text-slate-900">{viewingGRN.originator_name || 'System Operator'}</p>
                    <p className="text-xs text-slate-500 font-medium">Inbound Inspector</p>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Validated on {new Date(viewingGRN.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <ShieldAlert className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Condition Details</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">
                      &quot;{viewingGRN.condition_notes || "Documented compliance check passed. No damages reported at time of entry."}&quot;
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[60px] text-center font-bold text-[10px] uppercase tracking-widest">#</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-widest">Item Description</TableHead>
                        <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest">Received Qty</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-widest">Storage Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingGRN.items.map((item, idx: number) => (
                        <TableRow key={idx} className="border-b last:border-0">
                          <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900">{item.product.model_name}</div>
                            {item.serial_numbers && item.serial_numbers.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.serial_numbers.map((sn: string, sidx: number) => (
                                  <Badge key={sidx} variant="outline" className="text-[8px] py-0 font-mono bg-white">{sn}</Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-black text-emerald-700">{item.quantity} Unit(s)</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[8px] uppercase border-emerald-200 text-emerald-700 bg-emerald-50">Verified & In-Stock</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-6 border-t rounded-b-lg shrink-0">
              <div className="flex justify-between items-center w-full">
                <Button 
                  variant="outline" 
                  className="rounded-xl font-bold text-xs uppercase tracking-widest h-12 border-2 hover:bg-slate-100 transition-all px-8"
                  onClick={() => setViewingGRN(null)}
                >
                  Close Receipt
                </Button>
                <Button 
                  className="bg-[#001529] text-white hover:bg-slate-800 font-bold text-xs uppercase h-12 px-8 rounded-xl shadow-md transition-all active:scale-95 flex gap-2"
                  onClick={() => {
                    setCurrentGrnData(viewingGRN);
                    setIsDownloading(viewingGRN.po_id + '_grn');
                    setTimeout(() => handleGrnPrint(), 500);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download Verified GRN
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Hidden PDF Generation Container */}
      <div className="fixed -left-[9999px] top-0">
        <div id="po-print-container">
          {(() => {
            if (!isDownloading) return null;
            const poId = typeof isDownloading === 'string' && isDownloading.includes('_grn') 
              ? isDownloading.split('_')[0] 
              : (typeof isDownloading === 'string' ? isDownloading : null);
            
            const po = activePOs.find(p => p.id === poId);
            if (!po) return null;
            const vendor = vendors.find(v => v.id === po.vendor_id);
            const branch = branches.find(b => b.id === po.branch_id);
            if (!vendor || !branch) return null;
            
            if (typeof isDownloading === 'string' && isDownloading.endsWith('_grn')) {
              return currentGrnData && (
                <GRNPrintTemplate 
                  ref={grnPrintRef}
                  grn={currentGrnData}
                  branch={branch}
                />
              );
            }

            return (
              <POPrintTemplate 
                ref={printRef}
                po={po}
                vendor={vendor}
                branch={branch}
              />
            );
          })()}
        </div>
      </div>

      {/* GRN Processing Dialog */}
      <GRNDialog 
        po={selectedPO}
        isOpen={!!selectedPO}
        onClose={() => setSelectedPO(null)}
        onSuccess={handleGRNSuccess}
      />

      {/* Revision Notes Dialog — for approver to send PO back with comments */}
      <Dialog open={!!revisionDialogPO} onOpenChange={(open) => { if (!open) { setRevisionDialogPO(null); setRevisionNotesInput("") } }}>
        <DialogContent className="max-w-md [&>button]:text-slate-400">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#001529]">Revise PO</h2>
                <p className="text-[11px] text-slate-500 font-medium">{revisionDialogPO?.po_number}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-1 mb-2">
            <DialogDescription>
              This will send the PO back to the initiator for revision. Please provide clear instructions on what needs to be changed.
            </DialogDescription>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Revision Notes <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="e.g. Please renegotiate the unit price for Samsung Galaxy S24 Ultra. Also add the extended warranty as a separate line item."
                value={revisionNotesInput}
                onChange={(e) => setRevisionNotesInput(e.target.value)}
                rows={5}
                className="text-sm font-medium border-amber-200 focus:ring-amber-500 resize-none"
              />
              <p className="text-[10px] text-slate-400 italic">This note will be visible to the initiator when they open the PO for revision.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRevisionDialogPO(null); setRevisionNotesInput("") }}>
              Cancel
            </Button>
            <Button
              onClick={handleRevisionRequest}
              disabled={!revisionNotesInput.trim() || isSubmittingRevision}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmittingRevision ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Send Back for Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!uploadBillPO} onOpenChange={(open) => {
        if (!open) {
          setUploadBillPO(null)
          setBillNumber("")
          setBillAmount("")
          setBillFiles([])
        }
      }}>
        <DialogContent className="max-w-md p-6 bg-white shrink-0 sm:rounded-2xl shadow-2xl border-0 [&>button]:text-slate-400">
          <DialogHeader className="space-y-3 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Upload className="h-6 w-6 text-amber-600" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                  Upload Vendor Bill
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500">
                  Attach invoice details for <span className="text-[#001529] font-bold">{uploadBillPO?.po_number}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 pt-6 relative">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Bill/Invoice Number <span className="text-red-500">*</span></Label>
              <Input
                placeholder="INV-2026-001"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="bg-slate-50 border-slate-200 focus-visible:ring-amber-500 transition-shadow h-11 text-sm font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Bill Amount (₹) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="45000.00"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className="bg-slate-50 border-slate-200 focus-visible:ring-amber-500 transition-shadow h-11 text-sm font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Supporting Documents (Multiple)</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setBillFiles(prev => [...prev, ...files])
                }}
                className="bg-slate-50 border-slate-200 transition-shadow text-sm font-medium"
                accept=".pdf,.png,.jpg,.jpeg"
              />
              {billFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Attached Files ({billFiles.length})</p>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {billFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-100/50 border border-slate-200 rounded-lg group">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileCheck className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-600 truncate">{file.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          onClick={() => setBillFiles(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-8 gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUploadBillPO(null)}
              className="px-6 h-11 font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadBill}
              disabled={isUploadingBill || !billNumber.trim() || !billAmount.trim()}
              className="px-8 h-11 bg-amber-600 hover:bg-amber-700 text-white shadow-lg font-bold rounded-xl transition-all active:scale-[0.98] border border-amber-500 min-w-[140px]"
            >
              {isUploadingBill ? <Loader2 className="h-5 w-5 animate-spin" /> : "Upload Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoices Dialog */}
      <Dialog open={!!viewingInvoices} onOpenChange={(open) => { if (!open) setViewingInvoices(null) }}>
        <DialogContent className="max-w-md p-0 bg-white sm:rounded-2xl shadow-2xl border-0 [&>button]:text-white">
          <DialogHeader className="bg-[#001529] p-6 text-white text-left">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/10">
                <FileCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-white">
                  Vendor Bill Audit
                </DialogTitle>
                <DialogDescription className="text-white/60 text-xs font-medium">
                  Documents for <span className="text-white font-bold">{viewingInvoices?.po_number}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            {viewingInvoices?.vendor_bills && viewingInvoices.vendor_bills.length > 0 ? (
              <div className="space-y-4">
                {viewingInvoices.vendor_bills.map((bill) => {
                  const files = bill.file_path ? bill.file_path.split(',') : [];
                  return (
                    <div key={bill.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold border-blue-100 text-blue-700 bg-blue-50/50">
                            BILL #{bill.bill_number}
                          </Badge>
                          <span className="text-[11px] font-black text-[#001529]">{formatCurrency(bill.bill_amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                            {bill.created_at ? new Date(bill.created_at).toLocaleDateString() : '—'}
                          </span>
                          <button 
                            type="button"
                            aria-label="Delete bill"
                            title="Delete bill"
                            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors relative z-[100] cursor-pointer"
                            onClick={(e) => {
                              console.log("Delete button clicked for bill:", bill.id);
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteBill(bill.id, viewingInvoices.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {files.length > 0 ? files.map((path, fIdx) => (
                          <Button
                            key={fIdx}
                            variant="outline"
                            className="w-full justify-between h-10 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 group transition-all"
                            onClick={() => {
                              ;
                              const data = { publicUrl: `/storage/vendor-documents/${path}` };
                              window.open(data.publicUrl, '_blank');
                            }}
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500" />
                              <span className="text-[10px] font-bold text-slate-600 truncate">
                                Document {files.length > 1 ? `#${fIdx + 1}` : 'Invoice Attachment'}
                              </span>
                            </div>
                            <Badge variant="ghost" className="text-[8px] opacity-40 uppercase">View File</Badge>
                          </Button>
                        )) : (
                          <div className="flex flex-col items-center justify-center py-4 grayscale opacity-40">
                            <XCircle className="h-8 w-8 mb-2" />
                            <p className="text-[10px] uppercase font-bold tracking-widest">No attachments linked</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-20 grayscale">
                <Clock className="h-12 w-12" />
                <p className="text-sm font-black uppercase tracking-widest">Awaiting Bill Upload</p>
              </div>
            )}
          </div>
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center gap-4">
            <Button
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-black px-4 h-10 rounded-xl flex items-center gap-2 transition-all active:scale-95"
              onClick={() => {
                setUploadBillPO(viewingInvoices)
                setViewingInvoices(null)
              }}
            >
              <Plus className="h-4 w-4" /> Upload New Bill
            </Button>
            <Button 
              className="bg-[#001529] text-white hover:bg-slate-800 font-bold px-6 h-10 rounded-xl transition-all active:scale-95 shadow-lg"
              onClick={() => setViewingInvoices(null)}
            >
              Close Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Short-Close Confirmation Dialog */}
      <Dialog open={!!shortClosingPO} onOpenChange={(open) => { 
          if (!open) {
            setShortClosingPO(null)
            setShortCloseReason("")
            setShortCloseOtherReason("")
          }
        }}>
        <DialogContent className="max-w-md p-6 bg-white shrink-0 sm:rounded-2xl shadow-2xl border-0">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Ban className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Short-Close PO
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500">
                  Seal procurement obligation for <span className="font-bold text-[#001529]">{shortClosingPO?.po_number}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              You are about to cancel the remaining <span className="text-red-600 font-bold">
                {shortClosingPO?.items.reduce((acc, item) => acc + (item.quantity - item.received_quantity), 0)} unit(s)
              </span> for {shortClosingPO?.po_number}.
            </p>
            <p className="text-xs text-slate-500 italic">
              This action will zero out any outstanding quantities and set the status to Short-Closed. <strong>This action cannot be undone.</strong> Proceed?
            </p>
          </div>

          <div className="mt-6 space-y-4">
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#001529] opacity-60">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={handleShortCloseReasonChange}>
                   <SelectTrigger className="w-full h-11 border-slate-200 focus:ring-slate-900 transition-all font-medium text-sm">
                      <SelectValue placeholder="Select a reason..." />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="Vendor Out of Stock" className="font-medium text-sm">Vendor Out of Stock</SelectItem>
                      <SelectItem value="Customer Order Cancelled" className="font-medium text-sm">Customer Order Cancelled</SelectItem>
                      <SelectItem value="Price/Terms Disagreement" className="font-medium text-sm">Price/Terms Disagreement</SelectItem>
                      <SelectItem value="Damaged in Transit (Remaining)" className="font-medium text-sm">Damaged in Transit (Remaining)</SelectItem>
                      <SelectItem value="Inventory Strategy Shift" className="font-medium text-sm">Inventory Strategy Shift</SelectItem>
                      <SelectItem value="Other (Manual Entry)" className="font-medium text-sm italic">Other (Manual Entry)</SelectItem>
                   </SelectContent>
                </Select>
             </div>

             {shortCloseReason === "Other (Manual Entry)" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Specify Other Reason <span className="text-red-500">*</span>
                   </Label>
                   <Textarea
                     placeholder="Please provide details..."
                     value={shortCloseOtherReason}
                     onChange={(e) => setShortCloseOtherReason(e.target.value)}
                     rows={3}
                     className="text-sm font-medium border-slate-200 focus:ring-slate-900 resize-none rounded-xl"
                   />
                </div>
             )}
          </div>

          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShortClosingPO(null)
                setShortCloseReason("")
                setShortCloseOtherReason("")
              }}
              className="px-6 h-11 font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleShortClosePO}
              disabled={isShortClosing || !shortCloseReason || (shortCloseReason === "Other (Manual Entry)" && !shortCloseOtherReason.trim())}
              className="px-8 h-11 bg-slate-900 hover:bg-slate-800 text-white shadow-lg font-bold rounded-xl transition-all active:scale-[0.98] min-w-[140px]"
            >
              {isShortClosing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  </div>
  )
}
