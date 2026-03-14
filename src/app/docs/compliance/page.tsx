import { 
  ChevronRight,
  Calculator,
  Gavel
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
          <h3 className="font-bold text-[#001529]">HSN Mandatory Rule</h3>
          <p className="text-sm text-slate-600">Items cannot be received into inventory (GRN) without a valid 4-8 digit HSN code for tax categorization.</p>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3">HSN Slab Reference</h2>
        <div className="overflow-hidden border rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#001529] text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">HSN Category</th>
                <th className="px-4 py-3 font-semibold">GST Slab</th>
                <th className="px-4 py-3 font-semibold">Typical Products</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              <tr>
                <td className="px-4 py-3 font-mono">8415 / 8418</td>
                <td className="px-4 py-3">28%</td>
                <td className="px-4 py-3 text-slate-500">Air Conditioners, Large Refrigerators</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono">8450</td>
                <td className="px-4 py-3">18%</td>
                <td className="px-4 py-3 text-slate-500">Washing Machines</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono">8509 / 8414</td>
                <td className="px-4 py-3">12%</td>
                <td className="px-4 py-3 text-slate-500">Small Appliances, Fans</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <Feedback />
    </div>
  )
}
