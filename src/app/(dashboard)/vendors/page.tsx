"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
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
  Mail, 
  Phone, 
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
  status: 'awaiting_approval' | 'approved' | 'deactivated'
  created_at: string
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: ""
  })

  const fetchUserRole = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setUserRole(profile?.role || 'sales')
    }
  }, [])

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
    fetchVendors()
    fetchUserRole()
  }, [fetchVendors, fetchUserRole])

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
        setFormData({ name: "", contact_person: "", email: "", phone: "", address: "" })
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Vendor Management</h1>
            <p className="text-muted-foreground mt-1">Manage suppliers, track compliance, and handle approvals.</p>
          </div>
        </div>

        {(userRole === 'admin' || userRole === 'manager' || userRole === 'sales') && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#001529] hover:bg-[#002a52] text-white gap-2 shadow-lg"
          >
            <Plus className="h-4 w-4" /> Create New Vendor
          </Button>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreateVendor}>
              <DialogHeader>
                <DialogTitle>Register New Vendor</DialogTitle>
                <DialogDescription>
                  Enter vendor details. Upon creation, it will be sent for Approval.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Vendor Company Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Ethan Logistics Ltd." 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
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
                  <Label htmlFor="address">Office Address</Label>
                  <Input 
                    id="address" 
                    placeholder="Full street address" 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#001529]">Submit for Approval</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md border-t-4 border-t-[#001529]">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Supplier Directory</CardTitle>
            <CardDescription>Browse and manage all registered vendors.</CardDescription>
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
                <TableHead className="font-bold">Contact</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold pr-6">Management</TableHead>
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
                  <TableRow key={vendor.id} className="hover:bg-muted/20 transition-colors group">
                    <TableCell className="font-mono font-semibold text-primary">{vendor.vendor_code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{vendor.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {vendor.address || 'No address provided'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 opacity-60" /> {vendor.email || '--'}</div>
                        <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 opacity-60" /> {vendor.phone || '--'}</div>
                      </div>
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
            Sequential codes are generated automatically upon successful registration.
          </p>
        </div>
      </div>
    </div>
  )
}
