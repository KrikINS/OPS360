import { 
  Building2, 
  FolderTree, 
  Users, 
  ImageIcon, 
  ShieldCheck, 
  ChevronRight 
} from "lucide-react"

export default function AdminDocs() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Administration Center</h1>
        <p className="text-slate-500 mt-2">Governance, system configuration, and organizational structure management.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Registry */}
        <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#001529]">Organization Registry</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Manage the geographical and operational structure of the business.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Branches:</strong> Individual retail or service locations.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Distribution Centers:</strong> Central hubs for inventory storage.</span>
            </li>
          </ul>
        </div>

        {/* Global Masters */}
        <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <FolderTree className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#001529]">Global Masters</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Centralized data repository for system-wide standardization.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Brands:</strong> Master list of authorized appliance brands.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Categories:</strong> Hierarchical product categorization.</span>
            </li>
          </ul>
        </div>

        {/* User Management */}
        <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#001529]">User Management</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Access control and staff account administration.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Roles:</strong> Admin, Manager, Sales, and Staff permissions.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Security:</strong> Password resets and profile activations.</span>
            </li>
          </ul>
        </div>

        {/* Company Branding */}
        <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#001529]">Company Branding</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Customize the visual appearance of the Ops360 ERP.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Logo:</strong> Dynamic logo updates across all modules.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#7FD1E3] shrink-0 mt-0.5" />
              <span><strong>Identity:</strong> System-wide name and tagline settings.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Security Notice */}
      <div className="p-6 rounded-2xl bg-[#001529] text-white flex items-start gap-5">
        <div className="bg-[#7FD1E3] p-3 rounded-xl">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Administrative Guardrails</h2>
          <p className="mt-1 text-slate-300 text-sm leading-relaxed">
            All administrative actions are logged in the system audit trail. Access to the Admin Center is restricted to users with the <span className="text-[#7FD1E3] font-bold">&apos;admin&apos;</span> role.
          </p>
        </div>
      </div>
    </div>
  )
}
