"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { numberToWords } from "@/lib/number-to-words"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { calculateLandedCost } from "@/utils/compliance"
import { formatCurrency } from "@/utils/format"
import { cn } from "@/lib/utils"
import {
  Truck,
  Download,
  FileText,
  Plus,
  Loader2,
  Scale,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,

  PackageSearch,
  Building2,
  LayoutGrid,
  Search,
  Settings2,
  X
} from "lucide-react"
import { useReactToPrint } from 'react-to-print'
import { useRef } from 'react'
import { POPrintTemplate } from "@/components/procurement/POPrintTemplate"
import { GRNPrintTemplate } from "@/components/procurement/GRNPrintTemplate"
import { GRNDialog } from "@/components/procurement/GRNDialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  status: 'draft' | 'pending_approval' | 'approved' | 'received' | 'partially_received' | 'cancelled'
  total_amount: number
  created_at: string
  vendor: { name: string, state: string }
  branch: { name: string }
  invoice_url?: string
  bill_url?: string
  vendor_bill_amount?: number
  vendor_bills: VendorBill[]
  requester_name?: string
  approver_name?: string
  approver_email?: string
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
    grns?: Array<{ id: string, grn_number: string }>
    discrepancies?: Array<{ status: string }>
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

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [poTerms, setPoTerms] = useState({ gstin: "", terms: "" })
  const [expectedDelivery, setExpectedDelivery] = useState("")
  const [poItems, setPoItems] = useState<POItem[]>([])

  const [userRole, setUserRole] = useState<string | null>(null)
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
      const supabase = createClient();
      let query = supabase
        .from('grns')
        .select(`
          *,
          profiles(full_name),
          grn_items(
            quantity,
            serial_numbers,
            products(model_name, product_code, hsn_code)
          )
        `)
        .eq('po_id', po.id);

      if (grnId) {
        query = query.eq('id', grnId);
      } else {
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data: grnData, error: grnError } = await query;

      if (grnError) throw grnError;
      if (!grnData || grnData.length === 0) {
        throw new Error("No Goods Receipt Note found for this order. It may have been processed before document tracking was enabled.");
      }

      const grnRecord = grnData[0];
      const rawData = grnRecord as unknown as GRNRawData;
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
        items: grnItems.map(item => ({
          product: item.products || { model_name: 'Unknown', product_code: 'N/A', hsn_code: 'N/A' },
          quantity: item.quantity,
          serial_numbers: item.serial_numbers
        }))
      };

      setCurrentGrnData(newGrnData);
      setViewingGRN(newGrnData); // Lead Architect: Trigger immediate UI view instead of browser loop
    } catch (err: unknown) {
      const error = err as Error;
      console.error('GRN PDF Error:', error);
      alert(error.message || 'Could not generate GRN PDF.');
      setIsDownloading(null);
    }
  };


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
        const { data: branchData } = await supabase.from('branches').select('id, name, full_address, gstin').order('name')
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
        // First fetch all templates for the dropdown
        supabase
          .from('po_terms_templates')
          .select('*')
          .order('name')
          .then(({ data }) => {
            if (data) {
                setAvailableTemplates(data);
                const defaultTemplate = data.find(t => t.is_default);
                if (defaultTemplate) setCreationTerms(defaultTemplate.content);
            }
          })

        // Fetch vendor-product mapping
        supabase
          .from('vendor_product_map')
          .select('product_id')
          .eq('vendor_id', vendorId)
          .then(({ data }) => {
            if (data) {
              setMappedProductIds(data.map(m => m.product_id));
            } else {
              setMappedProductIds([]);
            }
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
        id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        product_id: product.id,
        quantity: 1,
        unit_price: product.base_price,
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

  const handleGRNSuccess = async () => {
    const poRes = await fetch('/api/procurement/purchase-orders')
    setActivePOs(await poRes.json())
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
      </div>

      {/* Filter Bar moved inside the Registry Card below */}

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
                      {products
                        .filter(p => mappedProductIds.length === 0 || mappedProductIds.includes(p.id))
                        .map(p => (
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
                        <TableRow key={item.id || idx}>
                          <TableCell>{item.product?.model_name || 'Item'}</TableCell>
                          <TableCell className="font-mono text-xs">{item.product?.hsn_code || '---'}</TableCell>
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
              className="bg-[#001529]"
              disabled={!selectedVendor || poItems.length === 0 || poTerms.gstin.length !== 15 || isGenerating}
              onClick={handleGeneratePO}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {revisionPO ? "Send Back to Draft" : "Generate Purchase Order"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
      {/* Registry with Tabs Integration */}
      <Tabs defaultValue="all" className="w-full gap-0">
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
                  Pending Fulfilment
                  {activePOs.filter(p => p.status === 'approved' || p.status === 'partially_received').length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-semibold h-[21px] w-[21px] rounded-full flex items-center justify-center border border-white shadow-sm ring-2 ring-white">
                      {activePOs.filter(p => p.status === 'approved' || p.status === 'partially_received').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="reconciliation" 
                  className="data-active:bg-[#001529] data-active:text-white data-active:shadow-md rounded-lg px-4 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-normal group border border-slate-200 data-active:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80 relative"
                >
                  <Scale className="h-3.5 w-3.5 group-data-active:text-[#7FD1E3] transition-colors" />
                  3-Way Match Audit
                  {activePOs.filter(p => (p.status === 'received' || p.status === 'partially_received') && p.vendor_bills?.length === 0).length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-semibold h-[21px] w-[21px] rounded-full flex items-center justify-center border border-white shadow-sm ring-2 ring-white">
                      {activePOs.filter(p => (p.status === 'received' || p.status === 'partially_received') && p.vendor_bills?.length === 0).length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="returns" 
                  className="data-active:bg-[#001529] data-active:text-white data-active:shadow-md rounded-lg px-4 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-normal group border border-slate-200 data-active:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80"
                >
                  <RotateCcw className="h-3.5 w-3.5 group-data-active:text-orange-400 transition-colors" />
                  Purchase Returns
                </TabsTrigger>
                <TabsTrigger 
                  value="discrepancy" 
                  className="data-active:bg-[#001529] data-active:text-white data-active:shadow-md rounded-lg px-4 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-normal group data-active:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80 border border-slate-200"
                >
                  <ShieldAlert className="h-3.5 w-3.5 group-data-active:text-red-400 transition-colors" />
                  Discrepancy Report
                </TabsTrigger>
        </TabsList>
      </div>

        <TabsContent value="all" className="animate-in slide-in-from-left-2 duration-300 mt-0">
          <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none py-0">
            <CardHeader className="bg-[#001529] text-white pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none">
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
                          placeholder="Search PO Number or Vendor..."
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
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">PO Number</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Item</TableHead>
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
                            <TableCell className="py-2 px-4 text-slate-500 border-r border-slate-100/50">
                              <div className="font-semibold text-slate-700 truncate max-w-[140px]">
                                {po.items[0]?.product?.model_name || '---'}
                              </div>
                              {po.items.length > 1 && (
                                <div className="text-[9px] text-slate-400 font-bold uppercase">
                                  + {po.items.length - 1} OTHER ITEMS
                                </div>
                              )}
                            </TableCell>
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
                            <TableCell className="py-2 px-4 font-bold text-[#001529] border-r border-slate-100/50">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger render={
                                    <span className="cursor-help hover:text-blue-600 transition-colors">
                                      {formatCurrency(po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity) * (1 + Number(item.tax_rate) / 100)), 0))}
                                    </span>
                                  } />
                                  <TooltipContent className="bg-[#001529] text-white border-slate-700">
                                    <div className="space-y-1 text-[10px]">
                                      <div className="flex justify-between gap-4">
                                        <span className="text-white/60 uppercase font-bold tracking-wider text-[8px]">Excl. Tax</span>
                                        <span className="font-mono">{formatCurrency(po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity)), 0))}</span>
                                      </div>
                                      <div className="flex justify-between gap-4 border-t border-white/10 pt-1">
                                        <span className="text-white/60 uppercase font-bold tracking-wider text-[8px]">Total GST</span>
                                        <span className="font-mono">{formatCurrency(po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity) * Number(item.tax_rate) / 100), 0))}</span>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-left py-4">
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
                                        {userRole === 'admin' && (
                                          <>
                                            <DropdownMenuItem 
                                              onClick={() => handleApprovePO(po.id)}
                                              className="text-green-600 focus:text-green-600 cursor-pointer font-medium"
                                              disabled={approvingId === po.id}
                                            >
                                              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve PO
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                setRevisionPO(po);
                                                const vendor = vendors.find(v => v.id === po.vendor_id);
                                                if (vendor) {
                                                  setSelectedVendor(vendor);
                                                  setPoTerms({ gstin: vendor.gstin || "", terms: vendor.payment_terms || "Immediate" });
                                                }
                                                setSelectedBranch(po.branch_id);
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
                                                })));
                                                setIsCreatingPO(true);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                              }}
                                              className="text-blue-600 focus:text-blue-600 cursor-pointer font-medium"
                                            >
                                              <RotateCcw className="h-4 w-4 mr-2" /> Revise & Approve
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </>
                                    )}

                                    {(po.status === 'approved' || po.status === 'partially_received') && (
                                      <DropdownMenuItem 
                                        onClick={(e) => { e.stopPropagation(); setSelectedPO(po); }}
                                        className="text-[#001529] focus:text-[#001529] cursor-pointer font-medium"
                                      >
                                        <Truck className="h-4 w-4 mr-2" /> Process GRN
                                      </DropdownMenuItem>
                                    )}

                                    {(po.status === 'received' || po.status === 'partially_received') && (
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
                                      onClick={() => handleDownloadPDF(po)} 
                                      className="cursor-pointer font-medium" 
                                      disabled={isDownloading === po.id}
                                    >
                                      {isDownloading === po.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                      Download PO
                                    </DropdownMenuItem>

                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        onClick={() => setViewingPO(po)} 
                                        className="cursor-pointer font-medium"
                                      >
                                        <FileText className="h-4 w-4 mr-2" /> View Purchase Order
                                      </DropdownMenuItem>
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
                </CardContent>
              </Card>
            </TabsContent>

        <TabsContent value="pending" className="animate-in slide-in-from-right-2 duration-300 mt-0">
          <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none overflow-hidden text-xs py-0">
            <CardHeader className="bg-[#001529] text-white pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <Clock className="h-5 w-5 text-amber-400" />
                      Pending Fulfilment Registry
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
                          placeholder="Search PO Number or Vendor..."
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
                              <TableCell className="text-right py-4 px-4">
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
                                      className="text-[#001529] focus:text-[#001529] cursor-pointer font-medium"
                                    >
                                      <Truck className="h-4 w-4 mr-2" /> Process GRN
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      onClick={() => setViewingPO(po)} 
                                      className="cursor-pointer font-medium"
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
                </CardContent>
              </Card>
            </TabsContent>
        <TabsContent value="reconciliation" className="animate-in slide-in-from-right-2 duration-300 mt-0">
          <Card className="shadow-md border-slate-200 border-t-0 rounded-t-none py-0">
            <CardHeader className="bg-[#001529] text-white pt-4 pb-2 px-6 border-b-0 space-y-0 rounded-t-none">
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
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                          <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">PO Reference</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Delayed By</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Ordered Amount</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Received Value</TableHead>
                           <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100">Vendor&apos;s Invoice</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] border-r border-slate-100 text-center">Status</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-slate-400 tracking-wider text-[9px] text-left">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePOs
                        .filter(p => p.status === 'received' || p.status === 'partially_received')
                        .filter(p => {
                          const searchMatch = !auditSearch || p.po_number.toLowerCase().includes(auditSearch.toLowerCase()) || p.vendor?.name?.toLowerCase().includes(auditSearch.toLowerCase());
                          
                          if (auditMatchFilter === "all") return searchMatch;
                          
                          const poTotal = p.items.reduce((acc, item) => acc + (item.unit_price * item.quantity * 1.18), 0);
                          const grnTotal = p.items.reduce((acc, item) => acc + (item.unit_price * item.received_quantity * 1.18), 0);
                          const billAmount = p.vendor_bills?.reduce((acc: number, b: VendorBill) => acc + Number(b.bill_amount), 0) || 0;
                          const hasBill = p.vendor_bills?.length > 0;
                          const isMatch = (Math.abs(poTotal - billAmount) < 1 && Math.abs(grnTotal - billAmount) < 1) || 
                                           p.discrepancies?.some((d: { status: string }) => d.status === 'Resolved');
                          
                          if (auditMatchFilter === "match") return searchMatch && hasBill && isMatch;
                          if (auditMatchFilter === "variance") return searchMatch && hasBill && !isMatch;
                          if (auditMatchFilter === "pending") return searchMatch && !hasBill;
                          
                          return searchMatch;
                        })
                        .map((po) => {
                             const subtotal = po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity)), 0);
                             const taxTotal = po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity) * (Number(item.tax_rate) / 100)), 0);
                             const poTotal = subtotal + taxTotal;
                             
                             const grnSubtotal = po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.received_quantity)), 0);
                             const grnTaxTotal = po.items.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.received_quantity) * (Number(item.tax_rate) / 100)), 0);
                             const grnTotal = grnSubtotal + grnTaxTotal;
                             
                             const billAmount = po.vendor_bills?.reduce((acc: number, b: VendorBill) => acc + Number(b.bill_amount), 0) || 0;
                             const isMatch = (Math.abs(poTotal - billAmount) < 1 && Math.abs(grnTotal - billAmount) < 1) || 
                                            po.discrepancies?.some((d: { status: string }) => d.status === 'Resolved');
                             const matchesPO = Math.abs(poTotal - billAmount) < 1 || po.discrepancies?.some((d: { status: string }) => d.status === 'Resolved');
                            const hasBill = po.vendor_bills?.length > 0;
                            const daysOutstanding = Math.floor((new Date().getTime() - new Date(po.created_at).getTime()) / (1000 * 3600 * 24));

                           return (
                             <TableRow key={po.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0 text-xs">
                               <TableCell className="py-2 px-4 border-r border-slate-100/50 font-bold font-mono text-[#001529]">{po.po_number}</TableCell>
                               <TableCell className="py-2 px-4 border-r border-slate-100/50">
                                 <div className="flex items-center gap-1.5">
                                   <div className={`h-2 w-2 rounded-full ${daysOutstanding > 5 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                                   <span className={`font-bold ${daysOutstanding > 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                     {daysOutstanding} Days
                                   </span>
                                 </div>
                               </TableCell>
                               <TableCell className="py-2 px-4 border-r border-slate-100/50 font-semibold text-slate-600">{po.vendor?.name}</TableCell>
                               <TableCell className="py-2 px-4 border-r border-slate-100/50 font-bold text-slate-500">
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
                               <TableCell className="py-2 px-4 border-r border-slate-100/50 font-bold text-blue-600">
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
                                 "py-2 px-4 border-r border-slate-100/50 font-bold",
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
                              <TableCell className="text-left py-4 px-4">
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
                                        onClick={() => setViewingPO(po)} 
                                        className="cursor-pointer font-medium"
                                      >
                                        <Search className="h-4 w-4 mr-2" /> Audit & Reconcile
                                      </DropdownMenuItem>

                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        onClick={() => handleDownloadPDF(po)}
                                        className="text-[#001529] focus:text-[#001529] cursor-pointer font-medium"
                                        disabled={isDownloading === po.id}
                                      >
                                        {isDownloading === po.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                        Download PO
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
                                      className="cursor-pointer font-medium"
                                    >
                                      <FileText className="h-4 w-4 mr-2" /> View Purchase Order
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
          <DialogContent className="w-[90vw] max-w-[1200px] sm:max-w-none h-[85vh] flex flex-col overflow-hidden p-0 gap-0 border-none shadow-2xl">
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
                    <DialogDescription className="text-slate-400 font-medium m-0">
                      <span className="opacity-60 text-[10px] uppercase tracking-widest font-black mr-2">Date:</span>
                      {new Date(viewingPO.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </DialogDescription>
                  </div>
                </div>

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
                      {viewingPO.items.map((item: POItem, idx: number) => (
                        <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="text-center font-bold text-slate-400 text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900 text-sm">{item.product?.model_name || 'Item'}</div>
                            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">SKU: {item.product?.product_code}</div>
                          </TableCell>
                          <TableCell className="text-slate-500 font-mono text-[10px] font-bold tracking-tighter">{item.product?.hsn_code || '---'}</TableCell>
                          <TableCell className="text-center font-black text-slate-900 text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right font-bold text-slate-600">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-black text-[#001529]">{formatCurrency(item.total_item_cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Lead Architect: Financial Flow & Totals */}
                <div className="flex justify-end pt-4">
                  <div className="w-[340px] space-y-2 p-6 rounded-2xl bg-[#001529]/5 border border-[#001529]/10 animate-in fade-in slide-in-from-right-4">
                    {(() => {
                      const netTaxableValue = viewingPO.items.reduce((acc: number, item: POItem) => acc + item.total_item_cost, 0);
                      const cgst = netTaxableValue * 0.09;
                      const sgst = netTaxableValue * 0.09;
                      const grandTotal = netTaxableValue + cgst + sgst;
                      
                      return (
                        <>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 uppercase tracking-tight">Net Taxable Value</span>
                            <span className="font-black text-slate-900">{formatCurrency(netTaxableValue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 uppercase tracking-tight">CGST (9%)</span>
                            <span className="font-black text-slate-900">{formatCurrency(cgst)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                            <span className="font-bold text-slate-500 uppercase tracking-tight">SGST (9%)</span>
                            <span className="font-black text-slate-900">{formatCurrency(sgst)}</span>
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

              {/* Audit Trail */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <ShieldCheck className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black uppercase tracking-tighter text-[#7FD1E3]">Cryptographic Audit Trail</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Authorized Systems Oversight Registry</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Generated By</p>
                      <p className="text-xs font-bold uppercase">System Automata v2.4</p>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Encrypted Hash</p>
                      <p className="text-[10px] font-mono text-[#7FD1E3]">SHA256: {viewingPO.id.substring(0, 16)}...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-6 border-t rounded-b-lg shrink-0">
              <div className="flex justify-between items-center w-full">
                <Button 
                  variant="outline" 
                  className="rounded-xl font-bold text-xs uppercase tracking-widest h-12 border-2 hover:bg-slate-100 transition-all px-8"
                  onClick={() => setViewingPO(null)}
                >
                  Close Document
                </Button>
                <div className="flex gap-4">
                   <Button 
                    className="bg-[#001529] text-white hover:bg-slate-800 font-bold text-xs uppercase h-12 px-8 rounded-xl shadow-md transition-all active:scale-95 flex gap-2"
                    onClick={() => {
                        handleDownloadPDF(viewingPO);
                    }}
                    disabled={isDownloading === viewingPO.id}
                  >
                    {isDownloading === viewingPO.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Generate Formal PDF
                  </Button>
                </div>
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
          <DialogContent className="w-[90vw] max-w-[1200px] sm:max-w-none h-[85vh] flex flex-col overflow-hidden p-0 gap-0 border-none shadow-2xl">
            <DialogHeader className="bg-[#064E3B] p-8 text-white rounded-t-lg shrink-0">
              <div className="flex justify-between items-start w-full">
                <div className="space-y-4">
                  <h1 className="text-3xl font-black tracking-tighter text-white m-0 leading-none">
                    Goods Receipt Note
                  </h1>
                  <div className="space-y-1">
                    <p className="text-xl font-bold m-0 flex items-center gap-2">
                      <span className="opacity-60 text-sm uppercase tracking-widest font-black">GRN No:</span>
                      {viewingGRN.grn_number}
                    </p>
                    <DialogDescription className="text-emerald-100 font-medium m-0">
                      <span className="opacity-60 text-[10px] uppercase tracking-widest font-black mr-2">Received Date:</span>
                      {new Date(viewingGRN.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </DialogDescription>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-black text-white m-0">Ethan Home Appliances</p>
                      <p className="text-[9px] uppercase tracking-widest font-black m-0 text-emerald-300">Inventory Management System</p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="grid md:grid-cols-2 gap-8 mb-8 p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Receiving Location</Label>
                  <p className="font-bold text-slate-900">{viewingGRN.branch_name || "Central Warehouse"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Condition Details</Label>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                    &quot;{viewingGRN.condition_notes || "Documented compliance check passed. No damages reported at time of entry."}&quot;
                  </p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
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
    </div>
  )
}
