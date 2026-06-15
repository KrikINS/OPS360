import { Shield, MapPin, Key, Lock, Clock, UserPlus } from "lucide-react"

export default function StaffDocs() {
  return (
    <div className="space-y-8 pb-12">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Staff & Roles</h1>
        <p className="text-slate-500 mt-2">Manage staff accounts, hierarchical roles, shift attendance, and multi-branch permissions.</p>
      </div>

      {/* NEW SECTION: HR Dashboard */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Shield className="h-6 w-6 text-indigo-500" />
          HR Dashboard
        </h3>
        <p className="text-sm text-slate-600 mb-4">The HR module now has three tabs:</p>
        <ul className="space-y-4 text-sm text-slate-600">
          <li className="bg-slate-50 p-4 rounded-xl border">
            <strong className="text-[#001529] block mb-2">Directory Tab:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>All staff across all branches (deduplicated — each person appears once regardless of branch count).</li>
              <li>Columns: Name, Role, Email, Branch.</li>
              <li>&quot;Add Offline Staff&quot; button for employees who don&apos;t have an ERP account.</li>
              <li>Offline staff stored in <code>employees</code> table with first_name, last_name, email, phone, status.</li>
            </ul>
          </li>
          <li className="bg-slate-50 p-4 rounded-xl border">
            <strong className="text-[#001529] block mb-2">Attendance Tab:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>Clock In/Out widget on the left.</li>
              <li>Three states: Not Started / On Shift / Shift Ended.</li>
              <li>Live HH:MM:SS elapsed timer while on shift.</li>
              <li>Historic attendance log on the right.</li>
              <li>Admins see all branches; staff see their own records.</li>
            </ul>
          </li>
          <li className="bg-slate-50 p-4 rounded-xl border">
            <strong className="text-[#001529] block mb-2">Activity Log Tab:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>System activity log per user.</li>
              <li>Tracks logins, actions, and key events.</li>
            </ul>
          </li>
        </ul>
      </section>

      {/* UPDATED SECTION: Clock-In/Out Widget */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6 text-emerald-500" />
          Clock In/Out Widget
        </h3>
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6">
          <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
            <li><strong>Location:</strong> Located in the Attendance tab (not standalone).</li>
            <li>Staff can clock in and out once per shift.</li>
            <li>Attendance is recorded in the database.</li>
            <li>Clock-out shows total shift duration.</li>
          </ul>
        </div>
      </section>

      {/* NEW SECTION: Non-ERP Staff */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <UserPlus className="h-6 w-6 text-orange-500" />
          Non-ERP Staff
        </h3>
        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-6">
          <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
            <li>&quot;Add Offline Staff&quot; button in Directory tab.</li>
            <li>Records employees without system access.</li>
            <li>Fields: First Name, Last Name, Email, Phone, Status.</li>
            <li>Stored in <code>employees</code> table separate from profiles.</li>
            <li>Useful for warehouse staff, delivery personnel, etc.</li>
          </ul>
        </div>
      </section>

      {/* NEW SECTION: Leave Management */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6 text-purple-500" />
          Leave Management
        </h3>
        <p className="text-sm text-slate-600 mb-4">A dedicated module within the HR dashboard for managing staff time-off.</p>
        <ul className="space-y-4 text-sm text-slate-600">
          <li className="bg-slate-50 p-4 rounded-xl border">
            <strong className="text-[#001529] block mb-2">Leave Types & Balances:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>Admins define Leave Types (e.g., Casual, Sick) with annual day quotas.</li>
              <li>Each staff member gets an individual Leave Balance ledger tracking their accrued vs. used days.</li>
            </ul>
          </li>
          <li className="bg-slate-50 p-4 rounded-xl border">
            <strong className="text-[#001529] block mb-2">Applying for Leave:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>Staff can submit leave requests specifying start/end dates, type, and reason.</li>
              <li>The system calculates the exact number of days.</li>
              <li>Pending requests are routed to management for review.</li>
            </ul>
          </li>
          <li className="bg-slate-50 p-4 rounded-xl border">
            <strong className="text-[#001529] block mb-2">Approvals:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>Managers/Admins can Approve or Reject requests.</li>
              <li>Upon approval, the system automatically deducts the requested days from the staff member's balance.</li>
            </ul>
          </li>
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Role Matrix */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-indigo-600" />
            RBAC Matrix (Role Based Access)
          </h3>
          <div className="space-y-3">
            {[
              { role: "Super Admin", desc: "Full system access, global settings, and audit trails." },
              { role: "Area Manager", desc: "Master approvals, inventory overrides, and branch reporting." },
              { role: "Branch Manager", desc: "Stock receipt, transfer initiation, and staff oversight." },
              { role: "Sales Associate", desc: "POS operations, customer entry, and invoice generation." }
            ].map(r => (
              <div key={r.role} className="p-3 bg-slate-50 border rounded-lg">
                <div className="text-xs font-black text-[#001529] uppercase tracking-widest mb-1">{r.role}</div>
                <p className="text-[11px] text-slate-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Branch Assignments */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-rose-500" />
            Geographical Binding
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Every staff member is bound to a <strong>Primary Branch</strong>. This limits their visibility to local stock and sales unless granted cross-branch override permissions.
          </p>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
            <Lock className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Security Protocol:</strong> POS terminals automatically lock if the logged-in user attempts to process a sale from an unauthorized branch environment.
            </p>
          </div>
        </div>
      </div>

      {/* Account Security */}
      <section className="bg-slate-50 border rounded-2xl p-8 space-y-6">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-3">
          <Key className="h-6 w-6 text-blue-600" />
          Account Lifecycle & Security
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border p-4 rounded-xl">
             <h4 className="text-sm font-bold text-slate-900 mb-2">Activation Workflow</h4>
             <p className="text-xs text-slate-500 leading-relaxed">
               New accounts are created in a <strong>Pending</strong> state. They must be explicitly <strong>Activated</strong> by an Admin to enable login.
             </p>
          </div>
          <div className="bg-white border p-4 rounded-xl">
             <h4 className="text-sm font-bold text-slate-900 mb-2">Password Hardening</h4>
             <p className="text-xs text-slate-500 leading-relaxed">
               Admins can force password resets for any staff member. The system uses secure hashing for all credential storage.
             </p>
          </div>
        </div>
      </section>
    </div>
  )
}
