import { Calculator, BarChart3, ShieldCheck, History } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"

export default function LandedCostDocs() {
  return (
    <div className="max-w-4xl space-y-10 pb-12">
      {/* ── Header ── */}
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold text-[#001529] tracking-tight">Tracking Landed Costs & Vendor Performance</h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
          Complete transparency from PO issuance to final inventory placement. Learn how Ops360 calculates real costs and monitors vendor reliability.
        </p>
      </div>

      {/* ── Pedigree Tracking ── */}
      <section className="space-y-6 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-2">
           <div className="bg-[#7FD1E3]/20 p-2 rounded-lg">
             <History className="h-6 w-6 text-[#001529]" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800">The Pedigree Link</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-slate-600 leading-relaxed">
              Every item in the Ops360 inventory is &quot;stamped&quot; with a <strong>source_po_id</strong>. This 
              immutable link allows you to trace any individual serial number back to its origin:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Verify which vendor supplied a specific faulty unit.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Audit the exact tax rate and price paid for that specific pedigree.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Track movement of stock ordered for a specific branch.</span>
              </li>
            </ul>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-xs shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
               <History className="h-12 w-12" />
             </div>
             <div className="text-[#7FD1E3] mb-2 uppercase tracking-widest font-bold">Inventory Record Structure</div>
             <div className="space-y-1">
               <p><span className="text-pink-400">id:</span> &quot;INV-99021&quot;</p>
               <p><span className="text-pink-400">serial_number:</span> &quot;SN8821902&quot;</p>
               <p className="bg-white/10 p-1 rounded"><span className="text-amber-400">source_po_id:</span> &quot;PO-2024-0042&quot;</p>
               <p><span className="text-pink-400">landed_cost:</span> 42500.00</p>
               <p><span className="text-pink-400">status:</span> &quot;Available&quot;</p>
             </div>
          </div>
        </div>
      </section>

      {/* ── Landed Cost Logic ── */}
      <section className="space-y-6 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-2">
           <div className="bg-[#001529]/10 p-2 rounded-lg text-[#001529]">
             <Calculator className="h-6 w-6" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800">Landed Cost Calculation</h2>
        </div>
        <p className="text-slate-600 leading-relaxed max-w-3xl">
          Ops360 uses a <strong>Composite Supply</strong> logic for GST compliance. Freight and logistics charges 
          are bundled into the taxable value of the primary product to ensure the correct HSN slab is applied to the 
          entire transaction cost.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-inner">
           <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="text-center space-y-2">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Price + Freight</div>
                 <div className="text-2xl font-black text-[#001529]">Taxable Value</div>
              </div>
              <div className="text-center text-2xl font-bold text-slate-300">×</div>
              <div className="text-center space-y-2">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">HSN Slab %</div>
                 <div className="text-2xl font-black text-[#001529]">Landed Cost</div>
              </div>
           </div>
           <div className="mt-8 p-4 bg-white rounded-lg border border-slate-100 text-sm text-slate-500 italic">
             &quot;Total Landed Cost = (Base Value + Freight) + ((Base Value + Freight) * GST Rate)&quot;
           </div>
        </div>
      </section>

    </div>
  )
}
