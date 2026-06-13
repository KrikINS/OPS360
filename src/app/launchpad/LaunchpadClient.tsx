"use client"

import { ModuleLaunchpad } from "@/components/dashboard/ModuleLaunchpad"
import { LogOut } from "lucide-react"
import Image from "next/image"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useBranding } from "@/providers/GlobalBrandingProvider"
import { RoleMetricsWidget } from "@/components/dashboard/RoleMetricsWidget"

const BrandIdentity = () => {
  const { companyName, logoUrl } = useBranding()
  return (
    <div className="flex flex-col items-center scale-[0.45]">
      <div className="relative">
        <Image 
          src={logoUrl || "/ethan-logo-final.png"} 
          alt={`${companyName} Logo`} 
          width={400} 
          height={400} 
          priority 
          className="drop-shadow-[0_0_20px_rgba(127,209,227,0.15)] bg-transparent object-contain w-auto h-auto"
        />
      </div>
      <div className="text-center space-y-2 mt-2">
        <div className="relative inline-block group">
          <h1 className="font-bold uppercase font-[family-name:var(--font-outfit)] text-xl text-white/40 tracking-[0.2em]">
            {companyName}
          </h1>
        </div>
      </div>
    </div>
  )
}

export default function LaunchpadClient({ initialPermissions, initialRole, kpis }: { initialPermissions: Record<string, boolean>, initialRole: string, kpis?: Record<string, unknown> | null }) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="min-h-screen bg-[#001529] relative overflow-hidden flex flex-col">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7FD1E3]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00AEEF]/5 rounded-full blur-[100px]" />
      
      {/* Top Header Controls */}
      <div className="absolute top-8 right-8 z-50">
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="group flex items-center gap-3 px-5 py-6 bg-white/5 hover:bg-white/10 text-white/40 hover:text-[#7FD1E3] border border-white/5 hover:border-[#7FD1E3]/30 rounded-2xl backdrop-blur-xl transition-all duration-500 shadow-2xl"
        >
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 opacity-50 group-hover:opacity-100 transition-opacity">Terminate</span>
            <span className="text-[13px] font-bold tracking-tight">Session</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#7FD1E3]/10 group-hover:rotate-12 transition-all duration-500">
            <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Button>
      </div>

      {/* Logo Section */}
      <div className="flex-none pt-0 pb-0 w-full flex justify-center z-10 -mt-6">
        <BrandIdentity />
      </div>

      {/* KPI Strip */}
      <div className="flex-none w-full flex justify-center z-10 pb-2">
        <div className="w-full max-w-5xl">
          <KPIStrip role={initialRole} kpis={kpis} />
        </div>
      </div>

      <div className="w-full z-10 mt-0 relative -top-6">
        <RoleMetricsWidget />
      </div>

      {/* Card Grid Section */}
      <div className="flex-grow flex items-start justify-center px-6 pb-4 z-10 mt-2 relative -top-6">
        <div className="w-full max-w-7xl relative">
          <ModuleLaunchpad permissions={initialPermissions} role={initialRole} isVisible={true} />
        </div>
      </div>

      {/* Developer Watermark — top left */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none select-none flex flex-col gap-1">
        <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.3em]">Powered By</p>
        <Image src="/AppTerra .PNG" alt="AppTerra" width={120} height={40} priority className="object-contain opacity-60 w-auto h-auto" style={{ mixBlendMode: "screen" }} />
      </div>
    </div>
  )
}

function KPIStrip({ role, kpis }: { role: string; kpis: Record<string, unknown> | null | undefined }) {
  if (!kpis) return null
  const normalizedRole = role.toLowerCase().trim()
  const isAdmin = ['admin/owner', 'admin', 'owner', 'super_admin'].includes(normalizedRole)
  const isManager = normalizedRole === 'manager'

  const fmt = (n: unknown) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  const fmtCurrency = (n: unknown) => `₹${fmt(n)}`

  if (isAdmin) {
    const k = kpis as {
      todayRevenue: number; todayInvoices: number; mtdRevenue: number;
      revenueChange: number | null; outstandingAP: number;
      lowStockCount: number; activeServiceJobs: number;
    }
    return (
      <div className="w-full max-w-5xl mx-auto px-6 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Today's Revenue" value={fmtCurrency(k.todayRevenue)} sub={`${k.todayInvoices} invoices`} accent="emerald" />
        <KPICard label="MTD Revenue" value={fmtCurrency(k.mtdRevenue)} sub={k.revenueChange !== null ? `${k.revenueChange > 0 ? '+' : ''}${k.revenueChange}% vs last month` : 'vs last month'} accent={k.revenueChange !== null && k.revenueChange >= 0 ? 'emerald' : 'red'} />
        <KPICard label="Outstanding AP" value={fmtCurrency(k.outstandingAP)} sub="unpaid vendor bills" accent="amber" />
        <KPICard label="Alerts" value={`${k.lowStockCount} low stock`} sub={`${k.activeServiceJobs} open jobs`} accent={k.lowStockCount > 0 ? 'red' : 'slate'} />
      </div>
    )
  }

  if (isManager) {
    const k = kpis as {
      todayRevenue: number; todayInvoices: number; weekInvoices: number;
      weekRevenue: number; pendingServiceJobs: number; lowStockCount: number;
      topProducts: { name: string; units: number }[];
    }
    return (
      <div className="w-full max-w-5xl mx-auto px-6 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Today's Sales" value={fmtCurrency(k.todayRevenue)} sub={`${k.todayInvoices} invoices today`} accent="emerald" />
        <KPICard label="This Week" value={fmtCurrency(k.weekRevenue)} sub={`${k.weekInvoices} invoices`} accent="blue" />
        <KPICard label="Service Jobs" value={String(k.pendingServiceJobs)} sub="pending in branch" accent={k.pendingServiceJobs > 0 ? 'amber' : 'slate'} />
        <KPICard label="Low Stock" value={String(k.lowStockCount)} sub="items below minimum" accent={k.lowStockCount > 0 ? 'red' : 'slate'} />
      </div>
    )
  }

  // Staff
  const k = kpis as {
    todayInvoices: number; todayRevenue: number;
    attendanceStatus: string | null; clockedInAt: string | null;
  }
  return (
    <div className="w-full max-w-5xl mx-auto px-6 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
      <KPICard label="My Sales Today" value={String(k.todayInvoices)} sub={`${fmtCurrency(k.todayRevenue)} processed`} accent="emerald" />
      <KPICard label="Attendance" value={k.attendanceStatus ?? 'Not recorded'} sub={k.clockedInAt ? `In at ${new Date(k.clockedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Not clocked in'} accent={k.attendanceStatus === 'present' ? 'emerald' : 'amber'} />
      <KPICard label="Quick Action" value="POS Terminal" sub="tap to open checkout" accent="cyan" onClick={() => window.location.href = '/pos'} />
    </div>
  )
}

function KPICard({ label, value, sub, accent, onClick }: {
  label: string; value: string; sub: string;
  accent: 'emerald' | 'blue' | 'amber' | 'red' | 'slate' | 'cyan';
  onClick?: () => void
}) {
  const accentMap = {
    emerald: 'border-emerald-500/30 text-emerald-400',
    blue:    'border-blue-500/30 text-blue-400',
    amber:   'border-amber-500/30 text-amber-400',
    red:     'border-red-500/30 text-red-400',
    slate:   'border-white/10 text-white/40',
    cyan:    'border-[#7FD1E3]/30 text-[#7FD1E3]',
  }
  return (
    <div
      onClick={onClick}
      className={`bg-white/5 backdrop-blur-xl border rounded-xl p-4 ${accentMap[accent]} ${onClick ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{label}</p>
      <p className={`text-lg font-black tabular-nums ${accentMap[accent].split(' ')[1]}`}>{value}</p>
      <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>
    </div>
  )
}
