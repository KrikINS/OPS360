export default function InventoryDocs() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Inventory Management</h1>
        <p className="text-slate-500 mt-2">Learn how to manage stock, track movements, and optimize inventory levels.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600">01</span>
            </div>
            Inventory Lifecycle
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-[#001529] min-w-[100px]">Inwarding:</span>
              <span>Stock entered via GRN automatically stamps source PO and Product ID.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529] min-w-[100px]">Available:</span>
              <span>Stock is ready for sale or inter-branch transfer (IBT).</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529] min-w-[100px]">In-Transit:</span>
              <span>Stock currently moving between geographical branches.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529] min-w-[100px]">Sold:</span>
              <span>Final disposition after successful POS transaction.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <span className="text-orange-600">02</span>
            </div>
            Stock Aging Protocols
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            To maintain healthy liquidity, the system automatically tracks asset age from the inward date.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded border">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Standard (0-30d)</span>
              <span className="text-xs font-bold text-slate-600 italic">Optimal Liquidity</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-100">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Amber (30-60d)</span>
              <span className="text-xs font-bold text-amber-700">Review Required</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Crimson ({">"}60d)</span>
              <span className="text-xs font-bold text-red-700">Slow Mover Protocol</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#001529] rounded-xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-2">Pedigree Tracking</h2>
          <p className="text-slate-300 text-sm max-w-2xl">
            Every serialized unit maintains a &quot;Pedigree Stamp&quot; linking it back to the original Purchase Order and Landed Cost. Using the Global Search, auditors can trace an item&apos;s journey from vendor shipment to final customer delivery.
          </p>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent" />
      </div>
    </div>
  )
}
