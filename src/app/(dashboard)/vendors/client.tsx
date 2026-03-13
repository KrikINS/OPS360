"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Filter
} from "lucide-react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

type Vendor = {
  id: string
  vendor_code: string
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  gstin?: string
  pan_number?: string
  bank_details?: {
    account_name?: string
    account_number?: string
    ifsc?: string
    bank_name?: string
  }
  payment_terms?: string
  state_code?: string
  category?: string
  compliance_status?: 'Verified' | 'Pending' | 'Blacklisted'
  status: 'awaiting_approval' | 'approved' | 'deactivated'
  created_at: string
}

export default function VendorsClient({ 
  userRole, 
  initialVendors 
}: { 
  userRole: string, 
  initialVendors: Vendor[] 
}) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [formStep, setFormStep] = useState(1)
  
  const [formData, setFormData] = useState({
    name: "",
    trade_name: "",
    gstin: "",
    pan_number: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    state_code: "",
    bank_details: {
      account_name: "",
      account_number: "",
      ifsc: "",
      bank_name: ""
    },
    payment_terms: "",
    credit_limit: "",
    category: ""
  })

  const fetchVendors = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/vendors')
      const data = await res.json()
      if (res.ok) {
        setVendors(data)
      } else {
        alert("Error: " + data.error)
      }
    } catch {
      alert("Error: Failed to fetch vendors")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only fetch if we don't have initial vendors or to keep it updated
    // fetchVendors()
  }, [])

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        alert("Success: Vendor created and awaiting approval.")
        setIsModalOpen(false)
        setFormStep(1)
        setFormData({ 
          name: "", trade_name: "", gstin: "", pan_number: "",
          contact_person: "", email: "", phone: "", address: "", state_code: "",
          bank_details: { account_name: "", account_number: "", ifsc: "", bank_name: "" },
          payment_terms: "", credit_limit: "", category: ""
        })
        fetchVendors()
      } else {
        alert("Error: " + data.error)
      }
    } catch {
      alert("Error: Failed to create vendor")
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      })
      const data = await res.json()
      if (res.ok) {
        alert("Updated: Vendor set to " + newStatus)
        fetchVendors()
      } else {
        alert("Error: " + data.error)
      }
    } catch {
      alert("Error: Failed to update vendor")
    }
  }

  const filteredVendors = vendors.filter(v => 
    statusFilter === "all" ? true : v.status === statusFilter
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Approved</Badge>
      case 'awaiting_approval':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Awaiting Approval</Badge>
      case 'deactivated':
        return <Badge variant="destructive">Deactivated</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getComplianceBadge = (vendor: Vendor) => {
    if (vendor.gstin) {
      return <Badge className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50 ml-2">Verified</Badge>
    }
    return null
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Vendor Management</h1>
            <p className="text-muted-foreground mt-1">Manage suppliers, track compliance, and handle procurement integration.</p>
          </div>
        </div>

        {(userRole === 'admin' || userRole === 'manager' || userRole === 'sales') && (
          <Button 
            onClick={() => {
              setFormStep(1)
              setIsModalOpen(true)
            }}
            className="bg-[#001529] hover:bg-[#002a52] text-white gap-2 shadow-lg"
          >
            <Plus className="h-4 w-4" /> Create New Vendor
          </Button>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreateVendor}>
              <DialogHeader>
                <DialogTitle>Register New Vendor - Step {formStep} of 3</DialogTitle>
                <DialogDescription>
                  {formStep === 1 && "Identity: Legal and tax registration details."}
                  {formStep === 2 && "Contact & Address: Communication and billing info."}
                  {formStep === 3 && "Commercials: Banking and payment terms."}
                </DialogDescription>
              </DialogHeader>

              {formStep === 1 && (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Legal Company Name *</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Ethan Logistics Ltd." 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="trade_name">Trade Name / Brand</Label>
                    <Input 
                      id="trade_name" 
                      placeholder="e.g. Ethan Home Appliances" 
                      value={formData.trade_name}
                      onChange={e => setFormData({...formData, trade_name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="gstin">GSTIN (15 chars) *</Label>
                      <Input 
                        id="gstin" 
                        placeholder="27AAAAA0000A1Z5" 
                        maxLength={15}
                        required
                        value={formData.gstin}
                        onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pan">PAN Number</Label>
                      <Input 
                        id="pan" 
                        placeholder="ABCDE1234F" 
                        value={formData.pan_number}
                        onChange={e => setFormData({...formData, pan_number: e.target.value.toUpperCase()})}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Primary Category</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val || ""})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="logistics">Logistics</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="raw_materials">Raw Materials</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formStep === 2 && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contact">Contact Person</Label>
                      <Input 
                        id="contact" 
                        placeholder="Name" 
                        value={formData.contact_person}
                        onChange={e => setFormData({...formData, contact_person: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        placeholder="+91..." 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="vendor@example.com" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Billing Office Address</Label>
                    <Input 
                      id="address" 
                      placeholder="Full street address" 
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Select value={formData.state_code} onValueChange={(val) => setFormData({...formData, state_code: val || ""})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MH">Maharashtra (27)</SelectItem>
                        <SelectItem value="DL">Delhi (07)</SelectItem>
                        <SelectItem value="KA">Karnataka (29)</SelectItem>
                        <SelectItem value="TN">Tamil Nadu (33)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formStep === 3 && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input 
                        id="bank_name" 
                        placeholder="HDFC, SBI, etc." 
                        value={formData.bank_details.bank_name}
                        onChange={e => setFormData({...formData, bank_details: {...formData.bank_details, bank_name: e.target.value}})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ifsc">IFSC Code</Label>
                      <Input 
                        id="ifsc" 
                        placeholder="HDFC0001234" 
                        value={formData.bank_details.ifsc}
                        onChange={e => setFormData({...formData, bank_details: {...formData.bank_details, ifsc: e.target.value.toUpperCase()}})}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="acc_num">Account Number</Label>
                    <Input 
                      id="acc_num" 
                      placeholder="000123456789" 
                      value={formData.bank_details.account_number}
                      onChange={e => setFormData({...formData, bank_details: {...formData.bank_details, account_number: e.target.value}})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="terms">Payment Terms</Label>
                      <Select value={formData.payment_terms} onValueChange={(val) => setFormData({...formData, payment_terms: val || ""})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Immediate">Immediate</SelectItem>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="credit">Credit Limit</Label>
                      <Input 
                        id="credit" 
                        type="number" 
                        placeholder="500000" 
                        value={formData.credit_limit}
                        onChange={e => setFormData({...formData, credit_limit: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="flex justify-between items-center sm:justify-between">
                <div>
                  {formStep > 1 && (
                    <Button type="button" variant="outline" onClick={() => setFormStep(v => v - 1)}>
                      Previous
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  {formStep < 3 ? (
                    <Button type="button" className="bg-[#001529]" onClick={() => setFormStep(v => v + 1)}>
                      Next Step
                    </Button>
                  ) : (
                    <Button type="submit" className="bg-[#001529]">Complete Registration</Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md border-t-4 border-t-[#001529]">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Supplier Directory</CardTitle>
            <CardDescription>Browse and manage all registered vendors with compliance status.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[120px] font-bold">Code</TableHead>
                <TableHead className="font-bold">Vendor Name</TableHead>
                <TableHead className="font-bold">GSTIN</TableHead>
                <TableHead className="font-bold">Category</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold pr-6">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading vendors...</TableCell>
                </TableRow>
              ) : filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <AlertCircle className="h-8 w-8 opacity-20 mb-2" />
                    No vendors found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id} className="hover:bg-muted/20 transition-colors group">
                    <TableCell className="font-mono font-semibold text-primary">{vendor.vendor_code}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="font-medium">{vendor.name}</div>
                        {getComplianceBadge(vendor)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {vendor.address || 'No address provided'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono">{vendor.gstin || 'Not Provided'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{vendor.category || 'General'}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(userRole === 'admin' || userRole === 'manager') && vendor.status === 'awaiting_approval' && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            onClick={() => handleUpdateStatus(vendor.id, 'approved')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        )}
                        {(userRole === 'admin' || userRole === 'manager') && vendor.status === 'approved' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleUpdateStatus(vendor.id, 'deactivated')}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Deactivate
                          </Button>
                        )}
                        {(userRole === 'admin' || userRole === 'manager') && vendor.status === 'deactivated' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleUpdateStatus(vendor.id, 'approved')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="bg-muted/30 rounded-xl p-6 border flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-primary mt-1" />
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">Compliance Note</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All vendors must undergo identity verification as per standard operating procedures before approval. 
            GSTIN-verified vendors (Sky Blue badge) are eligible for PO creation.
          </p>
        </div>
      </div>
    </div>
  )
}
