import { 
  ChevronRight,
  Calculator,
  Gavel,
  ShieldAlert
} from "lucide-react"
import { Feedback } from "@/components/docs/feedback"

export default function ComplianceDocs() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="hover:text-slate-600 cursor-pointer">Docs</span>
        <ChevronRight className="h-3 w-3" />
        <span className="hover:text-slate-600 cursor-pointer">Procurement</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#001529]">Compliance</span>
      </nav>

      <section className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">
          Compliance & Regulatory Controls
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Standardized tax logic and audit requirements for the Indian home appliance market.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-2xl bg-slate-50 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-[#7FD1E3]/20 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-[#7FD1E3]" />
          </div>
          <h3 className="font-bold text-[#001529]">GST & taxation</h3>
          <p className="text-sm text-slate-600">The system automatically calculates IGST, CGST, and SGST based on the HSN code and branch location.</p>
        </div>

        <div className="p-6 border rounded-2xl bg-slate-50 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Gavel className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="font-bold text-[#001529]">HSN Mapping</h3>
          <p className="text-sm text-slate-600">The system automatically associates HSN codes (4-8 digits) and their respective tax rates to inventory items for proper categorization.</p>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3">Audit Trail & Discrepancy Logging</h2>
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#001529] font-black uppercase tracking-widest text-[10px]">
            <ShieldAlert className="h-4 w-4 text-red-500" /> Variance Enforcement
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            All procurement variances are automatically logged to the <strong>Discrepancy Registry</strong>. This ensures a permanent audit paper trail for fiscal and physical mismatches.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-red-100/50 shadow-sm md:col-span-2">
              <h4 className="font-bold text-xs text-[#001529] mb-1">Stock Variances</h4>
              <p className="text-[11px] text-slate-500">Shortfalls in GRN (received vs ordered) are tracked until resolved via subsequent GRNs or PO short-close.</p>
            </div>
          </div>
        </div>
      </section>

      <Feedback />
    </div>
  )
}
