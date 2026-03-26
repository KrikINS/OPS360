import { ChevronRight, Upload, AlertCircle, FileSpreadsheet } from "lucide-react"

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
            The system automatically tracks asset age from the inward date. Use the **Inventory Dashboard** to search and sort items based on these aging tiers.
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
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Crimson (&gt;60d)</span>
              <span className="text-xs font-bold text-red-700">Slow Mover Protocol</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#7FD1E3]/20 flex items-center justify-center">
              <span className="text-[#001529]">03</span>
            </div>
            Active Stock Grouping & Drill-Down
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            High-density inventory is now grouped by <strong>Model Code</strong> and <strong>Branch</strong> to provide an executive overview of stock levels.
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• Grouped Analytics:</span>
              <span>Total Stock, Average Landed Cost, and Primary Aging (oldest unit) are summarized at the model level.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#001529]">• Interactive Drill-Down:</span>
              <span>Expand any group to reveal a sub-table of individual serial numbers with their unique registry metadata.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600">04</span>
            </div>
            Advanced Search & Sort
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Powerful filtering tools for multi-dimensional inventory reconciliation:
          </p>
          <ul className="space-y-2 text-[13px] text-slate-600">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Metadata Joining:</strong> View HSN, Model Specifications, and Branch locations in a single unified view.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Slow Mover Filters:</strong> Identify groups with units exceeding 60-day aging thresholds for immediate action.</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <span className="text-emerald-600">05</span>
          </div>
          Active Stock & Dispositions Hub
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          The Inventory Registry separates active tradable assets from historic dispositions to guarantee precise dashboard metrics.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <h4 className="text-[11px] font-black uppercase text-[#001529] tracking-widest mb-2 border-b border-slate-200 pb-2">Active Stock</h4>
            <p className="text-[13px] text-slate-600 leading-relaxed">
              Exclusively displays <strong>Available</strong> and <strong>In-Transit</strong> stock. 
              The global <code>Available Units</code> tracking metric actively runs off this filtered subset, inherently preventing tracking inflation from damaged or reversed serial numbers.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
             <h4 className="text-[11px] font-black uppercase text-amber-900 tracking-widest mb-2 border-b border-amber-200 pb-2">Historic Dispositions</h4>
             <p className="text-[13px] text-amber-800 leading-relaxed">
               A dedicated historic UI timeline housing all <strong>Sold</strong>, <strong>Returned</strong>, or <strong>Damaged</strong> legacy serial numbers required strictly for external auditing and compliance checks.
             </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="text-indigo-600">06</span>
          </div>
          Enterprise Logistics & Waybills
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Ops360 uses a synchronous waybill protocol to ensure 100% stock accuracy during inter-branch movements.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#001529]">Fulfillment Bridge</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Approved <strong>Stock Requests</strong> can be fulfilled with one click. This bridges the demand manifest directly into a new Transfer Waybill, pre-filling quantities to eliminate manual entry errors.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#001529]">Deterministic Numbering</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Waybills follow a <code>ST-YYYY-####</code> sequence. The counter resets annually, providing a clean audit trail across fiscal years.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#001529]">Physical Handover (Waybills)</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Thermal-ready and A4 PDFs contain ST-Number barcodes. Receiving managers use the search filter to locate digital records in seconds using these physical references.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#001529]">Atomic Receipt Logic</h4>
                <p className="text-xs text-slate-500 mt-1">
                  The <code>receive_stock_transfer</code> protocol uses elevated security levels to ensure cross-table atomicity, locking the transfer record while simultaneously updating branch inventories and logging audit trails.
                </p>
              </div>
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

      {/* ── Bulk Data Ingestion (CSV Imports) ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3 text-[#7FD1E3]">
          <Upload className="h-6 w-6" />
          <h2 className="text-2xl font-bold text-[#001529]">Bulk Data Ingestion (CSV Imports)</h2>
        </div>
        
        <p className="text-slate-600 leading-relaxed">
          For large-scale system initialization or warehouse stock-takes, Ops360 provides a high-speed <strong>Opening Stock CSV Import</strong> tool.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-6 space-y-3">
             <div className="flex items-center gap-2 text-[#001529] font-black uppercase tracking-widest text-[10px]">
               <FileSpreadsheet className="h-4 w-4" /> Required Columns
             </div>
             <p className="text-xs text-slate-500 leading-relaxed">
               The CSV must contain: <strong>Brand</strong>, <strong>Item Name</strong> (Model), <strong>Serial Number</strong>, <strong>Branch Name</strong>, and <strong>Estimated Cost</strong>. 
               The system automatically maps these strings to existing project IDs.
             </p>
          </div>
          <div className="bg-white border rounded-xl p-6 space-y-3">
             <div className="flex items-center gap-2 text-amber-600 font-black uppercase tracking-widest text-[10px]">
               <AlertCircle className="h-4 w-4" /> Validation Rules
             </div>
             <p className="text-xs text-slate-500 leading-relaxed">
               Duplicate serial numbers found in the CSV or existing database will be rejected during the pre-flight scan to ensure <strong>100% data integrity</strong>.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
