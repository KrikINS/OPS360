import { 
  ChevronRight, 
  ExternalLink 
} from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
  const modules = [
    {
      title: "Administration",
      desc: "System settings, ACM, user provisioning, password resets, branch registry, and company branding in one unified admin panel",
      href: "/docs/admin"
    },
    {
      title: "Branch Management",
      desc: "Configure destination stores, branch visibility, and local settings.",
      href: "/docs/branch-management"
    },
    {
      title: "Staff & HR",
      desc: "Tabbed HR dashboard with staff directory, clock in/out attendance, activity log, and offline staff registration",
      href: "/docs/staff"
    },
    {
      title: "Inventory Management",
      desc: "Opening stock import with branded Excel template, real-time registry, cumulative cost tracking, and serial number management",
      href: "/docs/inventory"
    },
    {
      title: "Procurement",
      desc: "Full PO lifecycle, partial GRN processing, auto-resolve discrepancies, vendor payments, and double-entry journal automation",
      href: "/docs/procurement"
    },
    {
      title: "Point of Sale",
      desc: "Checkout with line-item discounts, manager PIN approvals, loyalty points, B2B/B2C invoicing, and real-time cost capture",
      href: "/docs/pos"
    },
    {
      title: "Sales & Pricing",
      desc: "MRP-based pricing, customer registry with GSTIN, purchase history, and loyalty points system",
      href: "/docs/sales"
    },
    {
      title: "Transfer Control Center",
      desc: "Inter-branch stock requests, direct transfers, and Waybill receiving workflows.",
      href: "/docs/transfers"
    },
    {
      title: "Service & Maintenance",
      desc: "Service job creation, technician assignment, priority statuses, and resolution tracking.",
      href: "/docs/service"
    },
    {
      title: "Finance & Accounts",
      desc: "Automated double-entry journals, P&L, Balance Sheet, GST Summary, expenses, vendor payments, and margin reports",
      href: "/docs/accounting"
    },
    {
      title: "Compliance",
      desc: "Audit logs, regulatory reporting, and internal controls.",
      href: "/docs/compliance"
    },
    {
      title: "Analytics",
      desc: "Business intelligence, branch performance metrics, and sales dashboards.",
      href: "/docs/analytics"
    },
    {
      title: "Developer Guide",
      desc: "System architecture, API references, and development guidelines.",
      href: "/docs/developer-guide"
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#001529]">
          Welcome to Ops360 Documentation
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          The comprehensive manual for Ops360 operational workflows, 
          procurement protocols, and finance management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
        {modules.map((mod) => (
          <Link 
            key={mod.title}
            href={mod.href}
            className="group p-6 border rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl hover:border-[#7FD1E3] transition-all duration-300 flex flex-col h-full"
          >
            <h3 className="text-lg font-bold group-hover:text-[#001529] transition-colors">{mod.title}</h3>
            <p className="text-sm text-slate-500 mt-2 flex-grow">{mod.desc}</p>
            <div className="mt-6 flex items-center text-[#7FD1E3] font-semibold text-sm">
              Read Guide <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 p-6 rounded-xl bg-[#7FD1E3]/10 border border-[#7FD1E3]/20 flex items-start gap-4">
        <div className="bg-[#7FD1E3] p-2 rounded-lg text-white">
          <ExternalLink className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-[#001529]">Need faster help?</h4>
          <p className="text-sm text-slate-600 mt-1">If you can&apos;t find what you&apos;re looking for, contact the IT Support desk or reach out via Slack.</p>
        </div>
      </div>
    </div>
  )
}
