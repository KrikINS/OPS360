import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { Feedback } from "@/components/docs/feedback"
import { 
  MapPin, 
  Info, 
  ChevronRight, 
  Settings
} from "lucide-react"

export default function BranchManagementDocs() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="hover:text-slate-600 cursor-pointer">Docs</span>
        <ChevronRight className="h-3 w-3" />
        <span className="hover:text-slate-600 cursor-pointer">Administration</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#001529]">Branch Management</span>
      </nav>

      <section className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">
          Branch Management & Store Setup
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Configure physical storage locations and retail outlets to ensure accurate inventory distribution across the Ops360 network.
        </p>
      </section>

      {/* Admin Privilege Note */}
      <div className="p-6 rounded-2xl bg-[#001529] text-white flex items-start gap-5 overflow-hidden relative group">
        <div className="bg-[#7FD1E3] p-3 rounded-xl transform rotate-3 transition-transform group-hover:rotate-0">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div className="relative z-10">
          <h2 className="text-lg font-bold">Admin Only Access</h2>
          <p className="mt-1 text-slate-300 text-sm leading-relaxed">
            Branch management is restricted to users with the <span className="text-[#7FD1E3] font-bold italic">&apos;admin&apos;</span> role. Changes to branches immediately affect dropdowns in Procurement and Stock Transfer modules.
          </p>
        </div>
      </div>

      {/* How to Add Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3">Defining Your Store Network</h2>
        <p className="text-slate-600">To manage your branches, navigate to <span className="font-semibold text-[#001529]">Admin &gt; Company Branding</span>. The Branch Management section is located at the bottom of the page.</p>
        
        <Accordion className="w-full space-y-3">
          <AccordionItem value="item-1" className="border rounded-xl px-4 bg-slate-50/50">
            <AccordionTrigger className="hover:no-underline py-4 text-left">
              <div className="flex items-center gap-4">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-bold text-[#001529]">Creating a New Branch</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Focus: Destination Identification</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2 text-slate-600 leading-relaxed border-t mt-2">
              <ol className="list-decimal pl-5 space-y-3">
                <li>Enter the <span className="font-semibold text-[#001529]">Branch Name</span> (e.g., &quot;South Delhi Warehouse&quot;).</li>
                <li>Click <span className="font-semibold text-[#001529]">Add Branch</span>.</li>
                <li>The system automatically assigns a unique ID and sets a default location and type to ensure compatibility with inventory protocols.</li>
              </ol>

              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-4">
                <Info className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="text-sm text-amber-900">
                  <h4 className="font-bold">Important Note on Default Values</h4>
                  <p className="mt-1 font-medium italic opacity-80">&quot;New branches are currently initialized with &apos;Kerala&apos; as the location and &apos;Main&apos; as the type. This is to maintain strict database compliance while we roll out custom geography settings.&quot;</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border rounded-xl px-4 bg-slate-50/50">
            <AccordionTrigger className="hover:no-underline py-4 text-left">
              <div className="flex items-center gap-4">
                <Settings className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-bold text-[#001529]">Operational Roles</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Focus: Modular Utility</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2 text-slate-600 leading-relaxed border-t mt-2">
              <p>Branches are used across three main pillars of Ops360:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li><span className="font-semibold">Procurement:</span> Used as &apos;Destination Stores&apos; for Purchase Orders.</li>
                <li><span className="font-semibold">Inventory:</span> Every serialized unit is tagged with a Branch ID for real-time tracking.</li>
                <li><span className="font-semibold">Staff:</span> Users are assigned to a home branch to filter their dashboards and POS access.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3">Troubleshooting</h2>
        <div className="p-4 bg-slate-50 border rounded-xl space-y-3 text-sm">
          <p className="font-medium text-[#001529]">I added a branch but it&apos;s not appearing in the Procurement dropdown.</p>
          <p className="text-slate-600">Ensure the page is refreshed. If it still doesn&apos;t appear, ask your system administrator to verify that the <span className="font-mono text-[11px] bg-slate-200 px-1 rounded">ON CONFLICT</span> seed logic has been executed to synchronize the database schema.</p>
        </div>
      </section>

      <Feedback />
    </div>
  )
}
