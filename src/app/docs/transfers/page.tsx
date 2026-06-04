import { ArrowRightLeft, Send, Handshake, Download } from "lucide-react"

export default function TransfersDocs() {
  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Transfer Control Center</h1>
        <p className="text-slate-500 mt-2">Manage inter-branch stock requests, direct transfers, and Waybill receiving workflows.</p>
      </div>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Send className="h-6 w-6 text-blue-500" />
          Stock Requests
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Request Stock:</strong> Ask for stock from another branch within the network.</li>
          <li><strong>Selection:</strong> Choose the source branch and add the required products to the request cart.</li>
          <li><strong>Submission:</strong> Submitting creates a formal stock request.</li>
          <li><strong>Visibility:</strong> The requested source branch will see this request in their "Incoming Demands" tab.</li>
        </ul>
      </section>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <ArrowRightLeft className="h-6 w-6 text-indigo-500" />
          Stock Transfers
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Direct Transfers:</strong> Initiate stock transfers directly between branches.</li>
          <li><strong>Creation:</strong> Select the source and destination branches, then search for products.</li>
          <li><strong>Serial Picking:</strong> Pick specific serial numbers from the available inventory units for the transfer.</li>
          <li><strong>Import from Demand:</strong> Pre-populate transfer carts from pending Incoming Demands.</li>
          <li><strong>Submission:</strong> Submitting finalizes the transfer and creates an actionable waybill.</li>
        </ul>
      </section>

      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Handshake className="h-6 w-6 text-emerald-500" />
          Receiving
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Verification:</strong> The destination branch verifies the incoming transfer.</li>
          <li><strong>Confirmation:</strong> Confirming receipt officially moves the inventory units into the destination branch's available stock.</li>
          <li><strong>Waybills:</strong> You can generate a Waybill print template complete with a QR code for easy scanning and logistics tracking.</li>
        </ul>
      </section>
    </div>
  )
}
