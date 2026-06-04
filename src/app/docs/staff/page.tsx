import { Shield, MapPin, Key, Lock, Clock } from "lucide-react"

export default function StaffDocs() {
  return (
    <div className="space-y-8 pb-12">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Staff & Roles</h1>
        <p className="text-slate-500 mt-2">Manage staff accounts, hierarchical roles, shift attendance, and multi-branch permissions.</p>
      </div>

      {/* NEW SECTION: Clock-In/Out Widget */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6 text-emerald-500" />
          Shift Attendance (Clock-In/Out Widget)
        </h3>
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6">
          <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
            <li><strong>Visibility:</strong> A clock widget is accessible on the Staff page for all users.</li>
            <li><strong>Three States:</strong>
              <ul className="list-circle pl-5 mt-1 space-y-1">
                <li><em>Not Started</em> - User has not clocked in today.</li>
                <li><em>On Shift</em> - User is currently clocked in.</li>
                <li><em>Shift Ended</em> - User has clocked out for the day.</li>
              </ul>
            </li>
            <li><strong>Real-time Tracking:</strong> Displays current status, clock-in time, and a live elapsed timer (HH:MM:SS) while on shift.</li>
            <li><strong>Single Action Button:</strong> Context-aware button switches between "Clock In" and "Clock Out".</li>
            <li><strong>Daily Persistence:</strong> Loads today's attendance record automatically on mount. After clock-out, the total shift duration is displayed.</li>
          </ul>
        </div>
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
