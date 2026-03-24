"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserPlus, Loader2, LucideIcon, Edit2, Trash2, ShieldCheck, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"

import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ProvisionUserModal } from "@/components/admin/ProvisionUserModal"
import { EditUserModal } from "@/components/admin/EditUserModal"
import { MultiSelect } from "@/components/ui/multi-select"

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string | null
  assigned_branch_id: string | null
  assigned_branch_ids: string[] | null
  permissions: Record<string, boolean>
  is_active: boolean
}

interface Branch {
  id: string
  name: string
}

const MODULES = ["pos", "inventory", "procurement", "products", "transfers", "staff", "finance", "admin"] as const;

export default function UserManagementPage() {
  const [stats, setStats] = useState({
    total_users: 0,
    pending_requests: 0,
    recent_logins: 0
  })
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  const refreshData = React.useCallback(async () => {
    setLoading(true)
    const [statsRes, profilesRes, branchesRes] = await Promise.all([
      supabase.rpc('get_admin_dashboard_stats'),
      supabase.from('profiles').select('*').order('email'),
      supabase.from('branches').select('id, name')
    ])

    if (statsRes.data) setStats(statsRes.data)
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
    if (branchesRes.data) setBranches(branchesRes.data as Branch[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let mounted = true
    async function init() {
      const [statsRes, profilesRes, branchesRes] = await Promise.all([
        supabase.rpc('get_admin_dashboard_stats'),
        supabase.from('profiles').select('*').order('email'),
        supabase.from('branches').select('id, name')
      ])

      if (mounted) {
        if (statsRes.data) setStats(statsRes.data)
        if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
        if (branchesRes.data) setBranches(branchesRes.data as Branch[])
        setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [supabase])

  const togglePermission = async (profileId: string, currentPerms: Record<string, boolean>, module: string, checked: boolean) => {
    setUpdatingId(`${profileId}-${module}`)
    const nextPerms = { ...(currentPerms || {}), [module]: checked }
    const { error } = await supabase
      .from('profiles')
      .update({ permissions: nextPerms })
      .eq('id', profileId)
    
    if (!error) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, permissions: nextPerms } : p))
    }
    setUpdatingId(null)
  }

  const assignBranches = async (profileId: string, branchIds: string[]) => {
    setUpdatingId(`${profileId}-branch`)
    const { error } = await supabase
      .from('profiles')
      .update({ 
        assigned_branch_ids: branchIds,
        assigned_branch_id: branchIds.length > 0 ? branchIds[0] : null
      })
      .eq('id', profileId)
    
    if (!error) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, assigned_branch_ids: branchIds, assigned_branch_id: branchIds.length > 0 ? branchIds[0] : null } : p))
    }
    setUpdatingId(null)
  }

  const archiveUser = async (profileId: string) => {
    if (!confirm("Are you sure you want to deactivate this user? This will revoke all access instantly.")) return
    
    setUpdatingId(`${profileId}-archive`)
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', profileId)
    
    if (!error) {
      setProfiles(prev => prev.filter(p => p.id !== profileId))
    }
    setUpdatingId(null)
  }

  const updateUserProfile = async (profileId: string, updates: Partial<Profile>) => {
    return await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#001529] uppercase">User Management</h1>
          <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Verify live accounts, assign protocols, and audit permissions.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#001529] hover:bg-[#002a52] gap-1.5 font-bold shadow-md h-10 px-6 uppercase text-xs"
        >
          <UserPlus className="h-4 w-4" /> Provision New User
        </Button>
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
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase text-left">Enterprise identity layer and module-level permissions.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refreshData()} disabled={loading} className="h-8 w-8 p-0">
            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-6 h-10">User Identity</TableHead>
                <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10">Full Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10 text-center">Role</TableHead>
                {MODULES.map(m => (
                  <TableHead key={m} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10">{m}</TableHead>
                ))}
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10">Branch Allotment</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 pr-6 h-10">Actions</TableHead>
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
                <TableRow key={profile.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors h-14">
                  <TableCell className="pl-6 font-medium text-slate-700">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold leading-none">{profile.email.split('@')[0]}</span>
                      <span className="text-[9px] text-slate-400 mt-1 font-mono">{profile.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{profile.full_name || "—"}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-slate-100 text-[9px] font-black uppercase text-slate-600 border-none px-2 h-4">
                      {profile.role || 'GUEST'}
                    </Badge>
                  </TableCell>
                  {MODULES.map(m => (
                    <TableCell key={m} className="text-center">
                      <Checkbox 
                        checked={profile.permissions?.[m] || false}
                        onCheckedChange={(checked) => togglePermission(profile.id, profile.permissions, m, !!checked)}
                        disabled={updatingId === `${profile.id}-${m}`}
                        className="border-slate-300 data-[state=checked]:bg-[#001529] data-[state=checked]:border-[#001529] mx-auto"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="w-[200px]">
                    <MultiSelect
                      options={branches.map(b => ({ label: b.name, value: b.id }))}
                      selected={profile.assigned_branch_ids || (profile.assigned_branch_id ? [profile.assigned_branch_id] : [])}
                      onChange={(vals) => assignBranches(profile.id, vals)}
                      placeholder="No Branch"
                      className="w-full h-8"
                    />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedProfile(profile)
                          setIsEditModalOpen(true)
                        }}
                        className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => archiveUser(profile.id)}
                        disabled={updatingId === `${profile.id}-archive`}
                        className="h-8 w-8 p-0 hover:bg-red-50 text-slate-400 hover:text-red-500"
                      >
                        {updatingId === `${profile.id}-archive` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProvisionUserModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        branches={branches}
        onSuccess={() => refreshData()}
      />

      <EditUserModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        branches={branches}
        profile={selectedProfile}
        onSuccess={() => refreshData()}
        onUpdate={updateUserProfile}
      />
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
