"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { calculateLandedCost } from "@/utils/compliance"
import { Truck, FileText, Plus, Loader2 } from "lucide-react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase/client"

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
  requester_name?: string
  approver_name?: string
  items: {
    id: string
    product_id: string
    quantity: number
    received_quantity: number
    unit_price: number
    tax_rate: number
    total_item_cost: number
    product: { model_name: string, hsn_code: string }
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
  }

  const handleGeneratePO = async () => {
    if (!selectedVendor || !selectedBranch || poItems.length === 0) return
    setIsGenerating(true)
    
    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: selectedVendor.id,
          branch_id: selectedBranch,
          expected_delivery: expectedDelivery || null,
          items: poItems.map(item => ({
            ...item,
            total_item_cost: (item.unit_price * item.quantity) * (1 + item.tax_rate / 100)
          })),
          status: 'pending_approval'
        })
      })
      
      if (res.ok) {
        setIsCreatingPO(false)
        setPoItems([])
        setSelectedVendor(null)
        setSelectedBranch(null)
        setExpectedDelivery("")
        // Refresh POs
        const poRes = await fetch('/api/procurement/purchase-orders')
        setActivePOs(await poRes.json())
      } else {
        const error = await res.json()
        console.error(error.error || "Failed to create PO")
      }
    } catch (err) {
      console.error("Connection error", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCancelPO = async (poId: string) => {
    setCancellingId(poId)
    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: poId, status: 'cancelled' })
      })
      
      if (res.ok) {
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
                        <SelectItem key={p.id} value={p.id}>{p.model_name} (₹{p.base_price})</SelectItem>
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
                                   onChange={(e) => setManagerOverride(prev => ({ ...prev, [idx]: e.target.checked }))}
                                 />
                                 Override GST
                               </label>
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
              Generate Purchase Order
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
          <Card className="shadow-md">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Active Purchase Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-bold text-primary">{po.po_number}</TableCell>
                      <TableCell>{po.vendor?.name}</TableCell>
                      <TableCell>{po.branch?.name || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{po.requester_name || 'System'}</TableCell>
                      <TableCell className="text-xs">{po.approver_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={po.status === 'received' ? 'default' : po.status === 'approved' ? 'destructive' : 'outline'}>
                          {po.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{po.total_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(po.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {po.status === 'pending_approval' && userRole === 'admin' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleApprovePO(po.id)} 
                            className="bg-green-600 hover:bg-green-700"
                            disabled={approvingId === po.id}
                          >
                            {approvingId === po.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                            Approve
                          </Button>
                        )}
                        {(po.status === 'draft' || po.status === 'pending_approval') && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleCancelPO(po.id)} 
                            className="text-destructive hover:bg-destructive/10"
                            disabled={cancellingId === po.id}
                          >
                            {cancellingId === po.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                            Cancel
                          </Button>
                        )}
                        {(po.status === 'approved' || po.status === 'partially_received') && (
                          <Button size="sm" variant="default" onClick={() => setSelectedPO(po)}>Process GRN</Button>
                        )}
                        {po.status === 'received' && (
                          <span className="text-xs text-green-600 font-medium">Completed</span>
                        )}
                        {po.status === 'cancelled' && (
                          <span className="text-xs text-muted-foreground italic">Cancelled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {activePOs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground italic">
                        No active purchase orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
