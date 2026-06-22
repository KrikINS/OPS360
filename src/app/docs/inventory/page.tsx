import { Download, Activity, TrendingDown } from "lucide-react"

export default function InventoryDocs() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Inventory Management</h1>
        <p className="text-slate-500 mt-2">Learn how to manage stock, track movements, import opening balances, and optimize inventory levels.</p>
      </div>

      {/* NEW SECTION: Opening Stock Import */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-6">
          <Download className="h-6 w-6 text-[#7FD1E3]" />
          Opening Stock Import
        </h3>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="bg-slate-50 border rounded-lg p-4 flex-1">
              <h4 className="font-bold text-sm text-[#001529] mb-2">Step 1: Download Template</h4>
              <p className="text-xs text-slate-600">
                Click &quot;Import Opening Stock&quot; in the Registry. Download the branded Excel template containing three sheets: 
                <strong>Opening Stock</strong> (data entry), <strong>Products Reference</strong>, and <strong>Branches Reference</strong>.
                Product codes and branch names must match exactly.
              </p>
            </div>
            <div className="bg-slate-50 border rounded-lg p-4 flex-1">
              <h4 className="font-bold text-sm text-[#001529] mb-2">Step 2: Fill Data</h4>
              <p className="text-xs text-slate-600">
                Fill in one row per unit with the 10 standard columns: Product Code (ITM), Product Name, Brand, Serial Number, Branch Name, Landed Cost (₹), Selling Price / MRP (₹), Dealer Price (₹), Max Discount (%), and Condition Notes.
              </p>
            </div>
            <div className="bg-slate-50 border rounded-lg p-4 flex-1">
              <h4 className="font-bold text-sm text-[#001529] mb-2">Step 3: Upload & Validate</h4>
              <p className="text-xs text-slate-600 mb-2">
                The system validates product existence, branch names, duplicate serials, and cost/price formats. Valid rows generate auto-posted opening balance journal entries per branch.
              </p>
              <p className="text-xs text-slate-600">
                <strong>Pricing Sync:</strong> Importing dealer price auto-updates product pricing if the product doesn&apos;t have a dealer price set yet. The <strong>Products Reference</strong> sheet now shows full pricing data (MRP, Dealer Price, Min Sell, GST Rate, Max Discount). The success message will indicate how many products had pricing updated.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UPDATED SECTION: Inventory Registry */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Activity className="h-6 w-6 text-blue-500" />
          Inventory Registry
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Available Inventory:</strong> Shows all active stock grouped by product.</li>
          <li><strong>Columns:</strong> Brand, Item Code, Item Name, Network Stock, Category, Distribution, Status, Avg Value (LC).</li>
          <li><strong>Drill-down:</strong> Expand a row to see branch-level breakdown, and expand further to see individual serial numbers.</li>
          <li><strong>Transfer Stock:</strong> Click the red arrow button on low-stock items to open the Transfer Control Center pre-filled.</li>
          <li><strong>Dispositions:</strong> Switch tabs to view historical Sold or Returned serial numbers.</li>
        </ul>
      </div>

      {/* UPDATED SECTION: Cost Tracking */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <TrendingDown className="h-6 w-6 text-indigo-500" />
          Cost Tracking
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Each unit tracks its specific <code>landed_cost</code> (purchase price + freight) and <code>price</code> (selling price).</li>
          <li>The <strong>Avg Value (LC)</strong> in the registry is correctly calculated by averaging the numerical landed cost of all available units for that product.</li>
          <li>Accurate cost tracking enables exact COGS (Cost of Goods Sold) calculations at the time of POS checkout.</li>
        </ul>
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
              <span><span className="text-red-600 font-bold">⚠️ CRITICAL:</span> Ops360 does <strong>not</strong> currently place items in a locked "In-Transit" state during branch transfers. When a transfer is submitted, items remain "Available" in the source branch until the destination branch confirms receipt. Branches must physically segregate transferred stock to avoid accidental double-selling.</span>
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

      <div className="bg-white border rounded-xl p-6 shadow-sm border-amber-200">
        <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="text-indigo-600">03</span>
          </div>
          Transfer Tracking & Receipt Logic
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Ops360 uses a two-step transfer process to manage inter-branch stock movement.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#001529]">Transfer Identifiers</h4>
                <p className="text-xs text-slate-500 mt-1">
                  When a Stock Transfer is initiated, the system automatically generates a unique tracking ID using a <code>TRN-XXXXXX</code> sequence based on the UUID. This serves as the primary identifier on the printed manifest.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#001529]">QR-Based Scanning</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Every printed transfer manifest contains a dynamic QR code encoded with the <strong>TRN- ID</strong>. Destination managers can scan this to instantly pull up the digital manifest and initiate receipt.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#001529]">Two-Step Receipt Protocol</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Transfer initiation <strong>does not deduct source stock</strong>. It is only when the destination branch confirms receipt that an atomic database transaction fires: deducting units from the source (marking them "Transferred") and adding identical new units (marked "Available") to the destination.
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

    </div>
  )
}
