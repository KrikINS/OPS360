import { Wrench, Users, MapPin, Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react"

export default function ServiceDocs() {
  return (
    <div className="space-y-8 pb-12">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Service & Maintenance</h1>
        <p className="text-slate-500 mt-2">Manage customer service requests, technician assignments, and repair lifecycles.</p>
      </div>

      {/* NEW SECTION: Service Jobs */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Wrench className="h-6 w-6 text-blue-500" />
          Service Jobs Lifecycle
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Service jobs form the core of the maintenance module. They track customer issues from reporting to resolution.
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border rounded-xl">
            <h4 className="font-bold text-sm text-[#001529] mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" /> Creation & Details
            </h4>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
              <li>Create jobs linked to a specific <strong>Customer</strong> and <strong>Product</strong>.</li>
              <li>Optionally assign a <strong>Technician</strong> immediately, or leave pending.</li>
              <li>Set <strong>Priority:</strong> <span className="font-semibold text-slate-500">Low</span>, <span className="font-semibold text-amber-500">Medium</span>, <span className="font-semibold text-orange-500">High</span>, or <span className="font-semibold text-red-500">Urgent</span>.</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-50 border rounded-xl">
            <h4 className="font-bold text-sm text-[#001529] mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" /> Status Flow
            </h4>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-24 font-bold text-slate-500 text-right">Pending</span>
                <span className="h-0.5 w-4 bg-slate-300"></span>
                <span>Job created, waiting for technician action.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-24 font-bold text-blue-500 text-right">In-Progress</span>
                <span className="h-0.5 w-4 bg-slate-300"></span>
                <span>Technician is actively working on the repair.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-24 font-bold text-amber-500 text-right">Awaiting-Spares</span>
                <span className="h-0.5 w-4 bg-slate-300"></span>
                <span>Work paused until parts arrive.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-24 font-bold text-emerald-500 text-right">Completed</span>
                <span className="h-0.5 w-4 bg-slate-300"></span>
                <span>Repair finished successfully.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-24 font-bold text-red-500 text-right">Cancelled</span>
                <span className="h-0.5 w-4 bg-slate-300"></span>
                <span>Job aborted.</span>
              </li>
            </ul>
            <div className="mt-3 text-[10px] uppercase font-bold tracking-wider text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Note: Status transitions are enforced sequentially and cannot be skipped.
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION: Technician Assignment */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <Users className="h-6 w-6 text-indigo-500" />
          Technician Assignment
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li>Managers or Admins assign a technician to a job from the staff directory.</li>
          <li>Reassignments are permitted during <strong>Pending</strong> or <strong>In-Progress</strong> states.</li>
          <li><strong>Locking mechanism:</strong> Cannot reassign technicians on jobs marked as <strong>Completed</strong> or <strong>Cancelled</strong>.</li>
        </ul>
      </section>

      {/* NEW SECTION: Branch Scoping */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#001529] flex items-center gap-2 mb-4">
          <MapPin className="h-6 w-6 text-rose-500" />
          Branch Scoping
        </h3>
        <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Staff Visibility:</strong> Service staff can only see jobs assigned to their local branch.</li>
          <li><strong>Admin Override:</strong> Admins can view jobs across all branches in the network.</li>
          <li><strong>Creation Context:</strong> When creating a job, it automatically uses the effective branch derived from the user's active session cookie.</li>
        </ul>
      </section>
    </div>
  )
}
