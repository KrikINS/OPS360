import { 
  ChevronRight, 
  ShieldCheck, 
  ExternalLink, 
  Package 
} from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">
          Welcome to Ops360 Documentation
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          The comprehensive manual for Ops360 operational workflows, 
          procurement protocols, and finance management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
        <Link 
          href="/docs/vendor-management"
          className="group p-8 border rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl hover:border-[#7FD1E3] transition-all duration-300"
        >
          <h3 className="text-lg font-bold group-hover:text-[#001529] transition-colors">Procurement Protocols</h3>
          <p className="text-sm text-slate-500 mt-2">Learn about vendor registration, compliance, and PO locks.</p>
          <div className="mt-6 flex items-center text-[#7FD1E3] font-semibold text-sm">
            Read Guide <ChevronRight className="ml-2 h-4 w-4" />
          </div>
        </Link>

        <Link 
          href="/docs/branch-management"
          className="group p-8 border rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl hover:border-[#7FD1E3] transition-all duration-300"
        >
          <h3 className="text-lg font-bold group-hover:text-[#001529] transition-colors">Administration & Branches</h3>
          <p className="text-sm text-slate-500 mt-2">Configure destination stores and inventory storage locations.</p>
          <div className="mt-6 flex items-center text-[#7FD1E3] font-semibold text-sm">
            Read Guide <ChevronRight className="ml-2 h-4 w-4" />
          </div>
        </Link>

        <Link 
          href="/docs/inventory"
          className="group p-8 border rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl hover:border-[#7FD1E3] transition-all duration-300"
        >
          <h3 className="text-lg font-bold group-hover:text-[#001529] transition-colors">Inventory & Stock Aging</h3>
          <p className="text-sm text-slate-500 mt-2">Track stock lifecycles, aging alerts, and opening stock imports.</p>
          <div className="mt-6 flex items-center text-[#7FD1E3] font-semibold text-sm">
            Read Guide <ChevronRight className="ml-2 h-4 w-4" />
          </div>
        </Link>

        <section className="space-y-4 p-8 border rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Product Catalog Management
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p>The Product Master serves as the single source of truth for all appliances and models handled by the system.</p>
              <ul>
                <li><strong>Model Name:</strong> Brand-specific model identifiers (e.g., EHA-AC-1.5T).</li>
                <li><strong>HSN Codes:</strong> Standardized 4-8 digit codes for GST compliance (e.g., 8415 for Air Conditioners).</li>
                <li><strong>Base Price:</strong> The default vendor price before taxes and freight.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4 p-8 border rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              PO Approval Workflow
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p>Purchase Orders follow a strict sequence to ensure financial compliance and inventory accuracy:</p>
              <ol>
                <li><strong>Draft:</strong> Created by Sales or Procurement staff. Required vendor and product selection.</li>
                <li><strong>Pending Approval:</strong> Automatically sent to Admin/Manager for review after generation.</li>
                <li><strong>Approved:</strong> Admin reviews vendor compliance and pricing. Only approved POs can trigger GRN.</li>
                <li><strong>Received:</strong> Goods Receipt Note processed. Inventory is updated with serial numbers and landed costs.</li>
              </ol>
            </div>
          </section>

        <div className="p-8 border rounded-2xl bg-slate-50 opacity-60 grayscale cursor-not-allowed">
          <h3 className="text-lg font-bold">Finance Module</h3>
          <p className="text-sm text-slate-500 mt-2 text-wrap">Coming soon: Payment cycles, audit trails, and financial reporting.</p>
        </div>
      </div>

      <div className="mt-16 p-6 rounded-xl bg-[#7FD1E3]/10 border border-[#7FD1E3]/20 flex items-start gap-4">
        <div className="bg-[#7FD1E3] p-2 rounded-lg text-white">
          <ExternalLink className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-[#001529]">Need faster help?</h4>
          <p className="text-sm text-slate-600 mt-1">If you can&apos;t find what you&apos;re looking for, contact the IT Support desk or reach out via Slack.</p>
        </div>
      </div>
    </div>
  )
}
