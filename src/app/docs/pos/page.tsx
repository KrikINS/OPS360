import { Keyboard, ShieldCheck, UserPlus, Hash, CreditCard, Clock, Percent, Unlock, MonitorSmartphone, TrendingDown, FileText } from "lucide-react"

export default function POSDocs() {
  return (
    <div className="space-y-8 pb-12">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Point of Sale (POS)</h1>
        <p className="text-slate-500 mt-2">Guides for retail operations, high-speed billing, discounts, and sales security.</p>
      </div>

      {/* Hotkeys Section */}
      <section className="bg-[#001529] rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Keyboard className="h-5 w-5 text-[#7FD1E3]" />
            Operator Hotkeys (Express Billing)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "Alt + S", action: "Search Products" },
              { key: "Alt + N", action: "Search Customers" },
              { key: "Alt + Enter", action: "Quick Checkout" },
              { key: "Alt + C", action: "Clear Cart" }
            ].map((hk, i) => (
              <div key={i} className="bg-white/10 border border-white/20 p-3 rounded-xl">
                <div className="text-[#7FD1E3] font-black text-xs mb-1">{hk.key}</div>
                <div className="text-[11px] text-slate-300 uppercase tracking-wider">{hk.action}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-[#7FD1E3]/10 to-transparent" />
      </section>

      {/* NEW SECTION: POS Terminal in Header */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <MonitorSmartphone className="h-6 w-6 text-blue-500" />
          POS Terminal Access
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li><strong>POS Terminal button is in the main header</strong> (not the sidebar).</li>
          <li>Always accessible from any page in the application.</li>
          <li>Visible only to users with the POS permission enabled.</li>
          <li>Displays as an icon-only button on mobile devices, and icon + label on desktop.</li>
        </ul>
      </section>

      {/* NEW SECTION: Customer Handling at POS */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <UserPlus className="h-6 w-6 text-indigo-500" />
          Customer Handling at POS
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Search bar</strong> accepts name or phone number.</li>
          <li><strong>Phone number detection:</strong> regex matches numeric input.</li>
          <li><strong>Walk-in default:</strong> no customer selection needed.</li>
          <li><strong>Inline add:</strong> cashier can create customer without leaving the POS — Full Name, Phone, Address, City, State, Pincode, GSTIN (optional).</li>
          <li><strong>Business customers:</strong> GSTIN field enables B2B invoicing.</li>
          <li>Selected customer shows type badge and GSTIN if business.</li>
          <li>Customer cleared automatically after checkout.</li>
        </ul>
      </section>

      {/* NEW SECTION: Loyalty Points at POS */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <TrendingDown className="h-6 w-6 text-orange-500" />
          Loyalty Points at POS
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>When customer selected: loyalty balance shows in cart.</li>
          <li>Purple loyalty widget appears between totals and grand total if customer has points.</li>
          <li>Enter points to redeem or click "Use All".</li>
          <li>Redemption value: 1 point = ₹1 discount.</li>
          <li>Points earned shown on printed invoice.</li>
          <li>Walk-in customers earn points too (tied to ID).</li>
        </ul>
      </section>

      {/* NEW SECTION: Invoice Types */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6 text-emerald-500" />
          Invoice Types
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>TAX INVOICE:</strong> printed when customer has GSTIN (B2B transaction, eligible for ITC claim).</li>
          <li><strong>RETAIL INVOICE:</strong> printed for regular customers.</li>
          <li>Both include: invoice number, date, branch, items, GST breakdown, payment mode.</li>
        </ul>
      </section>

      {/* NEW SECTION: Line-Item Discounts */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Percent className="h-6 w-6 text-emerald-500" />
          Line-Item Discounts
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Each cart item has a discount % input field.</li>
          <li>Discounts up to <code>max_discount_pct</code> (default 10%) are auto-approved.</li>
          <li>Discounts above the threshold require a manager PIN.</li>
          <li>The manager enters their POS PIN in the approval modal to authorize the discount.</li>
          <li>Discount cannot push the price below <code>min_sell_price</code> (hard floor protecting margins).</li>
          <li>Approved discounts store the manager&apos;s ID for audit purposes.</li>
        </ul>
      </section>

      {/* NEW SECTION: Manager PIN Approval */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Unlock className="h-6 w-6 text-orange-500" />
          Manager PIN Approval
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Managers and admins have a POS PIN set in their profile.</li>
          <li>When a cashier requests a discount above the auto-approval limit, a PIN modal appears.</li>
          <li>Manager enters their PIN → system verifies against <code>profiles.pos_pin</code> for manager/admin roles.</li>
          <li>The approved discount is applied and tracked in the final invoice.</li>
        </ul>
      </section>

      {/* NEW SECTION: Cost Tracking */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <TrendingDown className="h-6 w-6 text-indigo-500" />
          Cost Tracking & Margins
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Each sold unit&apos;s <code>landed_cost</code> is recorded as <code>cost_price</code> on the invoice item.</li>
          <li>This enables accurate margin reporting in the Finance module.</li>
          <li>The COGS (Cost of Goods Sold) journal entry uses the real landed cost, not estimates.</li>
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Serial Number Tracking */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <Hash className="h-5 w-5 text-blue-500" />
            Serial Number Integrity
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Ops360 enforces strict <strong>Single-Unit Traceability</strong>. For appliances and high-value electronics:
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span>Mandatory serial selection before checkout completion.</span>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span>Real-time availability validation prevents double-selling.</span>
            </li>
          </ul>
        </div>

        {/* Customer Quick Entry */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-emerald-500" />
            Express Customer Registry
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Capture new customer data without leaving the sales floor:
          </p>
          <ul className="mt-4 space-y-2 text-[13px] text-slate-600">
            <li className="p-2 bg-slate-50 border rounded-lg">
              <strong>Quick Add Drawer:</strong> Integrated sidebar for instant KYC (Name, Phone, GSTIN).
            </li>
            <li className="p-2 bg-slate-50 border rounded-lg">
              <strong>Smart Lookup:</strong> Auto-completes customer profiles from existing database.
            </li>
          </ul>
        </div>
      </div>

      {/* Settlement & Security */}
      <div className="bg-slate-50 border rounded-2xl p-8 space-y-6">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-indigo-600" />
          Terminal Security & Settlements
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Clock className="h-5 w-5 text-slate-400" />
            <h4 className="font-bold text-sm">Shift Handover</h4>
            <p className="text-xs text-slate-500">Terminal Lock Overlay ensures that active sessions are secured during operator breaks or shift changes.</p>
          </div>
          <div className="space-y-2">
            <CreditCard className="h-5 w-5 text-slate-400" />
            <h4 className="font-bold text-sm">Split Payments</h4>
            <p className="text-xs text-slate-500">Support for Cash, Bank, and EMI (Finance) modes. The system validates total received against cart value.</p>
          </div>
          <div className="space-y-2">
            <ShieldCheck className="h-5 w-5 text-slate-400" />
            <h4 className="font-bold text-sm">Invoice Immutability</h4>
            <p className="text-xs text-slate-500">Once generated, invoices are locked. Reversals must be processed through the <strong>Sales Return Registry</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
