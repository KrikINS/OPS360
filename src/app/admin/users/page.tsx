"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserPlus, Loader2, LucideIcon, ShieldCheck, Activity, Save, CheckCircle2, XCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { getSession } from 'next-auth/react'
import { getAdminUsersDataAction, updateUserPermissionsAction, updateProfileDetailsAction } from '@/app/actions/admin-users'

import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { ProvisionUserModal } from "@/components/admin/ProvisionUserModal"
import { UserProfileModal } from "@/components/admin/UserProfileModal"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: string | null
  assigned_branch_id: string | null
  assigned_branch_ids: string[] | null
  permissions: Record<string, boolean>
  register_permissions: Record<string, Record<string, 'none' | 'view' | 'edit'>> | null
  is_active: boolean
}

interface Branch {
  id: string
  name: string
}

const MODULES = ["pos", "inventory", "procurement", "sales", "finance", "service", "admin", "hr"] as const;
const ROLES = ["Admin/Owner", "Branch Manager", "Sales Rep", "Accounts Keeper", "Technician", "HR Manager", "Driver"] as const;

export default function UserManagementPage() {
  const [stats, setStats] = useState({
    total_users: 0,
    pending_requests: 0,
    recent_logins: 0
  })
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [modifiedUserIds, setModifiedUserIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  const router = useRouter()

  const refreshData = React.useCallback(async () => {
    setLoading(true)
    const session = await getSession()
    const res = await getAdminUsersDataAction(session?.user?.id)
    if (res.stats) setStats(res.stats)
    if (res.profiles) setProfiles(res.profiles as unknown as Profile[])
    if (res.branches) setBranches(res.branches as unknown as Branch[])
    setModifiedUserIds(new Set())
    setLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      const session = await getSession()
      const res = await getAdminUsersDataAction(session?.user?.id)
      if (mounted) {
        if (res.stats) setStats(res.stats)
        if (res.profiles) setProfiles(res.profiles as unknown as Profile[])
        if (res.branches) setBranches(res.branches as unknown as Branch[])
        if (res.currentUserProfile) setCurrentUserProfile(res.currentUserProfile as unknown as Profile)
        setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  const togglePermission = (profileId: string, currentPerms: Record<string, boolean>, module: string, checked: boolean) => {
    const nextPerms = { ...(currentPerms || {}), [module]: checked }
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, permissions: nextPerms } : p))
    setModifiedUserIds(prev => new Set(prev).add(profileId))
  }

  const handleRoleChange = (profileId: string, newRole: string) => {
    const nextPerms: Record<string, boolean> = {}
    
    if (newRole === "Admin/Owner") {
      MODULES.forEach(m => nextPerms[m] = true)
    } else if (newRole === "Accounts Keeper") {
      MODULES.forEach(m => nextPerms[m] = false)
      nextPerms["finance"] = true
    } else if (newRole === "HR Manager") {
      MODULES.forEach(m => nextPerms[m] = false)
      nextPerms["hr"] = true
    } else {
      MODULES.forEach(m => nextPerms[m] = false)
    }

    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole, permissions: nextPerms } : p))
    setModifiedUserIds(prev => new Set(prev).add(profileId))
  }

  const assignBranches = (profileId: string, branchIds: string[]) => {
    setProfiles(prev => prev.map(p => p.id === profileId ? { 
      ...p, 
      assigned_branch_ids: branchIds, 
      assigned_branch_id: branchIds.length > 0 ? branchIds[0] : null 
    } : p))
    setModifiedUserIds(prev => new Set(prev).add(profileId))
  }

  const handleSelectAllBranches = (profileId: string) => {
    const allIds = branches.map(b => b.id)
    assignBranches(profileId, allIds)
  }

  const handleSaveBatch = async () => {
    if (modifiedUserIds.size === 0) return
    setLoading(true)
    try {
      const updates = profiles.filter(p => modifiedUserIds.has(p.id))

      for (const user of updates) {
        const result = await updateUserPermissionsAction({
          userId: user.id,
          role: user.role ?? 'staff',
          permissions: user.permissions ?? {},
          branchIds: user.assigned_branch_ids ?? [],
        })
        if (!result.success) {
          throw new Error(result.error ?? 'Failed to save')
        }
      }

      setToast({ message: `Access protocols successfully updated for ${modifiedUserIds.size} users`, type: 'success' })
      setModifiedUserIds(new Set())
      await refreshData()
      router.refresh()
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      const error = err as Error
      setToast({ message: `System error: ${error.message || "Unknown error during save"}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenProfileModal = (profile: Profile) => {
    setSelectedProfile(profile)
    setIsProfileModalOpen(true)
  }

  const handleSaveProfileFromModal = async (updated: Profile) => {
    setLoading(true)
    try {
      const [profileResult, permResult] = await Promise.all([
        updateProfileDetailsAction({
          userId: updated.id,
          fullName: updated.full_name,
          email: updated.email,
        }),
        updateUserPermissionsAction({
          userId: updated.id,
          role: updated.role ?? 'staff',
          permissions: updated.permissions ?? {},
          branchIds: updated.assigned_branch_ids || [],
        }),
      ])

      if (!profileResult.success || !permResult.success) {
        const msg = profileResult.error ?? permResult.error ?? 'Failed to update profile'
        setToast({ message: `Error updating profile: ${msg}`, type: 'error' })
      } else {
        setToast({ message: "Identity metadata successfully synchronized", type: 'success' })
        await refreshData()
        setSelectedProfile(prev => prev ? updated : null)
        router.refresh()
        setTimeout(() => setToast(null), 3000)
      }
    } catch (err) {
      const error = err as Error
      setToast({ message: `System error: ${error.message || "Unknown error during update"}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#001529] uppercase">User Management</h1>
            <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Verify live accounts, assign protocols, and audit permissions.</p>
          </div>

          {/* Toast Notification Container */}
          {toast && (
            <div className={cn(
              "fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-10 duration-500 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border backdrop-blur-md transition-all",
              toast.type === 'success' ? "bg-emerald-500/90 border-emerald-400/50 text-white" : "bg-rose-500/90 border-rose-400/50 text-white"
            )}>
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 animate-bounce" />
              ) : (
                <XCircle className="h-5 w-5 animate-pulse" />
              )}
              <div className="flex flex-col">
                <span className="font-black text-[10px] uppercase tracking-widest opacity-70">
                  {toast.type === 'success' ? "System Success" : "Protocol Deviation"}
                </span>
                <span className="font-bold text-sm tracking-tight">{toast.message}</span>
              </div>
              <button 
                onClick={() => setToast(null)}
                className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#001529] hover:bg-[#002a52] gap-1.5 font-bold shadow-md h-10 px-6 uppercase text-xs"
          >
            <UserPlus className="h-4 w-4" /> Provision New User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard 
          icon={Users} 
          label="Total Accounts" 
          value={loading ? "..." : stats.total_users.toString()} 
          sub="Live Operational Access" 
          gradient="from-[#001529] to-[#003366]"
        />
        <StatsCard 
          icon={ShieldCheck} 
          label="Access Integrity" 
          value="100%" 
          sub="Standard Protocols Applied" 
          gradient="from-emerald-600 to-teal-700"
        />
        <StatsCard 
          icon={Activity} 
          label="System Load" 
          value="Normal" 
          sub="Identity Services Active" 
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 text-left">Access Control Matrix (ACM)</CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400 uppercase text-left">Real-time module authorization and branch allotment.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {modifiedUserIds.size > 0 && (
                <Button 
                  onClick={handleSaveBatch}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 font-bold shadow-md h-8 px-4 uppercase text-[10px]"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save Updates ({modifiedUserIds.size})
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => refreshData()} disabled={loading} className="h-8 w-8 p-0">
                <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-6 h-12">User Identity</TableHead>
                    <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10">Role</TableHead>
                    {MODULES.map(m => (
                      <TableHead key={m} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10 p-0 w-12">{m}</TableHead>
                    ))}
                    <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10">Branch Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={MODULES.length + 3} className="h-48 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-200 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : profiles.map((profile) => (
                    <TableRow key={profile.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors h-16">
                      <TableCell className="pl-6">
                        <button 
                          onClick={() => handleOpenProfileModal(profile)}
                          className="flex flex-col group text-left outline-none"
                        >
                          <span className="text-xs font-black text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                            {profile.full_name || "Unassigned Identity"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{profile.email}</span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Select value={profile.role || ""} onValueChange={(val) => val && handleRoleChange(profile.id, val)}>
                          <SelectTrigger className="w-full h-8 text-[10px] font-black uppercase tracking-tight bg-slate-50 border-slate-200">
                            <SelectValue placeholder="No Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {ROLES.map(role => (
                                <SelectItem key={role} value={role} className="text-[10px] uppercase font-bold">{role}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {MODULES.map(m => (
                        <TableCell key={m} className="p-0 text-center">
                          <Switch 
                            checked={profile.permissions?.[m] || false}
                            onCheckedChange={(checked) => togglePermission(profile.id, profile.permissions, m, checked)}
                            className="scale-75 mx-auto"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              "flex w-full items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-2 pl-2.5 text-[10px] whitespace-nowrap outline-none select-none focus-visible:border-blue-500 transition-colors h-8 font-black uppercase tracking-tight"
                            )}
                          >
                            <span className="truncate">
                              {(profile.assigned_branch_ids?.length === branches.length && branches.length > 0)
                                ? "All Branches"
                                : `${profile.assigned_branch_ids?.length || 0}/${branches.length} Selected`}
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Branch Access Control</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuCheckboxItem
                                checked={profile.assigned_branch_ids?.length === branches.length && branches.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) handleSelectAllBranches(profile.id)
                                  else assignBranches(profile.id, [])
                                }}
                                className="text-[10px] font-black uppercase"
                              >
                                Select All Branches
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuSeparator />
                              {branches.map((branch) => (
                                <DropdownMenuCheckboxItem
                                  key={branch.id}
                                  checked={profile.assigned_branch_ids?.includes(branch.id) || false}
                                  onCheckedChange={(checked) => {
                                    const current = profile.assigned_branch_ids || []
                                    const next = checked 
                                      ? [...current, branch.id]
                                      : current.filter(id => id !== branch.id)
                                    assignBranches(profile.id, next)
                                  }}
                                  className="text-[10px] font-bold uppercase"
                                >
                                  {branch.name}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
      </Card>

      <ProvisionUserModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        branches={branches}
        onSuccess={() => refreshData()}
      />

      {selectedProfile && (
        <UserProfileModal
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
          profile={selectedProfile}
          currentUserRole={currentUserProfile?.role || null}
          onSave={handleSaveProfileFromModal}
        />
      )}
    </div>
  )
}

function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  sub, 
  gradient = "from-slate-700 to-slate-900" 
}: { 
  icon: LucideIcon, 
  label: string, 
  value: string, 
  sub: string,
  gradient?: string
}) {
  return (
    <Card className={`border-none shadow-lg bg-gradient-to-br ${gradient} text-white overflow-hidden relative group`}>
      <div className="absolute right-[-10%] top-[-10%] opacity-10 group-hover:scale-110 transition-transform duration-500">
        <Icon className="h-24 w-24" />
      </div>
      <CardContent className="p-6 relative z-10 flex items-center gap-5">
        <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1.5">{label}</p>
          <h3 className="text-3xl font-black tracking-tight">{value}</h3>
          <p className="text-[10px] text-white/40 font-bold uppercase mt-1 tracking-wider">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}
