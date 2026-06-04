import { Truck, ShieldCheck, Calculator, Hash, AlertTriangle, Download, ShieldAlert, History, LayoutGrid, PlusCircle, CreditCard, CheckCircle2 } from "lucide-react"

export default function ProcurementDocs() {
  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">Procurement & Supply Chain</h1>
        <p className="text-slate-500 mt-3 text-lg">
          A guide to managing inventory acquisition, GST compliance, GRN processing, and vendor payments.
        </p>
      </div>

      {/* ── PO Lifecycle ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Truck className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">1. Purchase Order Lifecycle</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { step: "Creation", desc: "Draft POs with editable model-specific unit pricing." },
            { step: "Pending Approval", desc: "Automatically sent to Admin/Manager for review." },
            { step: "Approved", desc: "PO is authorized and ready for GRN processing." },
            { step: "Partially Received", desc: "Some items received, but the order is still open for subsequent GRNs." },
            { step: "Received", desc: "All items received. PO is fulfilled." },
            { step: "Revision / Rejection", desc: "Managers can reject with a reason or request a revision, sending it back to the creator." },
            { step: "Short-close", desc: "Close a PO early if it won't be fully fulfilled by the vendor." }
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 border rounded-xl p-4 relative">
              <span className="absolute top-2 right-3 text-slate-200 font-bold text-2xl">0{i+1}</span>
              <h4 className="font-bold text-[#001529] pr-6">{item.step}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GRN Processing ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <CheckCircle2 className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">2. GRN Processing (Goods Receipt Note)</h2>
        </div>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
            <li><strong>Receiving Branch:</strong> Select where goods are stored. Admins see all branches; staff see only their assigned branch.</li>
            <li><strong>Serial Numbers:</strong> Entered per item in the SN/IMEI field. Each serial creates one unique inventory unit.</li>
            <li><strong>Freight:</strong> Freight costs can be entered per item to accurately track landed cost.</li>
            <li><strong>Inspection Notes:</strong> Use the template selector (Standard Inspection, Conditional Acceptance, Partial Receipt) or write custom notes.</li>
            <li><strong>Partial GRN:</strong> Receive some items now and process the rest later. <code>po_items.received_qty</code> accumulates across multiple GRNs.</li>
            <li><strong>Auto-transitions:</strong> PO status transitions automatically from <code>approved</code> → <code>partially_received</code> → <code>received</code> based on cumulative quantities.</li>
          </ul>
        </div>
      </section>

      {/* ── Add New Product in PO Form ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <PlusCircle className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">3. Add New Product in PO Form</h2>
        </div>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span>A <strong>"New Product"</strong> button is available next to the "Add Items" label in the PO form.</span>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span>Also appears as a clear CTA when product search results are empty.</span>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span>Opens the standard Add Product modal. Newly created products are immediately searchable and selectable.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Vendor Payments ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <CreditCard className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">4. Vendor Payments</h2>
        </div>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
            <li>Available via <strong>"Record Payment"</strong> in the PO Actions dropdown.</li>
            <li>Only available for POs in <code>received</code> or <code>partially_received</code> status.</li>
            <li><strong>Payment methods:</strong> Bank Transfer, UPI, Cheque, Cash.</li>
            <li>Includes reference number tracking for audit trails (UTR, Cheque No, etc.).</li>
            <li>Automatically posts a journal entry in the Finance module (DR Accounts Payable, CR Cash/Bank).</li>
          </ul>
        </div>
      </section>

      {/* ── Discrepancy Auto-Resolution ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-amber-500">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">5. Discrepancy Auto-Resolution</h2>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 shadow-sm">
          <ul className="space-y-3 text-sm text-amber-900 list-disc pl-5">
            <li>When a partial GRN is processed, a <code>SHORT_SHIPMENT</code> discrepancy is automatically created for the shortfall.</li>
            <li>When subsequent GRNs bring the total received up to the full ordered quantity, the discrepancy is <strong>automatically resolved</strong>.</li>
            <li>The system adds an admin comment: <em>"Auto-resolved: full quantity received across multiple GRNs"</em>.</li>
            <li>The Discrepancy Report clearly shows the PO number, product name, vendor name, and any remaining shortfall quantity.</li>
          </ul>
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
              <span>All Ordered and Received values automatically include the standard GST (or HSN-mapped rate) to match the Grand Total of Tax Invoices.</span>
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
          Enterprise-grade financial reporting in Ops360 uses the <strong>Lakhs/Crores</strong> format.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border p-4 rounded-xl">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Currency Formatting</h4>
            <code className="text-xs text-[#001529] font-bold">formatCurrency(4505600) → ₹45,05,600.00</code>
          </div>
          <div className="bg-white border p-4 rounded-xl">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Amount in Words</h4>
            <code className="text-xs text-[#001529] font-bold">&quot;Forty-Five Lakh Five Thousand...&quot;</code>
          </div>
        </div>
      </section>

      {/* ── Enterprise Print Protocols (PO & GRN) ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Download className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Enterprise Print Protocols</h2>
        </div>
        <div className="bg-slate-50 border rounded-xl p-6 shadow-sm">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The document architecture uses a proprietary React-rendering loop to ensure accurate PDF creation:
          </p>
          <ul className="space-y-4 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-[#001529] min-w-[200px]">• Deterministic Overflow:</span>
              <span>Precisely segments data to avoid page clipping, ensuring exactly 40 serials on the first page and 60 on subsequent pages.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529] min-w-[200px]">• Synchronous Pagination Fix:</span>
              <span>Footers calculate page numbers precisely within React before rendering to avoid CSS counter bugs.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Detailed Tax Breakdown Hub ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <ShieldAlert className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Detailed Tax Breakdown Hub</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 border rounded-2xl p-6 space-y-3">
             <h4 className="text-[10px] font-black uppercase text-[#001529] tracking-widest flex items-center gap-2">
               <Calculator className="h-3 w-3" /> Professional Print View
             </h4>
             <p className="text-xs text-slate-500 leading-normal">
               The formal PO PDF includes a dedicated Tax Summary table grouping items by their tax rate, explicitly displaying the CGST/SGST split.
             </p>
          </div>
          <div className="bg-slate-50 border rounded-2xl p-6 space-y-3">
             <h4 className="text-[10px] font-black uppercase text-[#001529] tracking-widest flex items-center gap-2">
               <ShieldCheck className="h-3 w-3" /> Dynamic Modal Insight
             </h4>
             <p className="text-xs text-slate-500 leading-normal">
               This tabular breakdown is also visible inside the "View Purchase Order" dashboard modal.
             </p>
          </div>
        </div>
      </section>
    </div>
  )
}
