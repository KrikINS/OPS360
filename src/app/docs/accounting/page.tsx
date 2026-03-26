import { Calculator, Landmark, ShieldCheck, FileText, Receipt, TrendingUp } from "lucide-react"

export default function AccountingDocs() {
  return (
    <div className="space-y-8 pb-12">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Accounting & Finance</h1>
        <p className="text-slate-500 mt-2">Manage ledger accounts, tax compliance, and financial reporting.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* GST & Taxation */}
        <div className="bg-white border rounded-xl p-6 shadow-sm border-t-4 border-t-emerald-500">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-emerald-600" />
            Taxation & GST Compliance
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            System-wide tax engines ensure accurate IGST/CGST/SGST calculations:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-xs text-slate-500">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1" />
              <span><strong>HSN-Locked Rates:</strong> Slabs (0%, 5%, 12%, 18%, 28%) are globally standard and forced via HSN masters.</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-500">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1" />
              <span><strong>Composite Value:</strong> Taxes calculated on (Unit Price + Freight) to comply with Indian Supply rules.</span>
            </li>
          </ul>
        </div>

        {/* Payment Methods */}
        <div className="bg-white border rounded-xl p-6 shadow-sm border-t-4 border-t-blue-500">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <Landmark className="h-5 w-5 text-blue-600" />
            Settlement Modes
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Support for multi-modal financial settlements across all sales channels:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {['Cash', 'Bank/UPI', 'EMI'].map(mode => (
              <div key={mode} className="bg-slate-50 border p-2 rounded text-[10px] font-bold text-center text-slate-600">
                {mode}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-4 italic">
            *EMI settlements require Finance Partner ID and processing fees metadata.
          </p>
        </div>
      </div>

      {/* Financial Reports */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-3">
          <FileText className="h-6 w-6 text-[#7FD1E3]" />
          Financial & Audit Reports
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-slate-50 border rounded-xl p-4">
            <Receipt className="h-5 w-5 text-slate-400 mb-2" />
            <h4 className="font-bold text-sm">GSTR-1 Ready</h4>
            <p className="text-xs text-slate-500">B2B and B2C sales grouped by GSTIN and HSN for easy filing.</p>
          </div>
          <div className="bg-slate-50 border rounded-xl p-4">
            <TrendingUp className="h-5 w-5 text-slate-400 mb-2" />
            <h4 className="font-bold text-sm">Daily Collections</h4>
            <p className="text-xs text-slate-500">Real-time settlement tracking across all geographical branches.</p>
          </div>
          <div className="bg-slate-50 border rounded-xl p-4">
            <ShieldCheck className="h-5 w-5 text-slate-400 mb-2" />
            <h4 className="font-bold text-sm">Inventory Value</h4>
            <p className="text-xs text-slate-500">Landed Cost-based inventory valuation for precise balance sheets.</p>
          </div>
        </div>
      </section>

      {/* Indian Currency Protocol */}
      <div className="bg-[#001529] rounded-2xl p-8 text-white">
        <h3 className="text-lg font-bold mb-4">Financial Numbering Protocol</h3>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Operational reporting follows the <strong>en-IN</strong> locale (Lakhs/Crores). Every transaction value includes Paisa support and deterministic rounding to 2 decimal places to guarantee matching across bank statements.
        </p>
      </div>
    </div>
  )
}
