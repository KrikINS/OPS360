import { ShieldAlert, PackageCheck, Truck, Scale, BadgeCheck, Loader2 } from "lucide-react"

export default function ProcurementDiscrepancyPage() {
  return (
    <div className="max-w-4xl space-y-10 pb-12">
      {/* ── Header ── */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 text-red-600 mb-2">
          <ShieldAlert className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Advanced Handling</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">Discrepancies & Partial Receipts</h1>
        <p className="text-slate-500 mt-3 text-lg">
          Managing incomplete shipments, over-receipts, and manual tax overrides with Logistics Flex.
        </p>
      </div>

      {/* ── Logistics Flex (Partial Receipts) ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Truck className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">Logistics Flex (Partial Receipts)</h2>
        </div>
        
        <p className="text-slate-600 leading-relaxed">
          Ops360 uses a state-of-the-art <strong>Incremental Sync</strong> engine. This allows your team to receive items as they arrive at the warehouse gate, even if the vendor fulfills a single Purchase Order across multiple shipments.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 border rounded-2xl p-6 space-y-3">
             <div className="bg-[#7FD1E3]/10 h-10 w-10 rounded-lg flex items-center justify-center text-[#7FD1E3]">
                <PackageCheck className="h-5 w-5" />
             </div>
             <h4 className="font-bold text-[#001529]">Automatic Calculation</h4>
             <p className="text-sm text-slate-500">The system tracks <code>Received</code> vs <code>Ordered</code> quantities per item. You only enter serial numbers for what is physically in front of you.</p>
          </div>
          <div className="bg-slate-50 border rounded-2xl p-6 space-y-3">
             <div className="bg-[#7FD1E3]/10 h-10 w-10 rounded-lg flex items-center justify-center text-[#7FD1E3]">
                <Loader2 className="h-5 w-5" />
             </div>
             <h4 className="font-bold text-[#001529]">Status Progression</h4>
             <p className="text-sm text-slate-500">As soon as the first unit is recorded, the PO status shifts to <strong>Partially Received</strong>, keeping the procurement cycle active for the remainder.</p>
          </div>
        </div>
      </section>

      {/* ── Conflict Resolution ── */}
      <section className="bg-[#001529] text-white rounded-3xl p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <BadgeCheck className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Conflict Resolution & Guards</h2>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 border-b border-white/10 pb-4">
            <div className="mt-1 font-bold text-[#7FD1E3]">01</div>
            <div>
              <h4 className="font-semibold text-white">Serial Number Uniqueness</h4>
              <p className="text-sm text-white/60">The system validates every serial number globally. Duplicate serials are blocked immediately during synchronization.</p>
            </div>
          </div>
          <div className="flex gap-4 border-b border-white/10 pb-4">
            <div className="mt-1 font-bold text-[#7FD1E3]">02</div>
            <div>
              <h4 className="font-semibold text-white">Over-Receipt Prevention</h4>
              <p className="text-sm text-white/60">You cannot receive more units than ordered. The GRN interface disables inputs once the target quantity is met.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="mt-1 font-bold text-[#7FD1E3]">03</div>
            <div>
              <h4 className="font-semibold text-white">Landed Cost Adjustments</h4>
              <p className="text-sm text-white/60">Freight is applied per shipment. The system intelligently amortizes these costs to maintain accurate per-unit valuation in the Inventory Register.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Manual Overrides ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-red-600">
          <Scale className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-slate-900">Manual Tax Overrides</h2>
        </div>

        <p className="text-slate-600">
          While HSN slab protection is active by default, certain fiscal scenarios require manual adjustment.
        </p>

        <div className="flex flex-col md:flex-row gap-6">
           <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl p-6">
              <h4 className="text-red-900 font-bold mb-2">When to use Override?</h4>
              <ul className="text-sm text-red-800 space-y-2 list-inside list-disc">
                <li>Non-standard GST rates due to specific schemes</li>
                <li>Items with fluctuating HSN tax classifications</li>
                <li>Imported goods with customized duty structures</li>
              </ul>
           </div>
           <div className="flex-1 bg-slate-50 border rounded-2xl p-6 border-dashed border-slate-300">
              <h4 className="text-slate-900 font-bold mb-2 text-sm uppercase tracking-widest">Audit Trail</h4>
              <p className="text-xs text-slate-500 leading-relaxed italic">
                &quot;Every manual override is electronically signed by the manager&apos;s profile ID and timestamped. This log is immutable and available for administrative review during quarterly audits.&quot;
              </p>
           </div>
        </div>
      </section>
    </div>
  )
}
