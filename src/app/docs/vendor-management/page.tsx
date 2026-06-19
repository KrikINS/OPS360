import { ShieldCheck, ChevronRight, FileText, BarChart2, History } from "lucide-react"

export default function VendorManagementDocs() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="hover:text-slate-600 cursor-pointer">Docs</span>
        <ChevronRight className="h-3 w-3" />
        <span className="hover:text-slate-600 cursor-pointer">Procurement</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#001529]">Vendors</span>
      </nav>

      <section className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">
          Vendor Onboarding & Compliance Protocols
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Standardized procedures for registering new suppliers and ensuring audit-ready compliance status.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3 text-blue-600 flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Document Management & Vault
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Securely store and retrieve critical vendor documentation. The Ops360 Document Vault ensures that expired certificates trigger automated compliance alerts.
        </p>
        <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center py-10">
          <div className="h-12 w-12 rounded-full bg-white border shadow-sm flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-slate-400" />
          </div>
          <h4 className="font-bold text-slate-900">Contract Storage Specification</h4>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Accepted formats: PDF, JPEG, PNG. Maximum file size: 10MB per document. All files are encrypted at rest via GCP Cloud Storage.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3 text-indigo-600 flex items-center gap-2">
          <History className="h-6 w-6" />
          Compliance Audit History
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Every change to a vendor&apos;s status (Pending → Verified → Blacklisted) is recorded in a tamper-proof audit log.
        </p>
        <div className="overflow-hidden border rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs opacity-60">2026-03-14 14:22</td>
                <td className="px-4 py-3 text-emerald-600 font-medium">Status: Verified</td>
                <td className="px-4 py-3 font-medium text-[#001529]">Area Manager Admin</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs opacity-60">2026-03-14 11:05</td>
                <td className="px-4 py-3 text-amber-600 font-medium">Status: Pending</td>
                <td className="px-4 py-3 font-medium text-[#001529]">Procurement Staff</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 pt-6 border-t">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
          Ops360 Documentation • Confidential Information
        </p>
      </div>
    </div>
  )
}
