"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Search, Receipt, User, Package, Truck, FileText, Wrench,
  Loader2, LayoutDashboard, ShoppingCart, BarChart3, Settings,
  Users, Boxes, ArrowRight,
} from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { globalSearchAction, type SearchHit } from "@/app/actions/search"
import { can, normalizeRole } from "@/lib/rbac"
import { useSession } from "next-auth/react"

// ── type meta ─────────────────────────────────────────────────────────────────
const TYPE_META: Record<SearchHit["type"], { label: string; Icon: React.ElementType; color: string }> = {
  invoice:  { label: "Invoices",     Icon: Receipt,   color: "text-blue-600" },
  customer: { label: "Customers",    Icon: User,      color: "text-emerald-600" },
  product:  { label: "Products",     Icon: Package,   color: "text-violet-600" },
  vendor:   { label: "Vendors",      Icon: Truck,     color: "text-orange-600" },
  po:       { label: "Purchase Orders", Icon: FileText, color: "text-amber-600" },
  job:      { label: "Service Jobs", Icon: Wrench,    color: "text-rose-600" },
}

// ── nav shortcuts (gated by capability) ───────────────────────────────────────
const NAV_LINKS = [
  { label: "POS Terminal",          href: "/pos",                          module: "sales",       icon: ShoppingCart },
  { label: "Sales Registry",        href: "/sales/hub",                    module: "sales",       icon: Receipt },
  { label: "Inventory Registry",    href: "/inventory/registry",           module: "inventory",   icon: Boxes },
  { label: "Product Master",        href: "/products",                     module: "inventory",   icon: Package },
  { label: "Transfer Control",      href: "/transfer",                     module: "inventory",   icon: ArrowRight },
  { label: "PO Registry",           href: "/procurement/po-registry",      module: "procurement", icon: FileText },
  { label: "Vendor Management",     href: "/vendors",                      module: "procurement", icon: Truck },
  { label: "Service Hub",           href: "/service",                      module: "service",     icon: Wrench },
  { label: "Finance Dashboard",     href: "/accounting?tab=dashboard",     module: "finance",     icon: BarChart3 },
  { label: "Reports",               href: "/reports",                      module: "finance",     icon: BarChart3 },
  { label: "Human Resources",       href: "/staff",                        module: "hr",          icon: Users },
  { label: "Admin Console",         href: "/admin",                        module: "admin",       icon: Settings },
] as const

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [hits, setHits] = React.useState<SearchHit[]>([])
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const role = normalizeRole(session?.user?.role)

  // ⌘K shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Debounced entity search
  React.useEffect(() => {
    if (search.trim().length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      const { hits } = await globalSearchAction(search)
      setHits(hits)
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const navigate = React.useCallback((href: string) => {
    setOpen(false)
    setSearch("")
    setHits([])
    router.push(href)
  }, [router])

  // Group hits by type
  const grouped = React.useMemo(() => {
    const map = new Map<SearchHit["type"], SearchHit[]>()
    for (const hit of hits) {
      if (!map.has(hit.type)) map.set(hit.type, [])
      map.get(hit.type)!.push(hit)
    }
    return map
  }, [hits])

  // Visible nav links filtered by role capability
  const navLinks = NAV_LINKS.filter(l => can(role, l.module as Parameters<typeof can>[1], "view"))

  const isSearching = search.trim().length >= 2

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline-block">Search records...</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white/60">
          <span>⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setSearch(""); setHits([]) } }}>
        <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search invoices, customers, products, vendors..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {/* Prompt */}
          {!loading && !isSearching && (
            <CommandEmpty>Type at least 2 characters to search records…</CommandEmpty>
          )}

          {/* No results */}
          {!loading && isSearching && hits.length === 0 && (
            <CommandEmpty>No matching records found.</CommandEmpty>
          )}

          {/* Entity results grouped by type */}
          {!loading && grouped.size > 0 && (
            <>
              {Array.from(grouped.entries()).map(([type, typeHits]) => {
                const { label, Icon, color } = TYPE_META[type]
                return (
                  <CommandGroup key={type} heading={label}>
                    {typeHits.map((hit) => (
                      <CommandItem
                        key={hit.id}
                        value={`${type}-${hit.id}-${hit.title}`}
                        onSelect={() => navigate(hit.href)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm truncate">{hit.title}</span>
                          {hit.subtitle && (
                            <span className="text-[11px] text-muted-foreground truncate">{hit.subtitle}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
              <CommandSeparator />
            </>
          )}

          {/* Go to… nav (always shown, role-filtered) */}
          {navLinks.length > 0 && (
            <CommandGroup heading="Go to…">
              {navLinks.map((link) => (
                <CommandItem
                  key={link.href}
                  value={`nav-${link.label}`}
                  onSelect={() => navigate(link.href)}
                  className="flex items-center gap-3 cursor-pointer text-muted-foreground"
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{link.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
