"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Save, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MultiSelect } from "@/components/ui/multi-select"

interface Branch {
  id: string
  name: string
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string | null
  assigned_branch_id: string | null
  assigned_branch_ids: string[] | null
}

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: Branch[]
  profile: Profile | null
  onSuccess: () => void
  onUpdate: (profileId: string, updates: Partial<Profile>) => Promise<{ error: Error | null }>
}

export function EditUserModal({ 
  open, 
  onOpenChange, 
  branches,
  profile,
  onSuccess,
  onUpdate
}: EditUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: "",
    role: "staff",
    branchIds: [] as string[],
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || "",
        role: profile.role || "staff",
        branchIds: profile.assigned_branch_ids || (profile.assigned_branch_id ? [profile.assigned_branch_id] : []),
      })
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    
    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await onUpdate(profile.id, {
        full_name: formData.fullName,
        role: formData.role,
        assigned_branch_ids: formData.branchIds,
        assigned_branch_id: formData.branchIds.length > 0 ? formData.branchIds[0] : null
      })

      if (updateError) throw updateError

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-[#001529]">
            Update User Profile
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">
            Modify credentials and branch assignments for this identity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-bold uppercase">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Email</Label>
              <div className="h-9 px-3 rounded-md bg-slate-50 border border-slate-100 flex items-center">
                <span className="text-xs font-mono text-slate-400">{profile?.email}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
              <Input
                id="edit-fullName"
                placeholder="Name of individual"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="h-9 text-xs font-bold border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-role" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Access Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val || "" })}
                >
                  <SelectTrigger className="h-9 text-xs font-bold border-slate-200 uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin/Owner" className="text-xs font-bold uppercase">Admin/Owner</SelectItem>
                    <SelectItem value="manager" className="text-xs font-bold uppercase">Manager</SelectItem>
                    <SelectItem value="staff" className="text-xs font-bold uppercase">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 overflow-hidden">
                <Label htmlFor="edit-branch" className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Branches Allotted</Label>
                <MultiSelect
                  options={branches.map(b => ({ label: b.name, value: b.id }))}
                  selected={formData.branchIds}
                  onChange={(vals) => setFormData({ ...formData, branchIds: vals })}
                  placeholder="Select Branches"
                  className="h-9 min-h-0 [&>div]:min-h-[36px] [&>div]:py-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#001529] hover:bg-[#002a52] text-xs font-bold uppercase h-10 gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? "Syncing Updates..." : "Save Profile Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
