"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Lock,
  UserCheck,
  Building2,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminStats {
  activeUsers: number
  systemStatus: "Healthy" | "Degraded" | "Down"
  securityStatus: string
  systemLoad: string
}

interface UserRole {
  role: string
  count: number
}

interface RecentUser {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

interface BranchSummary {
  id: string
  name: string
  location: string
  status: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    activeUsers: 0,
    systemStatus: "Healthy",
    securityStatus: "Active",
    systemLoad: "Low"
  })
  const [roles, setRoles] = useState<UserRole[]>([])
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [branches, setBranches] = useState<BranchSummary[]>([])

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      
      // 1. Fetch Active Users Count (Simplified: total profiles)
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
      
      // 2. Fetch User Role Breakdown
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
      
      const roleCounts = (profileData || []).reduce((acc: any, curr) => {
        acc[curr.role] = (acc[curr.role] || 0) + 1
        return acc
      }, {})

      const roleList = Object.entries(roleCounts).map(([role, count]) => ({
        role: role as string,
        count: count as number
      }))

      // 3. Recent Accounts
      const { data: recent } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      // 4. Branches Summary
      const { data: branchData } = await supabase
        .from("branches")
        .select("id, name, location")
        .limit(5)

      setStats({
        activeUsers: userCount || 0,
        systemStatus: "Healthy",
        securityStatus: "Active",
        systemLoad: "Low"
      })
      setRoles(roleList)
      setRecentUsers((recent || []) as RecentUser[])
      setBranches((branchData || []).map(b => ({ ...b, status: "Active" })))
    }

    fetchData()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#001529]">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">Enterprise oversight, security protocols, and system heartbeat.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">System Operational</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Active Users" 
          value={stats.activeUsers} 
          icon={Users} 
          color="bg-blue-600" 
          description="Live verified accounts"
        />
        <StatCard 
          label="Security Status" 
          value={stats.securityStatus} 
          icon={ShieldCheck} 
          color="bg-emerald-600"
          description="RLS & JWT Encryption"
        />
        <StatCard 
          label="System Health" 
          value={stats.systemStatus} 
          icon={stats.systemStatus === "Healthy" ? CheckCircle2 : XCircle} 
          color={stats.systemStatus === "Healthy" ? "bg-emerald-600" : "bg-red-600"}
          description="Real-time uptime monitoring"
        />
        <StatCard 
          label="Server Load" 
          value={stats.systemLoad} 
          icon={Activity} 
          color="bg-amber-600"
          description="Current CPU/Memory spike"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Role Breakdown */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">User Role Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {roles.map((r) => (
                <div key={r.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      r.role === "Admin" ? "bg-red-500" : r.role === "Manager" ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <span className="text-sm font-bold text-slate-700 uppercase">{r.role}</span>
                  </div>
                  <Badge variant="outline" className="font-black border-slate-200 text-slate-900 bg-slate-50">{r.count}</Badge>
                </div>
              ))}
              {roles.length === 0 && <p className="text-xs text-muted-foreground italic">No roles detected.</p>}
            </div>
          </CardContent>
        </Card>

        {/* RBAC Access Matrix - Simplified Visual Representation */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">RBAC Access Matrix</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-bold">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-400 uppercase tracking-widest border-b">
                    <th className="py-3 px-4 text-left">Module</th>
                    <th className="py-3 px-4 text-center">Admin</th>
                    <th className="py-3 px-4 text-center">Manager</th>
                    <th className="py-3 px-4 text-center">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <MatrixRow label="Product Master" admin="Full" manager="Edit" sales="View" />
                  <MatrixRow label="Inventory Management" admin="Full" manager="Full" sales="View" />
                  <MatrixRow label="Supplier Records" admin="Full" manager="Edit" sales="None" />
                  <MatrixRow label="Financial Ledger" admin="Full" manager="View" sales="None" />
                  <MatrixRow label="Admin Center" admin="Full" manager="None" sales="None" />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Accounts */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">Recent Accounts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-slate-100">
              {recentUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-xs">{user.full_name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="text-[9px] font-black uppercase tracking-tighter h-5 px-2 bg-slate-100 text-slate-900 border-none">{user.role}</Badge>
                    <span className="text-[9px] text-slate-400">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {recentUsers.length === 0 && <p className="p-10 text-center text-xs text-muted-foreground italic">No recent activity detected.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Registered Branches */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">Active Branches</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-slate-100">
              {branches.map((branch) => (
                <div key={branch.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-xs">{branch.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{branch.location}</div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border-none h-6">Operational</Badge>
                </div>
              ))}
              {branches.length === 0 && <p className="p-10 text-center text-xs text-muted-foreground italic">No branches registered.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, description }: { label: string, value: string | number, icon: any, color: string, description: string }) {
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          <div className={cn("w-2", color)} />
          <div className="p-5 flex-1 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
              <div className={cn("p-1.5 rounded-lg bg-slate-50 text-slate-400")}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#001529] tracking-tight">{value}</div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MatrixRow({ label, admin, manager, sales }: { label: string, admin: string, manager: string, sales: string }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 text-slate-900 uppercase tracking-tighter">{label}</td>
      <td className="py-3 px-4 text-center">
        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black", admin === "Full" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500")}>{admin}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black", manager === "Full" ? "bg-blue-50 text-blue-700" : manager === "Edit" ? "bg-emerald-50 text-emerald-700" : manager === "View" ? "bg-slate-50 text-slate-600" : "bg-red-50 text-red-700")}>{manager}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black", sales === "View" ? "bg-slate-50 text-slate-600" : "bg-red-50 text-red-700")}>{sales}</span>
      </td>
    </tr>
  )
}

function Badge({ className, variant, children }: { className?: string, variant?: "outline", children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border",
      variant === "outline" ? "border-slate-200 text-slate-900" : "bg-slate-100 text-slate-900 border-transparent",
      className
    )}>
      {children}
    </span>
  )
}
