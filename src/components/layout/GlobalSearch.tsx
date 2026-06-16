"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    setSearch("")
    command()
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline-block">Search modules...</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white/60">
          <span>⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={(val) => {
        setOpen(val)
        if (!val) setSearch("")
      }}>
        <Command>
          <CommandInput 
            placeholder="Type a command or search..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{search.length > 0 ? "No results found." : "Start typing to search..."}</CommandEmpty>
            {search.length > 0 && (
              <>
                <CommandGroup heading="Inventory">
                  <CommandItem onSelect={() => runCommand(() => router.push("/inventory/registry"))}>Inventory Registry</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/products"))}>Product Master</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/transfer"))}>Transfer Control Center</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/inventory/alerts"))}>Stock Alerts</CommandItem>
                </CommandGroup>
                <CommandGroup heading="Procurement">
                  <CommandItem onSelect={() => runCommand(() => router.push("/procurement/po-registry"))}>PO Registry</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/procurement/po-registry?tab=pending"))}>GRN Registry (Pending)</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/procurement/po-registry?tab=audit"))}>3-WAY Match Audit</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/procurement/po-registry?tab=discrepancies"))}>Discrepancy Report</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/procurement/po-registry?tab=payments"))}>Payments Ledger</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/vendors"))}>Vendor Management</CommandItem>
                </CommandGroup>
                <CommandGroup heading="Sales & POS">
                  <CommandItem onSelect={() => runCommand(() => router.push("/sales/hub"))}>Sales Registry</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/sales/customers"))}>Customer Management</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/sales/credit"))}>Accounts Receivable</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/pos"))}>POS Terminal</CommandItem>
                </CommandGroup>
                <CommandGroup heading="Service & Support">
                  <CommandItem onSelect={() => runCommand(() => router.push("/service"))}>Job Card / Work Orders</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/service/warranty"))}>Warranty Management</CommandItem>
                </CommandGroup>
                <CommandGroup heading="System & Finance">
                  <CommandItem onSelect={() => runCommand(() => router.push("/accounting?tab=dashboard"))}>Finance Dashboard</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/admin"))}>Admin Console</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/reports"))}>Reports</CommandItem>
                  <CommandItem onSelect={() => runCommand(() => router.push("/staff"))}>Human Resources</CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
