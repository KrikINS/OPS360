import { TrendingUp, Percent, IndianRupee, FileText } from "lucide-react"

export default function SalesDocs() {
  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Sales & Pricing</h1>
        <p className="text-slate-500 mt-2">Manage pricing structures, discount approvals, margin tracking, and GST calculations.</p>
      </div>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <IndianRupee className="h-6 w-6 text-blue-500" />
          Pricing Structure
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>MRP / Retail Price:</strong> Primary field, the ceiling price printed on the product box (incl. GST).</li>
          <li><strong>Unit Rate (Ex-GST):</strong> Auto-calculated from MRP ÷ (1 + GST rate). Read-only.</li>
          <li><strong>Dealer Cost:</strong> What you paid the distributor (excl. GST).</li>
          <li><strong>Gross Margin %:</strong> Auto-calculated from MRP vs Dealer Cost.</li>
          <li><strong>Min Sell Price:</strong> Auto-calculated floor: <code>dealer_cost × (1 + margin%)</code> capped at MRP.</li>
          <li><strong>Max Discount %:</strong> Cashier auto-approval limit (default 10%).</li>
          <li><strong>Validation:</strong> Dealer price cannot exceed MRP; min sell price cannot go below dealer cost.</li>
        </ul>
      </section>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6 text-indigo-500" />
          Customer Management
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Walk-in vs Registered vs Business</strong> customer types.</li>
          <li>Customer search by name or phone at POS.</li>
          <li>Inline customer creation from POS terminal.</li>
          <li>Business customers show GSTIN + Company Name.</li>
          <li>Invoice shows TAX INVOICE for B2B, RETAIL INVOICE for B2C.</li>
        </ul>
      </section>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6 text-emerald-500" />
          Customer Registry
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Filter by type: All / Walk-in / Registered / Business.</li>
          <li>GSTIN and Company Name columns for business customers.</li>
          <li><strong>Purchase History side panel per customer showing:</strong> total orders, total spent, avg order value, top products, full invoice list.</li>
        </ul>
      </section>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <TrendingUp className="h-6 w-6 text-orange-500" />
          Loyalty Points System
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>All customers earn points automatically after every sale.</li>
          <li>₹100 spent = 1 point (no manual setup required).</li>
          <li>Points visible in cart when customer is selected.</li>
          <li><strong>Cashier can redeem points at checkout:</strong> enter points amount → deducted from grand total. "Use All" button applies maximum redeemable.</li>
          <li>Invoice shows points earned at bottom.</li>
          <li><strong>Loyalty History Drawer:</strong> Accessible via the Customer Registry. Clicking on a customer's loyalty balance opens a detailed audit drawer.</li>
          <li>The History Drawer tracks every transaction: POS earnings, POS redemptions, and manual Admin adjustments with reasons and timestamps.</li>
          <li>Admin can manually adjust points per customer via this drawer.</li>
        </ul>
      </section>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Percent className="h-6 w-6 text-emerald-500" />
          Discount Flow
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Cashiers can enter a discount % per line item at the POS checkout.</li>
          <li>Discounts <code>&le; max_discount_pct</code> are auto-approved.</li>
          <li>Discounts <code>&gt; max_discount_pct</code> trigger a requirement for a manager PIN.</li>
          <li>All discounts are fully tracked for audits: amount, percentage, and the authorizing manager's ID.</li>
        </ul>
      </section>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <TrendingUp className="h-6 w-6 text-indigo-500" />
          Margin Tracking
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Each sale permanently records the <code>cost_price</code> directly derived from the inventory unit's <code>landed_cost</code>.</li>
          <li>This exact cost binding enables real-time, product-level margin analysis.</li>
          <li>The <strong>Finance &gt; Margin Report</strong> details: Revenue, COGS, Gross Profit, Margin %, and Discounts.</li>
          <li><strong>Margin health indicators:</strong>
            <ul className="list-circle pl-5 mt-1">
              <li><span className="font-semibold text-emerald-600">Healthy:</span> &ge; 20%</li>
              <li><span className="font-semibold text-amber-500">Moderate:</span> &ge; 10%</li>
              <li><span className="font-semibold text-red-500">Critical:</span> &lt; 10%</li>
            </ul>
          </li>
        </ul>
      </section>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6 text-slate-600" />
          GST on Sales
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>GST is calculated automatically based on the product's assigned <code>gst_rate</code>.</li>
          <li>Standard calculation defaults to <strong>CGST + SGST</strong> for intra-state sales.</li>
          <li>Tax is calculated on the <strong>discounted price</strong> (post-discount).</li>
          <li>All collected GST correctly flows to liability accounts in the general ledger.</li>
        </ul>
      </section>
    </div>
  )
}
