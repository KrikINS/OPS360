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
  AlertCircle,
  Filter,
  FileText,
  History,
  TrendingUp,
  Upload,
  BarChart3,
  Clock,
  CheckSquare,
  ShieldCheck
} from "lucide-react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type Vendor = {
  id: string
  vendor_code: string
  name: string
  trade_name?: string
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
  credit_limit?: number
  compliance_status: 'Verified' | 'Pending' | 'Blacklisted'
  status: 'awaiting_approval' | 'approved' | 'deactivated'
  created_at: string
}

interface VendorDocument {
  name: string
  id: string
  created_at: string
  metadata: {
    size: number
    mimetype: string
  }
}

interface AuditLog {
  id: string
  created_at: string
  field_name: string
  old_value: string
  new_value: string
  profiles?: {
    full_name: string
  }
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
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [formStep, setFormStep] = useState(1)
  const [documents, setDocuments] = useState<VendorDocument[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
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

  const fetchVendorDocuments = useCallback(async (vendorId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('vendor-documents')
        .list(vendorId)
      
      if (error) throw error
      
      const formattedDocs: VendorDocument[] = (data || []).map(file => ({
        name: file.name,
        id: file.id || '',
        created_at: file.created_at || new Date().toISOString(),
        metadata: {
          size: file.metadata?.size || 0,
          mimetype: file.metadata?.mimetype || 'application/octet-stream'
        }
      }))
      
      setDocuments(formattedDocs)
    } catch (err) {
      console.error("Error fetching documents:", err)
    }
  }, [])

  const fetchAuditLogs = useCallback(async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from('vendor_audit_log')
        .select(`
          id,
          created_at,
          field_name,
          old_value,
          new_value,
          profiles!inner(full_name)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const formattedLogs: AuditLog[] = (data || []).map((log: {
        id: string;
        created_at: string;
        field_name: string;
        old_value: string;
        new_value: string;
        profiles: { full_name: string } | { full_name: string }[] | null;
      }) => ({
        id: log.id,
        created_at: log.created_at,
        field_name: log.field_name,
        old_value: log.old_value,
        new_value: log.new_value,
        profiles: Array.isArray(log.profiles) ? log.profiles[0] : (log.profiles || undefined)
      }))
      
      setAuditLogs(formattedLogs)
    } catch (err) {
      console.error("Error fetching audit logs:", err)
    }
  }, [])

  useEffect(() => {
    if (selectedVendor && isDetailOpen) {
      fetchVendorDocuments(selectedVendor.id)
      fetchAuditLogs(selectedVendor.id)
    }
  }, [selectedVendor, isDetailOpen, fetchVendorDocuments, fetchAuditLogs])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedVendor) return

    setIsUploading(true)
    try {
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `${selectedVendor.id}/${fileName}`

      const { error } = await supabase.storage
        .from('vendor-documents')
        .upload(filePath, file)

      if (error) throw error

      alert("File uploaded successfully")
      fetchVendorDocuments(selectedVendor.id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      alert("Error uploading file: " + errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage
      .from('vendor-documents')
      .getPublicUrl(`${selectedVendor?.id}/${path}`)
    return data.publicUrl
  }

  useEffect(() => {
    // Only fetch if we don't have initial vendors or to keep it updated
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

  const handleUpdateStatus = async (id: string, newStatus?: string, newCompliance?: string) => {
    try {
      const body: Record<string, string> = { id }
      if (newStatus) body.status = newStatus
      if (newCompliance) body.compliance_status = newCompliance

      const res = await fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        alert("Updated successfully.")
        fetchVendors()
        if (selectedVendor && selectedVendor.id === id) {
          setSelectedVendor(data)
        }
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

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50 ml-2">Verified</Badge>
      case 'Blacklisted':
        return <Badge variant="destructive" className="ml-2">Blacklisted</Badge>
      default:
        return <Badge variant="outline" className="ml-2 text-muted-foreground">{status}</Badge>
    }
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
                      placeholder="e.g. Global Logistics Ltd." 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="trade_name">Trade Name / Brand</Label>
                    <Input 
                      id="trade_name" 
                      placeholder="e.g. Quality Supplies" 
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading vendors...</TableCell>
                </TableRow>
              ) : filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <AlertCircle className="h-8 w-8 opacity-20 mb-2" />
                    No vendors found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => (
                  <TableRow 
                    key={vendor.id} 
                    className="hover:bg-muted/20 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedVendor(vendor)
                      setIsDetailOpen(true)
                    }}
                  >
                    <TableCell className="font-mono font-semibold text-primary">{vendor.vendor_code}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="font-medium">{vendor.name}</div>
                        {getComplianceBadge(vendor.compliance_status)}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vendor Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 overflow-hidden">
          {selectedVendor && (
            <>
              <DialogHeader className="p-6 border-b bg-muted/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border">
                      <Building2 className="h-8 w-8 text-[#001529]" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold">{selectedVendor.name}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-muted-foreground">{selectedVendor.vendor_code}</span>
                        {getStatusBadge(selectedVendor.status)}
                        {getComplianceBadge(selectedVendor.compliance_status)}
                      </div>
                    </div>
                  </div>
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <Select 
                      value={selectedVendor.compliance_status || undefined} 
                      onValueChange={(val: string | null) => {
                        if (val) handleUpdateStatus(selectedVendor.id, undefined, val)
                      }}
                    >
                      <SelectTrigger className="w-[140px] h-9">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Mark Pending</SelectItem>
                        <SelectItem value="Verified">Verify Vendor</SelectItem>
                        <SelectItem value="Blacklisted">Blacklist</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="details" className="gap-2">
                      <FileText className="h-4 w-4" /> Details
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                      <Upload className="h-4 w-4" /> Documents
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="gap-2">
                      <TrendingUp className="h-4 w-4" /> Performance
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">General Info</h4>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Trade Name</Label>
                          <p className="text-sm font-medium">{selectedVendor.trade_name || 'N/A'}</p>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Primary Category</Label>
                          <p className="text-sm font-medium capitalize">{selectedVendor.category || 'General'}</p>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">GSTIN</Label>
                          <p className="text-sm font-mono">{selectedVendor.gstin || 'Missing'}</p>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">PAN Number</Label>
                          <p className="text-sm font-mono">{selectedVendor.pan_number || 'Missing'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Commercials</h4>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Bank Name</Label>
                          <p className="text-sm font-medium">{selectedVendor.bank_details?.bank_name || 'N/A'}</p>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Account Number</Label>
                          <p className="text-sm font-mono">{selectedVendor.bank_details?.account_number || 'N/A'}</p>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                          <p className="text-sm font-medium">{selectedVendor.payment_terms || 'Immediate'}</p>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Credit Limit</Label>
                          <p className="text-sm font-medium">₹{Number(selectedVendor.credit_limit || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-6 animate-in fade-in duration-300">
                    <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-muted/10 relative">
                      <input 
                        type="file" 
                        id="file-upload" 
                        title="Document upload"
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <Upload className={`h-10 w-10 text-muted-foreground mb-4 ${isUploading ? 'animate-pulse text-primary' : 'opacity-20'}`} />
                      <p className="text-sm font-medium">{isUploading ? 'Uploading...' : 'Upload Compliance Documents'}</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">PDF, JPG up to 5MB (GST Cert, Canceled Cheque)</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2" 
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={isUploading}
                      >
                        <Plus className="h-4 w-4" /> {isUploading ? 'Uploading...' : 'Select Files'}
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Attached Files ({documents.length})</h4>
                      <div className="rounded-lg border divide-y bg-white max-h-[250px] overflow-y-auto">
                        {documents.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground text-xs italic">
                            No documents uploaded yet.
                          </div>
                        ) : (
                          documents.map((doc) => (
                            <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-muted/5 transition-colors">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-red-500" />
                                <div>
                                  <p className="text-sm font-medium">{doc.name}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase">
                                    {(doc.metadata?.size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <a 
                                href={getFileUrl(doc.name)} 
                                target="_blank" 
                                rel="noreferrer"
                                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                              >
                                View
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="performance" className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-primary/[0.02] border-primary/10">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2 mb-2 text-primary">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase">Avg. Lead Time</span>
                          </div>
                          <p className="text-2xl font-bold">4.2 Days</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Based on last 10 GRNs</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-primary/[0.02] border-primary/10">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2 mb-2 text-primary">
                            <CheckSquare className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase">Fulfillment %</span>
                          </div>
                          <p className="text-2xl font-bold">98.5%</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Order accuracy rate</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-primary/[0.02] border-primary/10">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2 mb-2 text-primary">
                            <BarChart3 className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase">Active POs</span>
                          </div>
                          <p className="text-2xl font-bold">12</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Currently open orders</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" /> Compliance Audit Trail
                      </h4>
                      <div className="rounded-xl border bg-muted/5 divide-y max-h-[250px] overflow-y-auto">
                        {auditLogs.length === 0 ? (
                          <div className="text-[11px] p-6 text-muted-foreground italic text-center">
                            No compliance changes recorded yet.
                          </div>
                        ) : (
                          auditLogs.map((log) => (
                            <div key={log.id} className="p-3 text-[11px] space-y-1 hover:bg-muted/10 transition-colors">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-primary uppercase">{log.field_name.replace('_', ' ')}</span>
                                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="px-1 text-[9px] h-4">{log.old_value}</Badge>
                                <Plus className="h-3 w-3 text-muted-foreground" />
                                <Badge className="px-1 text-[9px] h-4 bg-emerald-500">{log.new_value}</Badge>
                              </div>
                              <p className="text-muted-foreground pt-1">Changed by: {log.profiles?.full_name || 'System'}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter className="p-4 border-t bg-muted/5 flex justify-between">
                <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Close Overview</Button>
                {selectedVendor.status === 'awaiting_approval' && (userRole === 'admin' || userRole === 'manager') && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => handleUpdateStatus(selectedVendor.id, 'approved')}>
                    <CheckCircle2 className="h-4 w-4" /> Approve Supplier
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
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
