import { FileDown, TrendingUp, Target } from "lucide-react"

export default function AnalyticsDocs() {
  return (
    <div className="space-y-8 pb-12">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Analytics & Reports</h1>
        <p className="text-slate-500 mt-2">Business intelligence, real-time KPI monitoring, and operational insights.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Core Sales Metrics */}
        <div className="bg-white border rounded-xl p-6 shadow-sm border-l-4 border-l-blue-500">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Executive Sales Performance
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Track revenue growth and sales velocity across all dimensions:
          </p>
          <ul className="space-y-2 text-xs text-slate-500">
            <li className="flex gap-2"><strong>Timeframe:</strong> Filter by date ranges (This Month, Last Month, This FY).</li>
            <li className="flex gap-2"><strong>Staff:</strong> View sales performance and generated revenue per staff member.</li>
            <li className="flex gap-2"><strong>Catalog:</strong> Identify top-selling models vs slow-moving stock.</li>
          </ul>
        </div>

        {/* Operational Efficiency */}
        <div className="bg-white border rounded-xl p-6 shadow-sm border-l-4 border-l-indigo-500">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-indigo-600" />
            Inventory Aging & Turnover
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Monitor asset liquidity with automated aging analysis (Located in the <strong>Inventory Registry</strong>):
          </p>
          <div className="flex gap-2 mb-4">
            <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">Healthy</div>
            <div className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-bold">Warning</div>
            <div className="bg-rose-50 text-rose-700 px-2 py-1 rounded text-[10px] font-bold">Critical: 60d+</div>
          </div>
        </div>
      </div>

      {/* Data Export Control */}
      <section className="bg-[#001529] rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-white/10">
            <FileDown className="h-6 w-6 text-[#7FD1E3]" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Data Sovereignty & Exports</h3>
            <p className="text-sm text-slate-300">Download raw datasets for external modeling.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#7FD1E3] mb-1">Print & PDF</h4>
            <p className="text-[11px] text-slate-400">High-speed print layouts for Sales Reports, GST Summaries, and Stock Valuations.</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#7FD1E3] mb-1">CSV/Excel</h4>
            <p className="text-[11px] text-slate-400">Export inventory manifests directly from the tables.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
