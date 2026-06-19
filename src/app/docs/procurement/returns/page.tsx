import { Badge } from "@/components/ui/badge"
import { FileUp, ShieldCheck, Scale, RotateCcw, AlertCircle } from "lucide-react"

export default function DocumentRetentionReturnsDoc() {
  return (
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <Badge className="bg-[#7FD1E3] text-[#001529] font-black uppercase tracking-widest mb-4 hover:bg-[#68bdcf]">
            Procurement Procedures
          </Badge>
          <h1 className="text-4xl font-black tracking-tighter text-[#001529] mb-4">
            Document Retention & Return Procedures
          </h1>
          <p className="text-xl text-slate-500 font-medium">
            Guide on utilizing the digital document archive and processing purchase returns via debit notes.
          </p>
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <FileUp className="h-6 w-6 text-[#001529]" />
            <h2 className="text-2xl font-bold tracking-tight text-[#001529]">
              Digital Document Archive
            </h2>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider mb-4 border-l-4 border-[#7FD1E3] pl-3">
              Bill Upload Process
            </h3>
            <p className="text-slate-600 mb-6 font-medium">
              The OPS360 system allows associating Vendor Bills and documentation with Purchase Orders to maintain a digital audit trail.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                  <span className="font-bold text-blue-700">1</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Upload Initiation</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Once a Purchase Order is approved, partially received, or fully received, an upload button becomes available in the PO Actions column.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                  <span className="font-bold text-amber-700">2</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Document Storage Limitation</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="text-amber-600 font-bold">⚠️ NOTE:</span> While the UI supports attaching files during Bill Upload, server-side storage (e.g., GCS <code>procurement_docs</code> bucket) is currently pending implementation. The Bill record is created, but files are not physically stored.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <Scale className="h-6 w-6 text-[#001529]" />
            <h2 className="text-2xl font-bold tracking-tight text-[#001529]">
              3-Way Match Verification
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10" />
              <h3 className="font-bold text-blue-900 mb-2">1. Agreement (PO)</h3>
              <p className="text-sm text-slate-600">The total value initially approved in the PO. This forms the basis of the supplier contract.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10" />
              <h3 className="font-bold text-blue-900 mb-2">2. Reality (GRN)</h3>
              <p className="text-sm text-slate-600">The aggregate landed cost of goods actually received, factoring in taxes and partial shipments.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-10" />
              <h3 className="font-bold text-amber-900 mb-2">3. Demand (Bill)</h3>
              <p className="text-sm text-slate-600">The amount requested by the vendor, entered during the reconciliation phase.</p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-xl shadow-inner border border-slate-200">
             <div className="flex items-start gap-4">
                <ShieldCheck className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                <div>
                   <h3 className="font-bold text-slate-800">Match Indicators</h3>
                   <p className="text-sm text-slate-600 mt-2">
                     The system automatically compares these three pillars. If the PO total, GRN total, and Vendor Bill closely align, a <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">FULL MATCH</span> indicator is issued. Any discrepancy triggers a <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">VARIANCE</span> alert, requesting auditing.
                   </p>
                </div>
             </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <RotateCcw className="h-6 w-6 text-[#001529]" />
            <h2 className="text-2xl font-bold tracking-tight text-[#001529]">
              Purchase Returns & Debit Notes
            </h2>
          </div>

          <p className="text-slate-600 font-medium">
            Handling defective units or mis-shipments requires precise financial reversal to maintain compliance. The dedicated Returns interface explicitly pulls the item&apos;s historical pedigree to ensure accurate ledger reversal.
          </p>

          <div className="bg-white border-2 border-slate-100 rounded-xl overflow-hidden shadow-md">
            <div className="bg-[#001529] px-6 py-4">
              <h3 className="text-white font-bold tracking-wider text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#7FD1E3]" /> Returns Workflow
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-6 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-slate-800">Scan Serial</h4>
                  <p className="text-sm text-slate-600 mt-1">Input the exact serial number of the unit to return. The system will retrieve the unit&apos;s entire pedigree, including the origin Vendor, Source PO, and the exactly calculated Investment Value (Landed Cost).</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-slate-800">Statement of Reason</h4>
                  <p className="text-sm text-slate-600 mt-1">Provide an immutable justification for the return (e.g., &quot;Transit Damage&quot; or &quot;Functional Defect&quot;).</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-amber-900">Execute Reversal</h4>
                  <p className="text-sm text-slate-600 mt-1">The system automatically flags the unit&apos;s status as <code>Returned</code> and generates a Debit Note corresponding precisely to the item&apos;s Landed Cost. This action is irreversible.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
  )
}
