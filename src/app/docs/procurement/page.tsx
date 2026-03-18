import { Truck, ShieldCheck, Calculator, Hash, AlertTriangle, Download, ShieldAlert, History } from "lucide-react"

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

      {/* ── 3-Way Match Audit ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <ShieldCheck className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">3-Way Match Audit Protocols</h2>
        </div>
        <div className="bg-slate-50 border rounded-xl p-6 shadow-sm border-l-4 border-l-green-500">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Financial integrity is enforced through a strict 3-way reconciliation between <strong>Purchase Orders</strong>, <strong>Goods Receipt Notes</strong>, and <strong>Vendor Invoices</strong>:
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• Global Tax Alignment:</span>
              <span>All Ordered and Received values automatically include the standard 18% GST (or HSN-mapped rate) to match the Grand Total of Tax Invoices.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• Variance Protection:</span>
              <span>Variance is calculated as <code>Math.abs(PO_Total - Bill_Amount)</code>. Only variances &lt; ₹1.00 are classified as <strong>MATCHED</strong>.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Indian Numbering System ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Hash className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Indian Numbering System (en-IN)</h2>
        </div>
        <p className="text-slate-600">
          Enterprise-grade financial reporting in Ops360 uses the <strong>Lakhs/Crores</strong> format (e.g., ₹45,05,600.00).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border p-4 rounded-xl">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Currency Formatting</h4>
            <code className="text-xs text-[#001529] font-bold">formatCurrency(4505600) → ₹45,05,600.00</code>
          </div>
          <div className="bg-white border p-4 rounded-xl">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Amount in Words</h4>
            <code className="text-xs text-[#001529] font-bold">&quot;Forty-Five Lakh Five Thousand...&quot;</code>
            <p className="text-[9px] text-slate-500 mt-1 italic">Includes <strong>Paisa Support</strong> and pluralization logic (Lakhs/Crores).</p>
          </div>
        </div>
      </section>

      {/* ── Return & Reversal Logic ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Return & Reversal Logic (Debit Notes)</h2>
        </div>
        <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#001529] text-white px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase">Serial Lock</div>
            <p className="text-xs text-slate-600 font-medium italic">Prevents duplicate returns of the same asset across different Debit Notes.</p>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• ID Format:</span>
              <span>Standardized to <code>EHA-DN-YYYY-XXXX</code>.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• 100% Recovery:</span>
              <span>Lands costs are tracked to verify that reversal amounts match original purchase values exactly.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• Authorization Lifecycle:</span>
              <span>Pending returns must be explicitly marked as <strong>AUTHORIZED</strong> to execute the financial reversal.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Reliable PO PDF Generation ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Download className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Reliable PO PDF Generation</h2>
        </div>
        <div className="bg-slate-50 border rounded-xl p-6 shadow-sm">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The PO Download system uses <code>html2canvas</code> and <code>jsPDF</code>. The engine is enterprise-hardened for high-volume transactions:
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• Multi-page Stability:</span>
              <span>Proprietary CSS ensures that POs with 50+ line items break correctly across pages without data clipping.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• Security Classification:</span>
              <span>Every physical page includes a <strong>fixed</strong> footer (&quot;CONFIDENTIAL&quot;) and dynamic <strong>CSS Page Counters</strong> for auditability.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• Engine Sanitization:</span>
              <span>Modern CSS functions (<code>lab</code>, <code>oklch</code>) are automatically converted to standard sRGB to ensure cross-browser PDF fidelity.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Intelligent PO Sequencing ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Hash className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Intelligent PO Sequencing</h2>
        </div>
        <p className="text-slate-600">
          Purchase orders are uniquely identified using code: <code>PO-YYYY-XXXX</code>. The system uses a global numeric-max calculation to ensure that PO numbers never collide, even during high-traffic operations.
        </p>
      </section>

      {/* ── Audit & Discrepancy Framework ── */}
      <section className="space-y-6 pt-6 border-t">
        <div className="flex items-center gap-3 text-red-500">
          <ShieldAlert className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Audit & Discrepancy Framework</h2>
        </div>

        <p className="text-slate-600 leading-relaxed">
          Ops360 includes an automated <strong>Discrepancy Report Registry</strong> that captures every fiscal and physical variance detected during the procurement lifecycle.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 border rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#001529] font-black uppercase tracking-widest text-[10px]">
              <History className="h-4 w-4" /> Auto-Logging Triggers
            </div>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1" />
                <span><strong>Quantity Mismatch:</strong> Triggered if GRN items &lt; PO ordered quantity.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1" />
                <span><strong>Price Mismatch:</strong> Triggered if Vendor Bill &ne; PO Total (Tolerance &lt; ₹1).</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-50 border rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#001529] font-black uppercase tracking-widest text-[10px]">
              <ShieldCheck className="h-4 w-4" /> Resolution Paths
            </div>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1" />
                <span><strong>Link to Return:</strong> Automates the Debit Note / PR workflow for shortfalls.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1" />
                <span><strong>Accept Variance:</strong> Manual ledger override with mandatory audit justification.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
