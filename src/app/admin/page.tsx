import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, ShieldCheck, Building2, Activity, CheckCircle2, XCircle } from "lucide-react"

const MODULES = ["inventory", "procurement", "pos", "transfer", "accounting", "staff", "service", "analytics"] as const

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin:      { inventory: true,  procurement: true,  pos: true,  transfer: true,  accounting: true,  staff: true,  service: true,  analytics: true  },
  manager:    { inventory: true,  procurement: true,  pos: true,  transfer: true,  accounting: true,  staff: true,  service: false, analytics: true  },
  sales:      { inventory: false, procurement: false, pos: true,  transfer: false, accounting: false, staff: false, service: false, analytics: false },
  technician: { inventory: false, procurement: false, pos: false, transfer: false, accounting: false, staff: false, service: true,  analytics: false },
}

const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/20",
  manager:    "bg-[#7FD1E3]/10 text-[#001529] border border-[#7FD1E3]/30",
  sales:      "bg-green-50 text-[#5A9E78] border border-green-100",
  technician: "bg-amber-50 text-[#D4860A] border border-amber-100",
}

const MODULE_LABELS: Record<string, string> = {
  inventory: "Inventory", procurement: "Procurement", pos: "POS",
  transfer: "Transfers", accounting: "Accounting", staff: "Staff",
  service: "Service", analytics: "Analytics",
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")

  const { data: branches } = await supabase.from("branches").select("id, name")

  const totalUsers    = profiles?.length ?? 0
  const activeUsers   = profiles?.filter(p => p.is_active).length ?? 0
  const inactiveUsers = totalUsers - activeUsers
  const roleCounts    = profiles?.reduce((acc, p) => { acc[p.role] = (acc[p.role] || 0) + 1; return acc }, {} as Record<string,number>) ?? {}
  const totalBranches = branches?.length ?? 0

  const kpis = [
    { label: "Total Users",  value: totalUsers,    icon: Users,       color: "#7FD1E3", bg: "#e8f9fc" },
    { label: "Active",       value: activeUsers,   icon: CheckCircle2,color: "#5A9E78", bg: "#f0fdf4" },
    { label: "Inactive",     value: inactiveUsers, icon: XCircle,     color: "#C0392B", bg: "#fef2f2" },
    { label: "Branches",     value: totalBranches, icon: Building2,   color: "#D4860A", bg: "#fffbeb" },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">System overview and organisational health for Ops360 ERP.</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="card-elevated card-hover border-t-4" style={{ borderTopColor: color }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: bg }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role breakdown + RBAC matrix */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="card-elevated">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#7FD1E3]" /> Role Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {(["admin","manager","sales","technician"] as const).map(role => (
              <div key={role} className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[role]}`}>
                  {role}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden w-24">
                    <div
                      className="h-full rounded-full bg-[#7FD1E3] transition-all"
                      style={{ width: totalUsers ? `${((roleCounts[role] || 0) / totalUsers) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-4 text-right">{roleCounts[role] || 0}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-elevated lg:col-span-2">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#7FD1E3]" /> RBAC Access Matrix
            </CardTitle>
            <CardDescription className="text-xs">Default module permissions by role</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#001529]">
                    <th className="text-left text-white font-semibold py-2.5 px-4 text-[11px] uppercase tracking-wider">Module</th>
                    {(["admin","manager","sales","technician"] as const).map(r => (
                      <th key={r} className="text-center text-white font-semibold py-2.5 px-3 text-[11px] uppercase tracking-wider capitalize">{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, i) => (
                    <tr key={mod} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="py-2.5 px-4 font-medium text-foreground">{MODULE_LABELS[mod]}</td>
                      {(["admin","manager","sales","technician"] as const).map(role => (
                        <td key={role} className="py-2.5 px-3 text-center">
                          {ROLE_PERMISSIONS[role][mod]
                            ? <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-50 mx-auto"><CheckCircle2 className="h-3.5 w-3.5 text-[#5A9E78]" /></span>
                            : <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-50 mx-auto"><XCircle className="h-3.5 w-3.5 text-[#C0392B]/60" /></span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <Card className="card-elevated">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-[#7FD1E3]" /> Recent Accounts
          </CardTitle>
          <CardDescription className="text-xs">Recently provisioned staff accounts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Name","Email","Role","Status"].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).slice(0, 8).map((p, i) => (
                <tr key={p.id} className={`border-b border-border/40 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="py-2.5 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-[#001529] flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                        {(p.full_name ?? p.email ?? "?").split(" ").map((n: string) => n[0]).join("").substring(0,2).toUpperCase()}
                      </div>
                      {p.full_name ?? "—"}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{p.email}</td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${ROLE_COLORS[p.role] ?? ""}`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {p.is_active
                      ? <span className="inline-flex items-center gap-1 text-[11px] text-[#5A9E78] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#5A9E78]" />Active</span>
                      : <span className="inline-flex items-center gap-1 text-[11px] text-[#C0392B] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#C0392B]" />Inactive</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
