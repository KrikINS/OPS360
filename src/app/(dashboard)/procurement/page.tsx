"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { calculateLandedCost } from "@/utils/compliance"
import { cn } from "@/lib/utils"
import {
  Truck,
  FileText,
  Plus,
  Loader2,
  FileUp,
  Scale,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertOctagon,
  PackageSearch,
  Download,
  Building2,
  LayoutGrid,
  Search,
  Settings2,
  X
} from "lucide-react"
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { POPrintTemplate } from "@/components/procurement/POPrintTemplate"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProcessReturns from "./return/page"
import DiscrepancyReportPage from "../discrepancy-report/page"

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
  base_price: number
  product_code: string
}

type POItem = {
  product_id: string
  quantity: number
  unit_price: number
  tax_rate: number
  total_item_cost: number
  received_quantity: number
  model_name: string
  hsn_code: string
  override_reason?: string
}

type Branch = {
  id: string
  name: string
}

type PurchaseOrder = {
  id: string
  po_number: string
  vendor_id: string
  branch_id: string
  status: 'draft' | 'pending_approval' | 'approved' | 'received' | 'partially_received' | 'cancelled'
  total_amount: number
  created_at: string
  vendor: { name: string, state: string }
  branch: { name: string }
  invoice_url?: string
  vendor_bill_amount?: number
  requester_name?: string
  approver_name?: string
  cancellation_reason?: string
  terms_content?: string
  items: {
    id: string
    product_id: string
    quantity: number
    received_quantity: number
    unit_price: number
    tax_rate: number
    total_item_cost: number
    override_reason?: string
    product: { model_name: string, hsn_code: string, product_code: string }
  }[]
}

export default function ProcurementGRNPage() {
  const [isCreatingPO, setIsCreatingPO] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [activePOs, setActivePOs] = useState<PurchaseOrder[]>([])
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [poTerms, setPoTerms] = useState({ gstin: "", terms: "" })
  const [expectedDelivery, setExpectedDelivery] = useState("")
  const [poItems, setPoItems] = useState<POItem[]>([])
  const [freightCharges, setFreightCharges] = useState<Record<string, number>>({})
  const [serialNumbers, setSerialNumbers] = useState<Record<string, string[]>>({})

  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [isProcessingGRN, setIsProcessingGRN] = useState(false)
  const [managerOverride, setManagerOverride] = useState<Record<number, boolean>>({})
  const [overrideReasons, setOverrideReasons] = useState<Record<number, string>>({})
  const [isUploading, setIsUploading] = useState<string | null>(null)
  const [revisionPO, setRevisionPO] = useState<PurchaseOrder | null>(null)
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null)
  const [editingTerms, setEditingTerms] = useState<string>("")
  const [isUpdatingTerms, setIsUpdatingTerms] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [creationTerms, setCreationTerms] = useState<string>("")

  const handleDownloadPDF = async (po: PurchaseOrder) => {
    setIsDownloading(po.id);
    try {
      // Find the specific vendor for this PO
      const vendor = vendors.find(v => v.id === po.vendor_id);
      
      // Ensure the template is rendered. We add a tiny delay to allow React to mount the component in the hidden container
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = document.getElementById('po-print-container');
      if (!element) throw new Error('Print container not found');

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('po-print-template');
          if (el) {
            // Force light color scheme to avoid system-inherited dark mode variables
            el.style.colorScheme = 'light';
            
            // Aggressively clear any modern color variables that might exist in the root or container
            // and specifically look for 'lab' or 'oklch' in the computed style and replace them
            const items = clonedDoc.querySelectorAll('*');
            items.forEach((item: any) => {
              const style = item.style;
              if (style) {
                // Remove all CSS variables as they often contain modern colors in Tailwind v4
                for (let i = 0; i < style.length; i++) {
                  const prop = style[i];
                  if (prop.startsWith('--')) {
                    item.style.removeProperty(prop);
                  }
                }
              }
            });

            // Handle global style sheets that might contain lab()
            for (let i = 0; i < clonedDoc.styleSheets.length; i++) {
              try {
                const sheet = clonedDoc.styleSheets[i];
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  for (let j = rules.length - 1; j >= 0; j--) {
                    if (rules[j].cssText.includes('lab(') || rules[j].cssText.includes('oklch(')) {
                      sheet.deleteRule(j);
                    }
                  }
                }
              } catch (e) {
                // Ignore cross-origin stylesheet errors
              }
            }
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      if (!imgData || imgData === 'data:,') throw new Error('Failed to generate image data');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Explicitly specify format as 'PNG'
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`PO_${po.po_number}_${vendor?.name.replace(/\s+/g, '_') || 'Vendor'}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setIsDownloading(null);
    }
  };
  const [cancelModalId, setCancelModalId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, poId: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(poId)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("po_id", poId)

    try {
      const res = await fetch('/api/procurement/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.success) {
        const poRes = await fetch('/api/procurement/purchase-orders')
        setActivePOs(await poRes.json())
      } else {
        alert(data.error || "Upload failed")
      }
    } catch (err) {
      console.error("Upload error", err)
      alert("An error occurred during upload")
    } finally {
      setIsUploading(null)
      e.target.value = ""
    }
  }

  const handleReconcile = async (poId: string, amount: number) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('purchase_orders')
        .update({ vendor_bill_amount: amount })
        .eq('id', poId)

      if (error) throw error

      // Refresh local state
      setActivePOs(prev => prev.map(po => po.id === poId ? { ...po, vendor_bill_amount: amount } : po))
    } catch (err) {
      console.error("Reconciliation failed", err)
      alert("Failed to update bill amount.")
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // 1. Fetch User Role
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
          setUserRole(profile?.role || 'sales')
        }

        // 2. Fetch Vendors
        const vendorRes = await fetch('/api/vendors')
        const vendorData = await vendorRes.json()
        setVendors(vendorData.filter((v: Vendor) => v.status === 'approved'))

        // 3. Fetch Products
        const productRes = await fetch('/api/products')
        const productData = await productRes.json()
        setProducts(productData)

        // 4. Fetch Active POs
        const poRes = await fetch('/api/procurement/purchase-orders')
        const poData = await poRes.json()
        setActivePOs(poData)

        // 5. Fetch Branches
        const { data: branchData } = await supabase.from('branches').select('id, name').order('name')
        if (branchData) setBranches(branchData)
      } catch (err) {
        console.error("Failed to load data", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

      // Fetch default PO terms template if creating a new PO
      if (isCreatingPO && !revisionPO) {
        const supabase = createClient()
        supabase
          .from('po_terms_templates')
          .select('content')
          .eq('is_default', true)
          .single()
          .then(({ data }) => {
            if (data?.content) setCreationTerms(data.content)
          })
      }
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
        product.base_price,
        0,
        product.hsn_code,
        selectedVendor?.state // Uses Kerala default if vendor state is missing
      )

      setPoItems([...poItems, {
        product_id: product.id,
        model_name: product.model_name,
        hsn_code: product.hsn_code,
        quantity: 1,
        unit_price: product.base_price,
        received_quantity: 0,
        tax_rate: costDetails.gstRate,
        total_item_cost: costDetails.totalBatchCost // Total cost for the draft
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
        items: poItems.map((item, idx) => ({
          ...item,
          override_reason: overrideReasons[idx] || item.override_reason || null,
          total_item_cost: (item.unit_price * item.quantity) * (1 + item.tax_rate / 100)
        })),
        status: isRevision ? 'draft' : 'pending_approval',
        terms_content: creationTerms
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
    } catch (err) {
      console.error("Connection error", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCancelPO = async () => {
    if (!cancelModalId || cancelReason.length < 10) return

    setCancellingId(cancelModalId)
    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cancelModalId, status: 'cancelled', cancellation_reason: cancelReason })
      })

      if (res.ok) {
        setCancelModalId(null)
        setCancelReason("")
        const poRes = await fetch('/api/procurement/purchase-orders')
        setActivePOs(await poRes.json())
      }
    } catch (err) {
      console.error("Failed to cancel PO", err)
    } finally {
      setCancellingId(null)
    }
  }

  const handleApprovePO = async (poId: string) => {
    setApprovingId(poId)
    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: poId, status: 'approved' })
      })

      if (res.ok) {
        const poRes = await fetch('/api/procurement/purchase-orders')
        setActivePOs(await poRes.json())
      }
    } catch (err) {
      console.error("Failed to approve PO", err)
    } finally {
      setApprovingId(null)
    }
  }

  const handleProcessGRN = async () => {
    if (!selectedPO) return
    setIsProcessingGRN(true)

    // Validate serial numbers and construct items for sync
    const grnItems = selectedPO.items
      .map(item => ({
        product_id: item.product_id,
        unit_price: item.unit_price,
        hsn_code: item.product.hsn_code,
        freight: freightCharges[item.id] || 0,
        serial_numbers: serialNumbers[item.id] || []
      }))
      .filter(item => item.serial_numbers.length > 0) // Only send items being received

    if (grnItems.length === 0) {
      setIsProcessingGRN(false)
      alert("Please enter at least one serial number to process GRN.")
      return
    }

    // Validation: current SNS + alreadyReceived <= quantity
    for (const item of grnItems) {
      const poItem = selectedPO.items.find(i => i.product_id === item.product_id)
      const alreadyReceived = poItem?.received_quantity || 0
      if (item.serial_numbers.length + alreadyReceived > (poItem?.quantity || 0)) {
        setIsProcessingGRN(false)
        alert(`Serial numbers count exceeds remaining quantity for ${poItem?.product.model_name}`)
        return
      }
    }

    try {
      const res = await fetch('/api/procurement/inventory-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ po_id: selectedPO.id, items: grnItems })
      })

      if (res.ok) {
        setSelectedPO(null)
        const poRes = await fetch('/api/procurement/purchase-orders')
        setActivePOs(await poRes.json())
      }
    } catch (err) {
      console.error("GRN processing failed", err)
    } finally {
      setIsProcessingGRN(false)
    }
  }

  const filteredPOs = activePOs.filter(po => {
    const statusMatch = statusFilter === "all" || po.status === statusFilter
    const branchMatch = branchFilter === "all" || po.branch_id === branchFilter
    const searchMatch = !searchTerm || 
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      po.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    return statusMatch && branchMatch && searchMatch
  })

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }

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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "gap-2 border-slate-200 h-10 shadow-sm transition-all",
              showFilters && "bg-slate-100 border-slate-300"
            )}
          >
            <Settings2 className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Advance Filters"}
          </Button>

          <Button
            onClick={() => {
              if (isCreatingPO) {
                resetForm()
              } else {
                setIsCreatingPO(true)
                setSelectedPO(null)
              }
            }}
            className="bg-[#001529] hover:bg-[#002a52] text-white gap-2 shadow-lg h-10"
          >
            {isCreatingPO ? "View PO Registry" : <><Plus className="h-4 w-4" /> Create New PO</>}
          </Button>
        </div>
      </div>

      {showFilters && !isCreatingPO && !selectedPO && (
        <div className="bg-white border p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 flex flex-wrap items-center gap-4 border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search PO Number or Vendor..."
              className="pl-9 h-9 border-slate-200 focus:ring-blue-500 bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Ship To</span>
              <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v || "all")}>
                <SelectTrigger className="w-[180px] h-9 text-xs border-slate-200 bg-white">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Status</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
              <SelectTrigger className="w-[150px] h-9 text-xs border-slate-200 bg-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="partially_received">Partial</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
              className="h-9 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 border border-transparent hover:border-red-100"
            >
              <X className="h-3 w-3" />
              Clear All
            </Button>
          )}
        </div>
      )}

      {isCreatingPO ? (
        <Card className="shadow-md border-t-4 border-t-[#001529]">
          <CardHeader>
            <CardTitle>Draft Purchase Order</CardTitle>
            <CardDescription>Select a vendor and add products to generate a PO.</CardDescription>
          </CardHeader>
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
                <Input value={poTerms.terms} readOnly className="bg-muted/50 h-10" />
              </div>
              <div className="space-y-4">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full h-10"
                />
              </div>
            </div>

            {selectedVendor && (
              <div className="pt-4 border-t space-y-4">
                <div className="space-y-4">
                  <Label className="text-lg">Add Items</Label>
                  <Select onValueChange={addPOItem}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Search products..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="font-mono text-xs font-bold mr-2 text-blue-600">[{p.product_code}]</span>
                          {p.model_name} (₹{p.base_price.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {poItems.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>HSN</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poItems.map((item, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{item.model_name}</TableCell>
                          <TableCell className="font-mono text-xs">{item.hsn_code}</TableCell>
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
                          <TableCell>₹{item.unit_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{(item.unit_price * item.quantity).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setPoItems(poItems.filter((_, i: number) => i !== idx))}>Remove</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <div className="space-y-4 pt-6">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" /> Contractual Terms & Conditions
                  </Label>
                  <Textarea 
                    placeholder="These terms will be printed on the official PO PDF..."
                    value={creationTerms}
                    onChange={(e) => setCreationTerms(e.target.value)}
                    rows={6}
                    className="font-medium text-sm leading-relaxed border-slate-200 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 italic">
                    Pre-filled from Global Masters. You can modify these specifically for this order.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-3 border-t bg-muted/30">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button
              className="bg-[#001529]"
              disabled={!selectedVendor || poItems.length === 0 || poTerms.gstin.length !== 15 || isGenerating}
              onClick={handleGeneratePO}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {revisionPO ? "Send Back to Draft" : "Generate Purchase Order"}
            </Button>
          </CardFooter>
        </Card>
      ) : selectedPO ? (
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Process GRN: {selectedPO.po_number}</CardTitle>
                <CardDescription>Vendor: {selectedPO.vendor.name}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedPO(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Ordered</TableHead>
                  <TableHead className="text-center">Received</TableHead>
                  <TableHead className="text-center">Remaining</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Serials (Current GRN)</TableHead>
                  <TableHead>Freight / Item</TableHead>
                  <TableHead className="text-right">Unit Landed Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPO.items.map((item) => {
                  const alreadyReceived = item.received_quantity || 0
                  const remaining = item.quantity - alreadyReceived
                  const freight = freightCharges[item.id] || 0
                  const currentSns = serialNumbers[item.id] || []

                  // Refined composite supply calculation
                  const costDetails = calculateLandedCost(
                    item.unit_price,
                    freight,
                    item.product.hsn_code,
                    selectedPO.vendor?.state || 'Kerala',
                    currentSns.length || 1
                  )

                  return (
                    <TableRow key={item.id} className={remaining === 0 ? "opacity-40 bg-muted/20" : ""}>
                      <TableCell className="py-3">
                        <div className="font-bold">{item.product.model_name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase">{item.product.hsn_code}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-center">{item.quantity}</TableCell>
                      <TableCell className="text-blue-600 font-medium text-center">{alreadyReceived}</TableCell>
                      <TableCell className="text-orange-600 font-bold text-center">
                        {remaining}
                      </TableCell>
                      <TableCell className="text-muted-foreground">₹{item.unit_price.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Input
                          placeholder="SN1, SN2..."
                          className="w-full text-xs font-mono"
                          disabled={remaining <= 0}
                          onChange={(e) => {
                            const sns = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            if (sns.length > remaining && remaining > 0) {
                              alert(`Only ${remaining} units remaining for this item.`);
                              return;
                            }
                            if (remaining <= 0) {
                              alert("This item has already been fully received.");
                              return;
                            }
                            setSerialNumbers(prev => ({ ...prev, [item.id]: sns }));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          placeholder="₹0"
                          className="w-20 h-8"
                          disabled={remaining <= 0}
                          onChange={(e) => setFreightCharges(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-primary">₹{costDetails.totalLandedCost.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] bg-primary/10 px-1 rounded text-primary font-bold">{costDetails.gstRate}% GST Incl.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="justify-end gap-3 border-t bg-muted/10 p-4">
            <Button onClick={handleProcessGRN} className="bg-primary" disabled={isProcessingGRN}>
              {isProcessingGRN ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sync to Inventory & Finalize GRN
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2 transition-all">
                  PO Registry
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2 transition-all relative">
                  Pending Fulfilment
                  {activePOs.filter(p => p.status === 'approved' || p.status === 'partially_received').length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {activePOs.filter(p => p.status === 'approved' || p.status === 'partially_received').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reconciliation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2 transition-all">
                  3-Way Match Audit
                </TabsTrigger>
                <TabsTrigger value="returns" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2 transition-all">
                  Purchase Returns
                </TabsTrigger>
                <TabsTrigger value="discrepancy" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2 transition-all">
                  Discrepancy Report
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="animate-in slide-in-from-left-2 duration-300">
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <FileText className="h-5 w-5 text-[#001529]" />
                      Purchase Order Registry
                    </CardTitle>
                    <div className="flex gap-4 items-center">
                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest text-slate-400 border-slate-200">
                        Corporate Archive
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">PO Number</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Ship To</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Status</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Total Amount</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] text-left">Actions</TableHead>
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
                              className="py-2 px-4 font-bold text-[#001529] font-mono cursor-pointer hover:underline border-r border-slate-100/50"
                              onClick={() => setViewingPO(po)}
                            >
                              {po.po_number}
                            </TableCell>
                            <TableCell className="py-2 px-4 font-semibold text-slate-600 border-r border-slate-100/50">{po.vendor?.name}</TableCell>
                            <TableCell className="py-2 px-4 text-slate-500 border-r border-slate-100/50">{po.branch?.name || '---'}</TableCell>
                            <TableCell className="py-2 px-4 border-r border-slate-100/50">
                              <Badge className={
                                po.status === 'received' ? "bg-green-100 text-green-700 hover:bg-green-200 text-[9px] px-1.5 py-0 font-bold" :
                                  po.status === 'approved' ? "bg-blue-100 text-blue-700 hover:bg-blue-200 text-[9px] px-1.5 py-0 font-bold" :
                                    po.status === 'cancelled' ? "bg-red-100 text-red-700 hover:bg-red-200 text-[9px] px-1.5 py-0 font-bold" :
                                      po.status === 'partially_received' ? "bg-amber-100 text-amber-700 hover:bg-amber-200 text-[9px] px-1.5 py-0 font-bold" :
                                        "bg-slate-100 text-slate-700 hover:bg-slate-200 text-[9px] px-1.5 py-0 font-bold"
                              }>
                                {po.status === 'partially_received' ? 'PARTIAL' : po.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 px-4 font-bold text-[#001529] border-r border-slate-100/50">₹{po.total_amount.toLocaleString()}</TableCell>
                            <TableCell className="text-left space-x-1 py-4">
                              <div className="flex items-center gap-2">
                                {po.status === 'pending_approval' && (
                                  <>
                                    {userRole === 'admin' && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => handleApprovePO(po.id)}
                                          className="bg-green-600 hover:bg-green-700 h-8 shadow-sm px-3 gap-2"
                                          disabled={approvingId === po.id}
                                        >
                                          {approvingId === po.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                          <span className="text-xs font-semibold">Approve</span>
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setRevisionPO(po);
                                            const vendor = vendors.find(v => v.id === po.vendor_id);
                                            if (vendor) {
                                              setSelectedVendor(vendor);
                                              setPoTerms({ gstin: vendor.gstin || "", terms: vendor.payment_terms || "Immediate" });
                                            }
                                            setSelectedBranch(po.branch_id);
                                            setPoItems(po.items.map(item => ({
                                              product_id: item.product_id,
                                              model_name: item.product.model_name,
                                              hsn_code: item.product.hsn_code,
                                              quantity: item.quantity,
                                              unit_price: item.unit_price,
                                              received_quantity: item.received_quantity,
                                              tax_rate: item.tax_rate,
                                              total_item_cost: item.total_item_cost,
                                              override_reason: item.override_reason
                                            })));
                                            setIsCreatingPO(true);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                          }}
                                          className="h-8 shadow-sm px-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                          title="Revise & Approve"
                                        >
                                          <RotateCcw className="h-3 w-3 mr-1" />
                                          Revise
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => { setCancelModalId(po.id); setCancelReason(""); }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-3 gap-2 border border-red-100"
                                      disabled={cancellingId === po.id}
                                    >
                                      {cancellingId === po.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertOctagon className="h-3 w-3" />}
                                      <span className="text-xs font-semibold">Cancel</span>
                                    </Button>
                                  </>
                                )}
                                {(po.status === 'approved' || po.status === 'partially_received') && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-[#001529] h-8 shadow-sm px-3 gap-2"
                                    onClick={(e) => { e.stopPropagation(); setSelectedPO(po); }}
                                  >
                                    <Truck className="h-3 w-3" />
                                    <span className="text-xs font-semibold whitespace-nowrap">Process GRN</span>
                                  </Button>
                                )}
                                {(po.status === 'received' || po.status === 'partially_received' || po.status === 'approved') && (
                                  <div
                                    className="relative inline-block group tooltip-container"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                      disabled={isUploading === po.id}
                                      onChange={(e) => handleFileUpload(e, po.id)}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 gap-2 border border-blue-100"
                                      disabled={isUploading === po.id}
                                    >
                                      {isUploading === po.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
                                      <span className="text-xs font-semibold">{po.invoice_url ? "Update Bill" : "Upload Bill"}</span>
                                    </Button>
                                  </div>
                                )}
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending" className="animate-in slide-in-from-right-2 duration-300">
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Pending Fulfilment
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Unfulfilled Stock
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">PO Number</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Delayed By</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 w-[300px]">Item Progress</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePOs
                        .filter(p => p.status === 'approved' || p.status === 'partially_received')
                        .map((po) => {
                          const daysOutstanding = Math.floor((new Date().getTime() - new Date(po.created_at).getTime()) / (1000 * 3600 * 24));
                          return (
                            <TableRow key={po.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0 text-xs text-xs">
                              <TableCell className="py-2 px-4 border-r border-slate-100/50">
                                <div className="font-bold text-[#001529] font-mono">{po.po_number}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{po.branch?.name}</div>
                              </TableCell>
                              <TableCell className="py-2 px-4 border-r border-slate-100/50">
                                <div className="flex items-center gap-1.5">
                                  <div className={`h-2 w-2 rounded-full ${daysOutstanding > 5 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                                  <span className={`font-bold ${daysOutstanding > 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {daysOutstanding} Days
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 px-4 border-r border-slate-100/50 font-semibold text-slate-600">
                                {po.vendor?.name}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="space-y-3">
                                  {po.items.map((item) => {
                                    const progress = (item.received_quantity / item.quantity) * 100;
                                    return (
                                      <div key={item.id} className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-medium text-slate-500">
                                          <span className="truncate max-w-[150px]">{item.product.model_name}</span>
                                          <span className={progress === 100 ? "text-green-600 font-bold" : "text-slate-900"}>
                                            {item.received_quantity} / {item.quantity}
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                                          <div
                                            className={`h-full transition-all duration-700 ${progress === 100 ? 'bg-green-500' : 'bg-[#7FD1E3]'}`}
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="default" className="bg-[#001529] h-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setSelectedPO(po)}>
                                  Process GRN
                                </Button>
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
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="reconciliation" className="animate-in slide-in-from-right-2 duration-300">
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-[#001529] text-white py-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Scale className="h-6 w-6 text-[#7FD1E3]" />
                        3-Way Match Verification
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        Auditing Purchase Agreements vs. Receiving Reality vs. Vendor Demand
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">PO Reference</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">1. Agreement (PO)</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">2. Reality (GRN)</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">3. Demand (Bill)</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center">Status</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePOs
                        .filter(p => p.status === 'received' || p.status === 'partially_received')
                        .map((po) => {
                          const poTotal = po.total_amount;
                          const grnTotal = po.items.reduce((acc, item) => acc + (item.unit_price * item.received_quantity) * (1 + item.tax_rate / 100), 0);
                          const billAmount = po.vendor_bill_amount || 0;

                          const isMatch = Math.abs(poTotal - billAmount) < 1 && Math.abs(grnTotal - billAmount) < 1;
                          const hasBill = billAmount > 0;

                          return (
                            <TableRow key={po.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0 text-xs">
                              <TableCell className="py-2 px-4 border-r border-slate-100/50 font-bold font-mono text-[#001529]">{po.po_number}</TableCell>
                              <TableCell className="py-2 px-4 border-r border-slate-100/50 font-semibold text-slate-600">{po.vendor?.name}</TableCell>
                              <TableCell className="py-2 px-4 border-r border-slate-100/50 font-bold text-slate-500">₹{poTotal.toLocaleString()}</TableCell>
                              <TableCell className="py-2 px-4 border-r border-slate-100/50 font-bold text-blue-600">₹{grnTotal.toLocaleString()}</TableCell>
                              <TableCell className="py-2 px-4 border-r border-slate-100/50 font-bold text-amber-600">
                                {hasBill ? `₹${billAmount.toLocaleString()}` : "Awaiting Bill"}
                              </TableCell>
                              <TableCell className="text-center">
                                {hasBill ? (
                                  isMatch ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                      <ShieldCheck className="h-3 w-3 mr-1" /> FULL MATCH
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
                              <TableCell className="text-right px-8">
                                <div className="flex justify-end gap-2">
                                  {po.invoice_url ? (
                                    <Button variant="ghost" size="sm" className="h-8 text-blue-600" onClick={() => window.open(po.invoice_url, '_blank')}>
                                      <FileText className="h-4 w-4 mr-1" /> View Doc
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 border-dashed border-slate-300 text-slate-500 hover:text-blue-600"
                                      onClick={() => {
                                        const bill = prompt("Enter Vendor Bill Amount:");
                                        if (bill) {
                                          handleReconcile(po.id, Number(bill));
                                        }
                                      }}
                                    >
                                      <FileUp className="h-4 w-4 mr-1" /> Reconcile
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="returns" className="animate-in slide-in-from-right-2 duration-300">
              <ProcessReturns />
            </TabsContent>
            <TabsContent value="discrepancy" className="animate-in slide-in-from-right-2 duration-300">
              <DiscrepancyReportPage />
            </TabsContent>
          </Tabs>
        </div>
      )}
      {/* PO Detail View Modal */}
      {viewingPO && (
        <Dialog open={!!viewingPO} onOpenChange={(open) => {
          if (!open) {
            setViewingPO(null);
            setEditingTerms("");
          }
        }}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
            <DialogHeader className="bg-[#001529] p-6 text-white rounded-t-lg">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#002a52] rounded-xl border border-[#003a6d]">
                    <FileText className="h-8 w-8 text-[#7FD1E3]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <DialogTitle className="text-3xl font-bold tracking-tight">
                        {viewingPO.po_number}
                      </DialogTitle>
                      <Badge className={
                        viewingPO.status === 'received' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                          viewingPO.status === 'approved' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                            viewingPO.status === 'cancelled' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              "bg-slate-500/20 text-slate-400 border-slate-500/30"
                      }>
                        {viewingPO.status.toUpperCase()}
                      </Badge>
                    </div>
                    <DialogDescription className="text-slate-400 font-medium">
                      Generated on {new Date(viewingPO.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </DialogDescription>
                  </div>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#7FD1E3] font-bold">Total Amount</p>
                  <p className="text-3xl font-black text-white">₹{viewingPO.total_amount.toLocaleString()}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="p-8 space-y-8 bg-white">
              {/* 3-Column Metadata Grid */}
              <div className="grid md:grid-cols-3 gap-8 p-6 rounded-2xl bg-slate-50 border border-slate-100">
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

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <Building2 className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Ship-To Destination</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="font-bold text-lg text-slate-900">{viewingPO.branch.name}</p>
                    <p className="text-xs text-slate-500 font-medium">Company Logistics Center</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#001529]">
                    <Scale className="h-4 w-4" />
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Financial Summary</Label>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Base Items</span>
                      <span className="font-bold">{viewingPO.items.length} Units</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-slate-500">PO Status</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{viewingPO.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
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
                  {viewingPO.status === 'pending_approval' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-black uppercase tracking-tighter text-blue-600 hover:bg-blue-50"
                      onClick={async () => {
                        const supabase = createClient();
                        setIsUpdatingTerms(true);
                        const { error } = await supabase
                          .from('purchase_orders')
                          .update({ terms_content: editingTerms || viewingPO.terms_content })
                          .eq('id', viewingPO.id);
                        
                        if (!error) {
                          setViewingPO(prev => prev ? { ...prev, terms_content: editingTerms || viewingPO.terms_content } : null);
                          alert("Terms updated successfully.");
                        } else {
                          alert("Error updating terms: " + error.message);
                        }
                        setIsUpdatingTerms(false);
                      }}
                      disabled={isUpdatingTerms}
                    >
                      {isUpdatingTerms ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Persist Changes
                    </Button>
                  )}
                </div>
                <div className="relative group">
                  <Textarea
                    className="min-h-[120px] bg-slate-50 border-slate-200 text-xs leading-relaxed focus:bg-white transition-all resize-none font-medium text-slate-700"
                    placeholder="Enter specific PO terms..."
                    defaultValue={viewingPO.terms_content || "1. Supply as per agreed specifications and delivery schedule.\n2. Invoices must mention the PO Number and GSTIN of both parties.\n3. Subject to Bengaluru Jurisdiction."}
                    onChange={(e) => setEditingTerms(e.target.value)}
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
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-100 hover:bg-transparent">
                        <TableHead className="w-[60px] text-center font-black uppercase text-[10px] tracking-widest">#</TableHead>
                        <TableHead className="min-w-[200px] font-black uppercase text-[10px] tracking-widest">Model Specification</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">HSN/SAC</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Net Rate</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingPO.items.map((item: any, idx: number) => (
                        <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="text-center font-bold text-slate-400 text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900">{item.product?.model_name || 'Item'}</div>
                            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">SKU: {item.product?.product_code}</div>
                          </TableCell>
                          <TableCell className="text-slate-500 font-mono text-[10px] font-bold tracking-tighter">{item.product?.hsn_code || '---'}</TableCell>
                          <TableCell className="text-center font-black text-slate-900 text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right font-bold text-slate-600">₹{item.unit_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-black text-[#001529]">₹{item.total_item_cost.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Audit Trail */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <ShieldCheck className="h-24 w-24" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7FD1E3] mb-6">Security & Audit Compliance</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div className="space-y-1 relative z-10">
                    <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Originator</Label>
                    <p className="text-sm font-bold tracking-tight">{viewingPO.requester_name || 'System Auto-Gen'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{new Date(viewingPO.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="space-y-1 relative z-10">
                    <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Certification</Label>
                    <p className="text-sm font-bold tracking-tight text-green-400 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {viewingPO.approver_name ? 'Certified Approved' : 'Awaiting Review'}
                    </p>
                    <p className="text-[10px] text-slate-500">{viewingPO.approver_name || 'Workflow In-Progress'}</p>
                  </div>
                  {viewingPO.status === 'cancelled' && (
                    <div className="col-span-2 space-y-1 border-l border-white/10 pl-8 relative z-10">
                      <Label className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Revocation Protocol</Label>
                      <p className="text-sm text-red-100 italic font-medium leading-relaxed">&quot;{viewingPO.cancellation_reason || 'Administrative revocation'}&quot;</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-6 rounded-b-lg border-t border-slate-200">
              <div className="flex justify-between items-center w-full">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase" onClick={() => setViewingPO(null)}>
                  Close Portal
                </Button>
                <div className="flex gap-4">
                  {(viewingPO.status === 'approved' || viewingPO.status === 'received' || viewingPO.status === 'partially_received') && (
                    <Button
                      className="bg-[#001529] hover:bg-[#002a52] text-white px-8 h-12 rounded-xl shadow-lg shadow-[#001529]/20 transition-all active:scale-95 flex gap-2 font-bold"
                      onClick={() => handleDownloadPDF(viewingPO)}
                      disabled={isDownloading === viewingPO.id}
                    >
                      {isDownloading === viewingPO.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                      Generate Enterprise PDF
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel PO Modal */}
      <Dialog open={!!cancelModalId} onOpenChange={(open) => !open && setCancelModalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for cancelling this order.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Reason for Cancellation (Min 10 characters)</Label>
              <Textarea
                placeholder="Ex: Price mismatch with current vendor quote..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-[10px] text-muted-foreground">
                Character count: <span className={cancelReason.length < 10 ? "text-red-500" : "text-green-600"}>{cancelReason.length}</span> / 10
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelModalId(null)}>Close</Button>
            <Button
              variant="destructive"
              onClick={handleCancelPO}
              disabled={cancelReason.length < 10 || !!cancellingId}
            >
              {cancellingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden PDF Generation Container */}
      <div className="fixed -left-[9999px] top-0">
        <div id="po-print-container">
          {/* We'll use a local state to pass the PO being downloaded if needed, 
              but since html2canvas takes a snapshot, we can render it on demand or keep it in sync */}
          {activePOs.find(p => p.id === isDownloading) && (
            <POPrintTemplate 
              po={activePOs.find(p => p.id === isDownloading)}
              vendor={vendors.find(v => v.id === activePOs.find(p => p.id === isDownloading)?.vendor_id)}
              branch={branches.find(b => b.id === activePOs.find(p => p.id === isDownloading)?.branch_id)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
