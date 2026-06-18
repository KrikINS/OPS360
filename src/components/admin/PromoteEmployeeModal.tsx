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
import { Loader2, UserCheck, AlertCircle, ShieldCheck } from "lucide-react"
import { MultiSelect } from "@/components/ui/multi-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ROLES, roleLabel, isBranchScoped } from "@/lib/rbac"
import { promoteEmployeeToUserAction } from "@/app/actions/admin-users"

interface Branch {
  id: string
  name: string
}

interface PromoteEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: {
    employeeId: string
    fullName: string | null
    email: string | null
    branchId: string | null
  }
  branches: Branch[]
  onSuccess: () => void
}

export function PromoteEmployeeModal({
  open,
  onOpenChange,
  employee,
  branches,
  onSuccess,
}: PromoteEmployeeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: employee.email ?? "",
    password: "",
    role: "sales_associate",
    branchIds: employee.branchId ? [employee.branchId] : [] as string[],
  })

  // Reset form when modal opens with a new employee
  React.useEffect(() => {
    if (open) {
      setError(null)
      setFormData({
        email: employee.email ?? "",
        password: "",
        role: "sales_associate",
        branchIds: employee.branchId ? [employee.branchId] : [],
      })
    }
  }, [open, employee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await promoteEmployeeToUserAction({
      employeeId: employee.employeeId,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      branchIds: formData.branchIds,
    })

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Failed to promote employee")
      return
    }

    onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-[#001529] flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Grant Login Access
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Promote offline employee to a system login.
          </DialogDescription>
        </DialogHeader>

        {/* Read-only employee name */}
        <div className="py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Promoting</p>
          <p className="text-sm font-black text-[#001529] uppercase tracking-tight">
            {employee.fullName ?? "Unknown Employee"}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold">
            Employee record will remain intact — no new employee row created.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-bold uppercase">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="promote-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Login Email
            </Label>
            <Input
              id="promote-email"
              type="email"
              placeholder="login@example.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-9 text-xs font-bold border-slate-200"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="promote-password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Initial Password
            </Label>
            <Input
              id="promote-password"
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
              <Label htmlFor="promote-role" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Access Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={(val) => {
                  const newRole = val ?? formData.role
                  setFormData({
                    ...formData,
                    role: newRole,
                    // reset branch selection when role changes scoping rules
                    branchIds: !isBranchScoped(newRole) ? [] : formData.branchIds,
                  })
                }}
              >
                <SelectTrigger className="h-9 text-xs font-bold border-slate-200 uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs font-bold uppercase">
                        {roleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="promote-branch" className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                Branch Allotment
              </Label>
              {!isBranchScoped(formData.role) ? (
                <div className="h-9 flex items-center px-3 border border-slate-200 rounded-md bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  All Branches (Role-Wide)
                </div>
              ) : formData.role === "sales_associate" ? (
                <Select
                  value={formData.branchIds[0] || ""}
                  onValueChange={(val) => setFormData({ ...formData, branchIds: val ? [val] : [] })}
                >
                  <SelectTrigger className="h-9 text-xs font-bold border-slate-200 uppercase">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs font-bold uppercase">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <MultiSelect
                  options={branches.map((b) => ({ label: b.name, value: b.id }))}
                  selected={formData.branchIds}
                  onChange={(vals) => setFormData({ ...formData, branchIds: vals })}
                  placeholder="Select Branches"
                  className="h-9 min-h-0 [&>div]:min-h-[36px] [&>div]:py-1"
                />
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-bold uppercase h-10 gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              {loading ? "Granting Access..." : "Grant Login Access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
