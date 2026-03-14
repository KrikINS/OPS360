import { Truck, ShieldCheck, Calculator, Hash, AlertTriangle } from "lucide-react"

export default function ProcurementDocs() {
  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">Procurement & Supply Chain</h1>
        <p className="text-slate-500 mt-3 text-lg">
          A guide to managing inventory acquisition, GST compliance, and supplier relationships in Ops360.
        </p>
      </div>

      {/* ── PO Lifecycle ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Truck className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">1. Purchase Order Lifecycle</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "Creation", desc: "Draft POs with HSN-locked GST rates and model-specific pricing." },
            { step: "Approval", desc: "Authorized managers review and approve POs for fulfillment." },
            { step: "Reception", desc: "Partial or full receipt (GRN) triggers automated inventory syncing." }
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 border rounded-xl p-4 relative">
              <span className="absolute top-2 right-3 text-slate-200 font-bold text-2xl">0{i+1}</span>
              <h4 className="font-bold text-[#001529]">{item.step}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GST Compliance ── */}
      <section className="bg-slate-50 border rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Calculator className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">GST & Landed Cost Logic</h2>
        </div>
        
        <p className="text-slate-600 leading-relaxed">
          Ops360 adheres to <strong>Indian GST Composite Supply</strong> rules. When items are purchased with additional charges (like freight), the tax is calculated on the combined value.
        </p>

        <div className="bg-white border rounded-xl p-6 shadow-sm border-l-4 border-l-[#7FD1E3]">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">The Formula</h4>
          <div className="font-mono text-sm bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
            Total Taxable Value = Base Price + Freight Charges <br/>
            GST Amount = Total Taxable Value × GST Rate % <br/>
            Unit Landed Cost = (Total Taxable Value + GST Amount) / Quantity
          </div>
        </div>
      </section>

      {/* ── HSN Slab Protection ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <ShieldCheck className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">HSN Slab Protection</h2>
        </div>

        <p className="text-slate-600">
          To prevent human error and ensure tax compliance, GST rates are strictly mapped to HSN codes:
        </p>

        <div className="overflow-hidden border rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-900">Category</th>
                <th className="px-4 py-3 font-semibold text-slate-900">HSN Code</th>
                <th className="px-4 py-3 font-semibold text-slate-900">GST Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3">Air Conditioners & Fridges</td>
                <td className="px-4 py-3">8415, 8418</td>
                <td className="px-4 py-3 font-bold text-red-600">28%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Washing Machines</td>
                <td className="px-4 py-3">8450</td>
                <td className="px-4 py-3 font-bold text-orange-600">18%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Fans & Small Appliances</td>
                <td className="px-4 py-3">8414</td>
                <td className="px-4 py-3 font-bold text-blue-600">12%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Manager Override:</strong> If a non-standard rate is required for a specific batch, managers can use the <strong>Manual Override</strong> flag. This bypasses the HSN lock but flags the entry for audit.
          </div>
        </div>
      </section>

      {/* ── Reliable Sequencing ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Hash className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Intelligent PO Sequencing</h2>
        </div>
        <p className="text-slate-600">
          Purchase orders are uniquely identified using code: <code>PO-YYYY-XXXX</code>. The system uses a global numeric-max calculation to ensure that PO numbers never collide, even during high-traffic operations.
        </p>
      </section>
    </div>
  )
}
