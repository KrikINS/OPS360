import { Wrench, ShieldPlus, Clock } from "lucide-react"

export default function ServiceDocs() {
  return (
    <div className="space-y-8 pb-12">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Service & Maintenance</h1>
        <p className="text-slate-500 mt-2">Track service requests, maintenance schedules, and customer support.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Lifecycle */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <Wrench className="h-5 w-5 text-blue-600" />
            Product Support Lifecycle
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2"><strong>Intake:</strong> Log customer complaints and appliance symptoms.</li>
            <li className="flex gap-2"><strong>Diagnosis:</strong> Expert review and part requirement estimation.</li>
            <li className="flex gap-2"><strong>Resolution:</strong> Repair completion and customer handover.</li>
          </ul>
        </div>

        {/* Warranty & AMC */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#001529] flex items-center gap-2 mb-4">
            <ShieldPlus className="h-5 w-5 text-emerald-600" />
            Warranty Management
          </h3>
          <p className="text-sm text-slate-600">
            Automated tracking of manufacturer warranties and Annual Maintenance Contracts (AMC).
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border rounded-2xl p-8 text-center">
        <Clock className="h-8 w-8 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900">Advanced Scheduling Coming Soon</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">
          We are currently integrating real-time technician scheduling and part-inventory linking.
        </p>
      </div>
    </div>
  )
}
