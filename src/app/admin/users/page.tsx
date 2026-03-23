"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserPlus, ShieldAlert, ArrowRight, Loader2, LucideIcon } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Profile {
  id: string
  email: string
  role: string | null
  assigned_branch_id: string | null
  permissions: Record<string, boolean>
}

interface Branch {
  id: string
  name: string
}

const MODULES = ["pos", "inventory", "procurement", "finance", "admin"] as const;

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

  const assignBranch = async (profileId: string, branchId: string | null) => {
    if (!branchId || !profileId) return
    setUpdatingId(`${profileId}-branch`)
    const { error } = await supabase
      .from('profiles')
      .update({ assigned_branch_id: branchId })
      .eq('id', profileId)
    
    if (!error) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, assigned_branch_id: branchId } : p))
    }
    setUpdatingId(null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#001529] uppercase">User Management</h1>
          <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Verify live accounts, assign protocols, and audit permissions.</p>
        </div>
        <Button className="bg-[#001529] hover:bg-[#002a52] gap-1.5 font-bold shadow-md h-10 px-6 uppercase text-xs">
          <UserPlus className="h-4 w-4" /> Provision New User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard 
          icon={Users} 
          label="Total Accounts" 
          value={loading ? "..." : stats.total_users.toString()} 
          sub="Active across network" 
        />
        <StatsCard 
          icon={ShieldAlert} 
          label="Access Requests" 
          value={loading ? "..." : stats.pending_requests.toString()} 
          sub="Awaiting approval" 
        />
        <StatsCard 
          icon={ArrowRight} 
          label="Recent Logins" 
          value={loading ? "..." : stats.recent_logins.toString()} 
          sub="Last 24 hours" 
        />
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 text-left">Protocol Matrix</CardTitle>
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase text-left">Enterprise access layers and branch allotments.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refreshData()} disabled={loading} className="h-8 w-8 p-0">
            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-6 h-10">User Identity</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10">Role</TableHead>
                {MODULES.map(m => (
                  <TableHead key={m} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10">{m}</TableHead>
                ))}
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pr-6 h-10">Branch Allotment</TableHead>
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
                  <TableCell>
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
                        className="border-slate-300 data-[state=checked]:bg-[#001529] data-[state=checked]:border-[#001529]"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="pr-6">
                    <Select 
                      value={profile.assigned_branch_id || ""} 
                      onValueChange={(val) => assignBranch(profile.id, val)}
                      disabled={updatingId === `${profile.id}-branch`}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-[10px] font-bold uppercase tracking-tight border-slate-200 focus:ring-0">
                        <SelectValue placeholder="No Branch">
                          {branches.find(b => b.id === profile.assigned_branch_id)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id} className="text-xs font-bold uppercase">{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({ icon: Icon, label, value, sub }: { icon: LucideIcon, label: string, value: string, sub: string }) {
  return (
    <Card className="border-slate-100 shadow-none">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-slate-50 text-slate-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
          <h3 className="text-2xl font-black text-[#001529] tracking-tight">{value}</h3>
          <p className="text-[9px] text-slate-400 font-medium">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}
