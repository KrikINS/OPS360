"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  ShieldCheck, 
  Lock,
  Building2,
  TrendingUp,
  ShoppingBag,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FolderTree,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ModernOrbitSpinner } from "@/components/ui/ModernOrbitSpinner"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/utils/format"

interface RecentUser {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

interface DashboardMetrics {
  today_revenue: number
  today_invoices: number
  total_inventory_value: number
  branch_performance: { name: string, value: number }[]
  low_stock_alerts: { model_name: string, brand: string, branch_name: string, current_balance: number }[]
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])

  

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      const [metricsRes, recentRes] = await Promise.all([
        (Promise.resolve({ data: null }) as unknown as Promise<{ data: DashboardMetrics | null }>),
        import("@/app/actions/generics").then(m => m.fetchData("profiles"))
      ])

      if (metricsRes.data) setMetrics(metricsRes.data)
      if (recentRes.data) setRecentUsers(recentRes.data as unknown as RecentUser[])
      
      setLoading(false)
    }

    fetchData()
  }, [])

  const COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#001529] uppercase">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1 font-bold uppercase tracking-widest opacity-70">Showroom Analytics & Protocol Oversight</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">System Live: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Live Revenue & Stock Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Today's Revenue" 
          value={loading ? <ModernOrbitSpinner size="sm" className="opacity-40" /> : `₹${metrics?.today_revenue.toLocaleString()}`} 
          icon={TrendingUp} 
          color="bg-indigo-600" 
          description="Gross sales from all branches"
        />
        <StatCard 
          label="Today's Invoices" 
          value={loading ? <ModernOrbitSpinner size="sm" className="opacity-40" /> : metrics?.today_invoices || 0} 
          icon={ShoppingBag} 
          color="bg-blue-600"
          description="Finalized transactions"
        />
        <StatCard 
          label="Inventory Value" 
          value={loading ? <ModernOrbitSpinner size="sm" className="opacity-40" /> : `₹${metrics?.total_inventory_value.toLocaleString()}`} 
          icon={Building2} 
          color="bg-emerald-600"
          description="Total Stock @ Base Price"
        />
        <StatCard 
          label="Security Status" 
          value="Healthy" 
          icon={ShieldCheck} 
          color="bg-slate-800"
          description="RLS & JWT Protocols Active"
        />
      </div>

      {/* Module Hub Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModuleCard 
          title="Users & Access" 
          href="/admin/users" 
          icon={Users} 
          description="Staff roles & branch access" 
          color="blue" 
        />
        <ModuleCard 
          title="Customer Registry" 
          href="/sales/customers" 
          icon={Users} 
          description="Manage buyer profiles & data" 
          color="emerald" 
        />
        <ModuleCard 
          title="Organization" 
          href="/admin/organization" 
          icon={Building2} 
          description="Branch registry & locations" 
          color="emerald" 
        />
        <ModuleCard 
          title="Global Masters" 
          href="/admin/masters" 
          icon={FolderTree} 
          description="Brands, models & categories" 
          color="amber" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Branch Performance Chart */}
        <Card className="lg:col-span-2 shadow-xl border-none overflow-hidden">
          <CardHeader className="bg-[#001529] text-white p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                  Branch Performance
                </CardTitle>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Revenue distribution by showroom</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 h-[350px]">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                <ModernOrbitSpinner size="lg" />
                <p className="text-xs font-black uppercase tracking-widest">Hydrating Chart Data...</p>
              </div>
            ) : metrics?.branch_performance && metrics.branch_performance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.branch_performance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                    tickFormatter={(val) => `₹${(Number(val ?? 0) / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {metrics.branch_performance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                <BarChart3 className="h-12 w-12 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No Sales Data for Branch Analysis</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="lg:col-span-1 shadow-xl border-none flex flex-col">
          <CardHeader className="bg-red-600 text-white p-6 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-lg font-black uppercase tracking-wider">Critical Stock Alerts</CardTitle>
            </div>
            <p className="text-[10px] text-red-100 font-bold uppercase tracking-widest mt-1">Refilling required immediately (Qty &lt; 3)</p>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[350px]">
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                  <ModernOrbitSpinner size="md" className="opacity-30" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanning Registry...</span>
                </div>
              ) : metrics?.low_stock_alerts && metrics.low_stock_alerts.length > 0 ? (
                metrics.low_stock_alerts.map((alert, idx) => (
                  <div key={idx} className="p-4 hover:bg-red-50/50 transition-colors flex items-center justify-between border-l-4 border-l-red-500">
                    <div className="min-w-0 flex-1 mr-3">
                      <h4 className="font-black text-[#001529] text-[11px] truncate uppercase tracking-tighter" title={alert.model_name}>
                        {alert.model_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{alert.brand}</span>
                        <span className="text-[10px] text-red-600 font-black tracking-tight">{alert.branch_name}</span>
                      </div>
                    </div>
                    <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-black text-xs">
                      {alert.current_balance} U
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-300 space-y-2">
                  <CheckCircle2 className="h-10 w-10 mx-auto opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Inventory Levels Healthy</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Accounts */}
        <Card className="shadow-lg border-none overflow-hidden rounded-2xl">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Recent Accounts</CardTitle>
            </div>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-slate-50">
              {recentUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-slate-50/80 transition-all flex items-center justify-between group">
                  <div>
                    <div className="font-black text-slate-900 uppercase text-xs group-hover:text-blue-600 transition-colors">{user.full_name || user.email.split('@')[0]}</div>
                    <div className="text-[10px] text-slate-400 font-medium font-mono">{user.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="text-[9px] font-black uppercase tracking-widest h-5 px-3 bg-blue-50 text-blue-700 border-none">{user.role || 'Sales'}</Badge>
                    <span className="text-[9px] text-slate-400 font-bold font-mono">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {recentUsers.length === 0 && <p className="p-10 text-center text-xs text-muted-foreground italic">No recent activity detected.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Access Matrix Preview */}
        <Card className="shadow-lg border-none overflow-hidden rounded-2xl">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">RBAC Security Pulse</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-[10px] font-bold">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-4 px-6 text-left">Module Protocol</th>
                  <th className="py-4 px-6 text-center">Admin</th>
                  <th className="py-4 px-6 text-center">Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600">
                <MatrixRow label="Active Inventory" admin="Full" manager="Edit" />
                <MatrixRow label="Financial Audits" admin="Full" manager="None" />
                <MatrixRow label="System Branding" admin="Full" manager="None" />
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ModuleCard({ title, href, icon: Icon, description, color }: { title: string, href: string, icon: React.ElementType, description: string, color: 'indigo' | 'blue' | 'emerald' | 'amber' }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const colorMaps: Record<string, string> = {
    indigo: "hover:bg-indigo-50 border-indigo-100 text-indigo-600",
    blue: "hover:bg-blue-50 border-blue-100 text-blue-600",
    emerald: "hover:bg-emerald-50 border-emerald-100 text-emerald-600",
    amber: "hover:bg-amber-50 border-amber-100 text-amber-600",
  }

  return (
    <div 
      onClick={() => {
        setLoading(true)
        router.push(href)
      }}
      className="cursor-pointer"
    >
      <Card className={cn("transition-all duration-200 border hover:shadow-md h-full group", colorMaps[color])}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform flex items-center justify-center min-w-[44px] min-h-[44px]">
            {loading ? (
              <ModernOrbitSpinner size="sm" className="opacity-60" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-70 mt-0.5">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-current transition-colors" />
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, description }: { label: string, value: string | number | React.ReactNode, icon: React.ElementType, color: string, description: string }) {
  return (
    <Card className="border-none shadow-lg overflow-hidden group hover:-translate-y-1 transition-all duration-300">
      <CardContent className="p-0">
        <div className="flex h-24">
          <div className={cn("w-1.5", color)} />
          <div className="p-5 flex-1 bg-white relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-80">{label}</span>
              <div className={cn("p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-slate-100 transition-colors shadow-sm")}>
                <Icon className={cn("h-4 w-4", color.replace('bg-', 'text-'))} />
              </div>
            </div>
            <div className="text-2xl font-black text-[#001529] tracking-tighter">{value}</div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 opacity-60">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MatrixRow({ label, admin, manager }: { label: string, admin: string, manager: string }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="py-4 px-6 text-slate-900 uppercase tracking-tighter">{label}</td>
      <td className="py-4 px-6 text-center">
        <span className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-[9px] font-black uppercase shadow-sm">{admin}</span>
      </td>
      <td className="py-4 px-6 text-center">
        <span className={cn(
          "px-3 py-1 rounded text-[9px] font-black uppercase shadow-sm",
          manager === "Edit" ? "bg-emerald-50 text-emerald-700" : 
          manager === "View" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
        )}>{manager}</span>
      </td>
    </tr>
  )
}

function Badge({ className, variant, children }: { className?: string, variant?: "outline", children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border",
      variant === "outline" ? "border-slate-200 text-slate-900" : "bg-slate-100 text-slate-900 border-transparent",
      className
    )}>
      {children}
    </span>
  )
}
