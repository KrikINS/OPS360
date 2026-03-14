import { 
  Code2, 
  Layout, 
  Terminal, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight
} from "lucide-react"

export default function DeveloperGuide() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#001529]">Developer Guide</h1>
        <p className="text-slate-500 mt-2">Engineering standards, UI patterns, and core system logic for Ops360.</p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3 flex items-center gap-2 text-blue-600">
          <Layout className="h-6 w-6" />
          Dashboard UI Standards
        </h2>
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            The Ops360 dashboard follows a strict visual language to ensure clarity across multi-role environments.
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Dynamic Titles:</strong> Dashboard headers must dynamically reflect the user&apos;s role (e.g., &quot;Admin Control Center&quot; vs &quot;Vendor Management Portal&quot;).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Constraint Safety:</strong> Always use the `asChild` prop on Radix-based components (like Tooltips and Buttons) to avoid hydration errors from nested button structures.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#001529] border-b pb-3 flex items-center gap-2 text-purple-600">
          <Code2 className="h-6 w-6" />
          Component Architecture
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-5 rounded-xl border bg-slate-50">
            <h4 className="font-bold text-[#001529] mb-2 text-sm flex items-center gap-2">
                <Terminal className="h-4 w-4 text-slate-400" />
                Styling (Tailwind + cn)
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Use the `cn()` utility for all conditional class merging. Maintain consistent border colors (`#002244`) and primary accents (`#7FD1E3`) in sidebar and header elements.
            </p>
          </div>
          <div className="p-5 rounded-xl border bg-slate-50">
            <h4 className="font-bold text-[#001529] mb-2 text-sm flex items-center gap-2">
                <Layout className="h-4 w-4 text-slate-400" />
                Iconography
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Standardize on **Lucide React**. Use consistent sizes (`h-4 w-4` for navigation, `h-6 w-6` for section headers). Ensure appropriate color weights for different statuses (emerald for active, amber for pending).
            </p>
          </div>
        </div>
      </section>

      <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-[#001529] flex items-start gap-5">
        <div className="bg-amber-400 p-3 rounded-xl">
          <AlertCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Hydration Logic Warning</h2>
          <p className="mt-1 text-slate-700 text-sm leading-relaxed">
            When implementing client-side state in layouts (like the Admin Sidebar logo), always wrap state-dependent rendering in `useEffect` or use a loading skeleton to prevent SSR mismatches.
          </p>
        </div>
      </div>
    </div>
  )
}
