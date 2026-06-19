import { Settings, Users, KeyRound, UserCog, ShieldCheck, MapPin } from "lucide-react"

export default function AdminDocs() {
  return (
    <div className="space-y-8 pb-12">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Administration Center</h1>
        <p className="text-slate-500 mt-2">Centralized controls for access matrices, user provisioning, branch registry, and company branding.</p>
      </div>

      {/* NEW SECTION: Navigation */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Settings className="h-6 w-6 text-slate-500" />
          Navigation
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Admin pages now use the standard ERP sidebar and dark header — consistent with all other modules.</li>
          <li>No dedicated admin sidebar (removed).</li>
          <li>System Administration button in main header for quick access to admin section.</li>
        </ul>
      </section>

      {/* NEW SECTION: Organization */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <MapPin className="h-6 w-6 text-rose-500" />
          Organization
        </h3>
        <p className="text-sm text-slate-600 mb-4">Organization page now has two tabs:</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border p-4 rounded-xl">
             <h4 className="text-sm font-bold text-slate-900 mb-2">Branch Registry</h4>
             <p className="text-xs text-slate-500 leading-relaxed">
               Manage branches, add/edit locations, GSTIN per branch, full address.
             </p>
          </div>
          <div className="bg-slate-50 border p-4 rounded-xl">
             <h4 className="text-sm font-bold text-slate-900 mb-2">Company Branding</h4>
             <p className="text-xs text-slate-500 leading-relaxed">
               Company name, support email, billing address, logo URL, primary brand color.
             </p>
          </div>
        </div>
      </section>

      {/* NEW SECTION: Access Control Matrix */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <ShieldCheck className="h-6 w-6 text-indigo-500" />
          Access Control Matrix (ACM)
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Module Permissions:</strong> Toggle permissions individually per user for POS, Inventory, Procurement, Sales, Finance, Service, Admin, and HR modules.</li>
          <li><strong>Branch Assignments:</strong> Assign branches per user. The dropdown allows selecting from all available network branches.</li>
          <li><strong>Save Updates:</strong> Persists role, module permissions, and branch assignments simultaneously in one atomic action.</li>
          <li><strong>Bypass:</strong> Admin and Owner roles automatically bypass all permission checks globally.</li>
        </ul>
      </section>

      {/* NEW SECTION: Password Reset */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <KeyRound className="h-6 w-6 text-red-500" />
          Password Reset (Danger Zone)
        </h3>
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-6">
          <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
            <li>Admin clicks on a user profile and accesses the <strong>Danger Zone → Reset Password</strong>.</li>
            <li>Generates a temporary, easy-to-read password (e.g., <code>ETHAN-XXXX</code>), automatically excluding ambiguous characters like 0/O/1/I.</li>
            <li>Sets the <code>force_password_change = true</code> flag on the user's profile.</li>
            <li>The user must set a new password on their next login attempt.</li>
            <li>After setting the new password, the user is signed out and redirected to login with a success banner.</li>
          </ul>
        </div>
      </section>

      {/* NEW SECTION: User Provisioning */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <UserCog className="h-6 w-6 text-blue-500" />
          User Provisioning
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Click the <strong>Provision New User</strong> button in User Management.</li>
          <li>Configure their email, temporary password, role, and branch assignments.</li>
          <li><strong>Default security:</strong> All module permissions default to disabled for new users.</li>
          <li>Admin must explicitly enable module permissions via the Access Control Matrix toggles after creation.</li>
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div className="bg-white border rounded-xl p-6 shadow-sm md:col-span-2">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-[#7FD1E3]" />
            Global Masters & Product Catalog Configuration
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Products and their primary attributes are configured within the Global Masters section. Ensuring accurate baseline pricing here is critical as it dictates POS boundaries and margin thresholds globally across all branches.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border rounded-lg p-4">
              <h4 className="font-bold text-sm text-[#001529] mb-2">Bulk Import Products</h4>
              <p className="text-xs text-slate-600 mb-2">
                Use the <strong>Bulk Import</strong> feature to upload multiple product definitions simultaneously using a branded template.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
                <li><strong>Download Template:</strong> Contains columns for Model, Brand, Category, Code, Prices, MRP, and Tax settings.</li>
                <li><strong>Validation:</strong> The system ensures required fields are met and dealer price &le; Min Sell Price &le; MRP constraints are valid before importing.</li>
                <li><strong>Data Population:</strong> Upon successful upload, the global catalog is populated, immediately making these products available for GRN across all branches.</li>
              </ul>
            </div>
            <div className="bg-slate-50 border rounded-lg p-4">
              <h4 className="font-bold text-sm text-[#001529] mb-2">Adding & Editing Products Manually</h4>
              <p className="text-xs text-slate-600 mb-2">
                When provisioning a new asset or updating an existing product via the Product Modals, the following base pricing parameters must be carefully established:
              </p>
              <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
                <li><strong>MRP (Base Price):</strong> The absolute ceiling price. The system automatically calculates and previews the tax-inclusive MSRP based on the selected GST Rate.</li>
                <li><strong>Dealer Price:</strong> Input your baseline distributor or wholesale cost.</li>
                <li><strong>Min Sell Price:</strong> An automatically suggested guideline (defaults to 1.05× Dealer Price). You can manually override this value.</li>
                <li><strong>Max Discount %:</strong> Sets the boundary for auto-approved line-item discounts at the POS (defaults to 10%). Any discount requested beyond this tier triggers a Manager PIN override requirement.</li>
              </ul>
            </div>
            <div className="bg-slate-50 border rounded-lg p-4">
              <h4 className="font-bold text-sm text-[#001529] mb-2">Global Settings Impact</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#7FD1E3] mt-1.5" />
                  <span><strong>Tax Slabs:</strong> Edit global HSN mappings and corresponding GST percentages to auto-populate product creation forms.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#7FD1E3] mt-1.5" />
                  <span><strong>T&C Templates:</strong> Manage default terms applied to all outward documents (Invoices/POs).</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#7FD1E3] mt-1.5" />
                  <span><strong>Audit Retention:</strong> Configure how long discrepancy and shift logs are preserved.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm md:col-span-2">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-500" />
            Role Hierarchies
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 border rounded-lg">
              <h4 className="text-xs font-bold text-[#001529] uppercase tracking-wider mb-1">Super Admin / Owner</h4>
              <p className="text-[11px] text-slate-500">Unrestricted access. Can edit system configuration, wipe data, and modify roles.</p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg">
              <h4 className="text-xs font-bold text-[#001529] uppercase tracking-wider mb-1">Manager</h4>
              <p className="text-[11px] text-slate-500">Can approve POs, apply heavy discounts at POS, and view branch analytics.</p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg">
              <h4 className="text-xs font-bold text-[#001529] uppercase tracking-wider mb-1">Staff / Cashier</h4>
              <p className="text-[11px] text-slate-500">Restricted to POS, basic CRM entry, and local inventory viewing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
