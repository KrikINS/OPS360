"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createNonErpStaffMember } from "@/actions/hr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export function AddOfflineStaffModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designation: '',
    department: '',
    dateOfJoining: '',
    branchId: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await createNonErpStaffMember({
      firstName: formData.firstName,
      lastName:  formData.lastName,
      email:     formData.email || undefined,
      phone:     formData.phone || undefined,
      designation:   formData.designation   || undefined,
      department:    formData.department    || undefined,
      dateOfJoining: formData.dateOfJoining || undefined,
      branchId:      formData.branchId      || undefined,
    })
    setLoading(false)

    if (res.success) {
      onOpenChange(false)
      setFormData({ firstName: "", lastName: "", email: "", phone: "", designation: '', department: '', dateOfJoining: '', branchId: '' })
      router.refresh()
    } else {
      setError(res.error || "Failed to create staff member")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Offline Staff Member</DialogTitle>
          <DialogDescription>
            Create a record for non-ERP employees to track them in the directory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name <span className="text-red-500">*</span></Label>
              <Input 
                required 
                value={formData.firstName} 
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name <span className="text-red-500">*</span></Label>
              <Input 
                required 
                value={formData.lastName} 
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Email (Optional)</Label>
            <Input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Phone (Optional)</Label>
            <Input 
              type="tel" 
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide">Designation</Label>
            <Input placeholder="e.g. Sales Executive" value={formData.designation}
              onChange={e => setFormData(f => ({ ...f, designation: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide">Department</Label>
            <Input placeholder="e.g. Sales, Operations" value={formData.department}
              onChange={e => setFormData(f => ({ ...f, department: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide">Date of Joining</Label>
            <Input type="date" value={formData.dateOfJoining}
              onChange={e => setFormData(f => ({ ...f, dateOfJoining: e.target.value }))} className="h-9" />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
