"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  UserPlus, Trash2, Search, Loader2, CheckCircle2, ShieldAlert,
  Mail, Shield, Building2, Eye, EyeOff, ToggleLeft, ToggleRight,
} from "lucide-react"

const MODULES = [
  { key: "inventory",    label: "Inventory",     description: "View and manage stock items" },
  { key: "procurement",  label: "Procurement",   description: "Purchase orders and suppliers" },
  { key: "pos",          label: "POS",           description: "Point of sale transactions" },
  { key: "transfer",     label: "Transfers",     description: "Inter-branch stock movement" },
  { key: "accounting",   label: "Accounting",    description: "Financial records and reports" },
  { key: "staff",        label: "Staff",         description: "HR and employee management" },
  { key: "service",      label: "Service",       description: "After-sales service tickets" },
  { key: "analytics",    label: "Analytics",     description: "Dashboards and reports" },
]

const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/20",
  manager:    "bg-[#7FD1E3]/10 text-[#001529] border border-[#7FD1E3]/30",
  sales:      "bg-green-50 text-[#5A9E78] border border-green-100",
  technician: "bg-amber-50 text-[#D4860A] border border-amber-100",
}

type Profile = {
  id: string
  full_name: string | null
  email: string
  role: string
  branch_id: string | null
  is_active: boolean
  force_password_change: boolean
  created_at: string
}
type Branch = { id: string; name: string }

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Add User modal state
  const [addOpen, setAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addSuccess, setAddSuccess] = useState("")
  const [addError, setAddError] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [addForm, setAddForm] = useState({ fullName: "", email: "", password: "", role: "sales", branchId: "" })

  // User Detail modal state
  const [detailUser, setDetailUser] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailForm, setDetailForm] = useState({ full_name: "", role: "sales", branch_id: "" })
  const [detailSuccess, setDetailSuccess] = useState("")
  const [detailError, setDetailError] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: ps }, { data: bs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("branches").select("id, name"),
    ])
    if (ps) setProfiles(ps as Profile[])
    if (bs) setBranches(bs)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = profiles.filter(p =>
    (p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()))
  )

  // ── Open user detail ──
  const openDetail = async (p: Profile) => {
    setDetailUser(p)
    setDetailForm({ full_name: p.full_name ?? "", role: p.role, branch_id: p.branch_id ?? "" })
    setDetailSuccess("")
    setDetailError("")
    setDetailLoading(true)

    const { data } = await supabase.from("user_permissions").select("module, enabled").eq("user_id", p.id)
    const perms: Record<string, boolean> = {}
    MODULES.forEach(m => { perms[m.key] = true }) // default all true
    data?.forEach(row => { perms[row.module] = row.enabled })
    setPermissions(perms)
    setDetailLoading(false)
  }

  // ── Save user detail ──
  const saveDetail = async () => {
    if (!detailUser) return
    setDetailSaving(true)
    setDetailError("")
    setDetailSuccess("")

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: detailForm.full_name, role: detailForm.role, branch_id: detailForm.branch_id || null })
      .eq("id", detailUser.id)

    if (profileErr) { setDetailError(profileErr.message); setDetailSaving(false); return }

    // Upsert permissions
    const upsertRows = MODULES.map(m => ({
      user_id: detailUser.id, module: m.key, enabled: permissions[m.key] ?? true, updated_at: new Date().toISOString()
    }))
    const { error: permErr } = await supabase.from("user_permissions").upsert(upsertRows, { onConflict: "user_id,module" })
    if (permErr) { setDetailError(permErr.message); setDetailSaving(false); return }

    setDetailSuccess("User updated successfully.")
    fetchData()
    setDetailSaving(false)
  }

  // ── Toggle active/inactive ──
  const toggleActive = async (p: Profile) => {
    await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id)
    fetchData()
  }

  // ── Delete selected ──
  const deleteSelected = async () => {
    if (!selected.size) return
    const ids = Array.from(selected)
    await supabase.from("profiles").delete().in("id", ids)
    setSelected(new Set())
    fetchData()
  }

  // ── Add New User ──
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError("")
    setAddSuccess("")
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, forcePasswordChange: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create account.")
      setAddSuccess(`Account created for ${addForm.fullName}. They will be prompted to change their password on first login.`)
      setAddForm({ fullName: "", email: "", password: "", role: "sales", branchId: "" })
      fetchData()
    } catch (err) { setAddError((err as Error).message) }
    finally { setAddLoading(false) }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{profiles.length} registered accounts across all branches.</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected} className="gap-1.5">
              <Trash2 className="h-4 w-4" /> Delete ({selected.size})
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)} className="bg-[#001529] hover:bg-[#002a52] text-white gap-1.5">
            <UserPlus className="h-4 w-4" /> Add New User
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Table */}
      <div className="card-elevated rounded-lg overflow-hidden bg-white">
        {loading ? (
          <div className="flex items-center justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-[#7FD1E3]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-striped">
              <thead>
                <tr className="bg-[#001529]">
                  <th className="py-3 px-4 text-left">
                    <input type="checkbox" className="rounded cursor-pointer"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())}
                    />
                  </th>
                  {["User", "Email", "Role", "Branch", "Status", "Actions"].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-white font-semibold text-[11px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const branch = branches.find(b => b.id === p.branch_id)
                  const initials = (p.full_name ?? p.email).split(" ").map(n => n[0]).join("").substring(0,2).toUpperCase()
                  return (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-[#e8f9fc]/30 cursor-pointer transition-colors"
                      onClick={() => openDetail(p)}>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="rounded cursor-pointer"
                          checked={selected.has(p.id)}
                          onChange={e => {
                            const next = new Set(selected)
                            e.target.checked ? next.add(p.id) : next.delete(p.id)
                            setSelected(next)
                          }}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-[#001529] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {initials}
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[140px]">{p.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs truncate max-w-[180px]">{p.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${ROLE_COLORS[p.role] ?? ""}`}>{p.role}</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{branch?.name ?? "—"}</td>
                      <td className="py-3 px-4">
                        {p.is_active
                          ? <span className="inline-flex items-center gap-1 text-[11px] text-[#5A9E78] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#5A9E78]" />Active</span>
                          : <span className="inline-flex items-center gap-1 text-[11px] text-[#C0392B] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#C0392B]" />Inactive</span>
                        }
                      </td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleActive(p)}
                          title={p.is_active ? "Deactivate user" : "Activate user"}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {p.is_active
                            ? <ToggleRight className="h-5 w-5 text-[#5A9E78]" />
                            : <ToggleLeft className="h-5 w-5 text-[#C0392B]" />
                          }
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add New User Modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-[#7FD1E3]" /> Provision Staff Account</DialogTitle>
            <DialogDescription>Create a verified account. The staff member will be prompted to change their password upon first login.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 mt-2">
            {addSuccess && <div className="text-sm text-[#5A9E78] bg-green-50 rounded-md px-3 py-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{addSuccess}</div>}
            {addError && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4 shrink-0" />{addError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name</label>
                <Input required value={addForm.fullName} placeholder="e.g. Jane Doe" onChange={e => setAddForm({...addForm, fullName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Work Email</label>
                <Input required type="email" value={addForm.email} placeholder="jane@ethan.com" onChange={e => setAddForm({...addForm, email: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Temporary Password</label>
              <div className="relative">
                <Input required type={showPw ? "text" : "password"} value={addForm.password} placeholder="Minimum 8 characters" onChange={e => setAddForm({...addForm, password: e.target.value})} className="pr-10" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">User will be forced to change this on their first login.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <Select value={addForm.role} onValueChange={v => setAddForm({...addForm, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["sales","technician","manager","admin"].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Branch</label>
                <Select value={addForm.branchId} onValueChange={v => setAddForm({...addForm, branchId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addLoading} className="bg-[#001529] hover:bg-[#002a52] text-white gap-1.5">
                {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── User Detail Modal ── */}
      <Dialog open={!!detailUser} onOpenChange={open => { if (!open) setDetailUser(null) }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#001529] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {(detailUser?.full_name ?? detailUser?.email ?? "?").split(" ").map((n:string) => n[0]).join("").substring(0,2).toUpperCase()}
              </div>
              {detailUser?.full_name ?? detailUser?.email}
            </DialogTitle>
            <DialogDescription>Edit profile details and manage module access permissions.</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-[#7FD1E3]" /></div>
          ) : (
            <div className="space-y-5 mt-2">
              {detailSuccess && <div className="text-sm text-[#5A9E78] bg-green-50 rounded-md px-3 py-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{detailSuccess}</div>}
              {detailError && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{detailError}</div>}

              {/* Profile fields */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Mail className="h-4 w-4 text-[#7FD1E3]" /> Account Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full Name</label>
                    <Input value={detailForm.full_name} onChange={e => setDetailForm({...detailForm, full_name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email (read-only)</label>
                    <Input value={detailUser?.email ?? ""} disabled className="bg-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</label>
                    <Select value={detailForm.role || "sales"} onValueChange={v => setDetailForm({...detailForm, role: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["sales","technician","manager","admin"].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Branch</label>
                    <Select value={detailForm.branch_id || ""} onValueChange={v => setDetailForm({...detailForm, branch_id: v})}>
                      <SelectTrigger><SelectValue placeholder="No branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Access Permissions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#7FD1E3]" /> Module Access Permissions
                </h3>
                <p className="text-xs text-muted-foreground">Enable or disable access to specific ERP modules for this user.</p>
                <div className="grid grid-cols-2 gap-2">
                  {MODULES.map(mod => (
                    <label
                      key={mod.key}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        permissions[mod.key]
                          ? "bg-[#e8f9fc] border-[#7FD1E3]/40"
                          : "bg-muted/30 border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={permissions[mod.key] ?? true}
                        onChange={e => setPermissions(prev => ({ ...prev, [mod.key]: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded accent-[#001529] cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-medium leading-none">{mod.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{mod.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setDetailUser(null)}>Cancel</Button>
            <Button
              onClick={saveDetail}
              disabled={detailSaving || detailLoading}
              className="bg-[#001529] hover:bg-[#002a52] text-white gap-1.5"
            >
              {detailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
