"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserPlus, ShieldAlert, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UserManagementPage() {
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
        <StatsCard icon={Users} label="Total Accounts" value="12" sub="Active across network" />
        <StatsCard icon={ShieldAlert} label="Access Requests" value="3" sub="Awaiting approval" />
        <StatsCard icon={ArrowRight} label="Recent Logins" value="48" sub="Last 24 hours" />
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Account Registry</CardTitle>
          <CardDescription className="text-[10px] font-bold text-slate-400 uppercase">Manage enterprise access layers.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center border-t border-slate-50">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">Matrix is being hydrated from Supabase Auth...</p>
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({ icon: Icon, label, value, sub }: { icon: any, label: string, value: string, sub: string }) {
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
