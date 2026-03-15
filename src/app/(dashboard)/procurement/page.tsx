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
  Download
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
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

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
        status: isRevision ? 'draft' : 'pending_approval' // "sending it back to the draft state"
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
    return statusMatch && branchMatch
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
        <Button
          onClick={() => {
            if (isCreatingPO) {
              resetForm()
            } else {
              setIsCreatingPO(true)
              setSelectedPO(null)
            }
          }}
          className="bg-[#001529] hover:bg-[#002a52] text-white gap-2 shadow-lg"
        >
          {isCreatingPO ? "View PO Registry" : <><Plus className="h-4 w-4" /> Create New PO</>}
        </Button>
      </div>

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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 whitespace-nowrap">Ship To:</span>
                        <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v || "all")}>
                          <SelectTrigger className="w-[180px] h-8 text-xs">
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
                        <Label className="text-xs text-slate-500">Filter Status:</Label>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
                          <SelectTrigger className="w-[150px] h-8 text-xs">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="pending_approval">Pending Approval</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="partially_received">Partially Received</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold">PO Number</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Ship To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead className="text-left font-bold text-slate-900 border-b">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPOs
                        .map((po) => (
                          <TableRow
                            key={po.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <TableCell
                              className="font-bold text-[#001529] font-mono cursor-pointer hover:underline"
                              onClick={() => setViewingPO(po)}
                            >
                              {po.po_number}
                            </TableCell>
                            <TableCell className="font-medium">{po.vendor?.name}</TableCell>
                            <TableCell className="text-slate-600">{po.branch?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={
                                po.status === 'received' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                  po.status === 'approved' ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                                    po.status === 'cancelled' ? "bg-red-100 text-red-700 hover:bg-red-200" :
                                      po.status === 'partially_received' ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                                        "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }>
                                {po.status === 'partially_received' ? 'PARTIAL' : po.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-slate-700">₹{po.total_amount.toLocaleString()}</TableCell>
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
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold">PO Number</TableHead>
                        <TableHead>Delayed By</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="w-[300px]">Item Progress</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePOs
                        .filter(p => p.status === 'approved' || p.status === 'partially_received')
                        .map((po) => {
                          const daysOutstanding = Math.floor((new Date().getTime() - new Date(po.created_at).getTime()) / (1000 * 3600 * 24));
                          return (
                            <TableRow key={po.id} className="hover:bg-slate-50/50 transition-colors group">
                              <TableCell>
                                <div className="font-bold text-[#001529] font-mono">{po.po_number}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{po.branch?.name}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div className={`h-2 w-2 rounded-full ${daysOutstanding > 5 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                                  <span className={`font-bold ${daysOutstanding > 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {daysOutstanding} Days
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-slate-600">
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
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold">PO Reference</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>1. Agreement (PO)</TableHead>
                        <TableHead>2. Reality (GRN)</TableHead>
                        <TableHead>3. Demand (Bill)</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right px-8">Actions</TableHead>
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
                            <TableRow key={po.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell className="font-bold font-mono text-[#001529]">{po.po_number}</TableCell>
                              <TableCell className="text-sm font-medium">{po.vendor?.name}</TableCell>
                              <TableCell className="font-semibold text-slate-600">₹{poTotal.toLocaleString()}</TableCell>
                              <TableCell className="font-semibold text-blue-600">₹{grnTotal.toLocaleString()}</TableCell>
                              <TableCell className="font-semibold text-amber-600">
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
        <Dialog open={!!viewingPO} onOpenChange={(open) => !open && setViewingPO(null)}>
          <DialogContent className="max-w-[50vw] w-[50vw] sm:max-w-[50vw] md:max-w-[50vw] lg:max-w-[50vw] max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    {viewingPO.po_number}
                  </DialogTitle>
                  <DialogDescription>
                    Purchase Order Details & History
                  </DialogDescription>
                </div>
                <Badge className={
                  viewingPO.status === 'received' ? "bg-green-100 text-green-700" :
                    viewingPO.status === 'approved' ? "bg-blue-100 text-blue-700" :
                      viewingPO.status === 'cancelled' ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-700"
                }>
                  {viewingPO.status.toUpperCase()}
                </Badge>
              </div>
            </DialogHeader>

            <div className="grid md:grid-cols-3 gap-6 py-6 border-y">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Vendor</Label>
                <p className="font-bold">{viewingPO.vendor.name}</p>
                <p className="text-sm text-muted-foreground">{viewingPO.vendor.state}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ship To</Label>
                <p className="font-bold">{viewingPO.branch.name}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">PO Summary</Label>
                <p className="font-bold">Items: {viewingPO.items.length}</p>
                <p className="text-lg font-bold text-[#001529]">₹{viewingPO.total_amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="py-4 space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Audit Trail</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Created By</Label>
                  <p className="text-sm font-semibold">{viewingPO.requester_name || 'System'}</p>
                  <p className="text-[10px] text-slate-400">{new Date(viewingPO.created_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Approved By</Label>
                  <p className="text-sm font-semibold">{viewingPO.approver_name || '---'}</p>
                </div>
                {viewingPO.status === 'cancelled' && (
                  <div className="col-span-2 space-y-1 border-l pl-4">
                    <Label className="text-[10px] text-red-600 font-bold uppercase">Cancellation Reason</Label>
                    <p className="text-sm text-red-700 italic">&quot;{viewingPO.cancellation_reason || 'No reason provided'}&quot;</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 py-4">
              <h4 className="font-bold text-sm">Item Details</h4>
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-[80px]">#</TableHead>
                      <TableHead className="min-w-[200px]">Item & Description</TableHead>
                      <TableHead>HSN/SAC</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingPO.items.map((item: PurchaseOrder['items'][0], idx: number) => (
                      <TableRow key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <TableCell className="font-medium text-slate-500">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 break-words whitespace-normal">
                            {item.product?.model_name || 'Item'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.product?.product_code}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 font-mono text-xs">{item.product?.hsn_code || '---'}</TableCell>
                        <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-right text-slate-600">₹{item.unit_price.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900">₹{item.total_item_cost.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <div className="flex gap-2">
                {viewingPO.status === 'approved' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => handleDownloadPDF(viewingPO)}
                    disabled={isDownloading === viewingPO.id}
                  >
                    {isDownloading === viewingPO.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download PDF
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setViewingPO(null)}>
                  ✕
                </Button>
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
