"use client"

import React, { useState } from "react"
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
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, UserPlus, AlertCircle } from "lucide-react"
import { MultiSelect } from "@/components/ui/multi-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ROLES, roleLabel, isBranchScoped } from "@/lib/rbac"

interface Branch {
  id: string
  name: string
}

interface ProvisionUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: Branch[]
  onSuccess: () => void
}

export function ProvisionUserModal({ 
  open, 
  onOpenChange, 
  branches,
  onSuccess 
}: ProvisionUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "sales_associate",
    branchIds: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to provision user")
      }

      onSuccess()
      onOpenChange(false)
      setFormData({
        email: "",
        password: "",
        fullName: "",
        role: "sales_associate",
        branchIds: [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-[#001529]">
            Provision New Account
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Deploy immediate access credentials across the network.
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
              <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
              <Input
                id="fullName"
                placeholder="e.g. Anees Ahad"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="h-9 text-xs font-bold border-slate-200"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity (Email)</Label>
              <Input
                id="email"
                type="email"
                placeholder="identity@ethan-home.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9 text-xs font-bold border-slate-200"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-9 text-xs font-bold border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Access Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val || "" })}
                >
                  <SelectTrigger className="h-9 text-xs font-bold border-slate-200 uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ROLES.map(r => (
                        <SelectItem key={r} value={r} className="text-xs font-bold uppercase">{roleLabel(r)}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="branch" className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Branches Allotted</Label>
                {!isBranchScoped(formData.role) ? (
                  <div className="h-9 flex items-center px-3 border border-slate-200 rounded-md bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    All Branches (Role-Wide)
                  </div>
                ) : formData.role === 'sales_associate' ? (
                  <Select
                    value={formData.branchIds[0] || ""}
                    onValueChange={(val) => setFormData({ ...formData, branchIds: val ? [val] : [] })}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold border-slate-200 uppercase">
                      <SelectValue placeholder="Select Primary Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id} className="text-xs font-bold uppercase">{b.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <MultiSelect
                    options={branches.map(b => ({ label: b.name, value: b.id }))}
                    selected={formData.branchIds}
                    onChange={(vals) => setFormData({ ...formData, branchIds: vals })}
                    placeholder="Select Branches"
                    className="h-9 min-h-0 [&>div]:min-h-[36px] [&>div]:py-1"
                  />
                )}
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
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? "Authorizing Deployment..." : "Execute Provisioning"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
