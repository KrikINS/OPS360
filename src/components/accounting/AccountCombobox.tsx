'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronsUpDown } from 'lucide-react'

export interface AccountComboboxProps {
  accounts: Array<{
    code: string
    name: string
    type: string
  }> | null
  value: string
  onChange: (code: string, name: string) => void
  placeholder?: string
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    Asset: 'bg-blue-100 text-blue-800',
    Liability: 'bg-red-100 text-red-800',
    Equity: 'bg-green-100 text-green-800',
    Revenue: 'bg-emerald-100 text-emerald-800',
    Expense: 'bg-orange-100 text-orange-800',
    Tax: 'bg-purple-100 text-purple-800',
  }
  return map[type] ?? 'bg-slate-100 text-slate-600'
}

export function AccountCombobox({
  accounts,
  value,
  onChange,
  placeholder = 'Select account…'
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  if (!accounts) {
    // Loading state
    return (
      <div className="w-full flex items-center justify-between h-8 px-3 text-sm border rounded-md bg-slate-50 text-slate-400 cursor-not-allowed">
        <span>Loading...</span>
        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
      </div>
    )
  }

  const selected = accounts.find(a => a.code === value)

  const filtered = useMemo(() => {
    if (!search.trim()) return accounts
    const q = search.toLowerCase()
    return accounts.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q)
    )
  }, [accounts, search])

  const cashAccounts = filtered.filter(a =>
    a.code === '1010' || a.code.startsWith('1010-')
  )
  const otherAccounts = filtered.filter(a =>
    a.code !== '1010' && !a.code.startsWith('1010-')
  )

  const accountButton = (a: { code: string; name: string; type: string }) => (
    <button
      key={a.code}
      type="button"
      onClick={() => {
        onChange(a.code, `${a.code} — ${a.name}`)
        setOpen(false)
      }}
      className={`w-full flex items-center gap-2 px-3 py-2
        text-sm rounded-lg hover:bg-slate-100 transition-colors
        text-left ${value === a.code ? 'bg-indigo-50' : ''}`}
    >
      <Check className={`h-3 w-3 shrink-0 ${value === a.code ? 'opacity-100 text-indigo-600' : 'opacity-0'}`} />
      <span className="font-mono text-muted-foreground w-10 shrink-0">
        {a.code}
      </span>
      <span className="flex-1 truncate">{a.name}</span>
      <Badge variant="outline"
        className={`text-[10px] py-0 px-1 ${typeBadge(a.type)}`}>
        {a.type}
      </Badge>
    </button>
  )

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="w-full flex items-center justify-between h-8 px-3
          text-sm border rounded-md bg-white hover:bg-slate-50
          transition-colors text-left"
      >
        {selected
          ? <span
              className="truncate"
              title={`${selected.code} — ${selected.name}`}
            >
              <span className="font-mono mr-2 text-slate-500">{selected.code}</span>
              {selected.name}
            </span>
          : <span className="text-muted-foreground">{placeholder}</span>
        }
        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[320px] z-[60]
          bg-popover border rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code or name…"
              className="w-full text-xs px-2 py-1.5 border rounded outline-none
                focus:ring-1 focus:ring-indigo-300"
              autoFocus
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No account found.
              </p>
            ) : (
              <>
                {cashAccounts.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold
                      text-slate-400 uppercase tracking-widest
                      border-b border-slate-100 bg-slate-50/60">
                      Cash in Hand
                    </div>
                    {cashAccounts.map(accountButton)}
                  </>
                )}

                {cashAccounts.length > 0 && otherAccounts.length > 0 && (
                  <div className="my-1 border-t border-slate-100" />
                )}

                {otherAccounts.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold
                      text-slate-400 uppercase tracking-widest
                      border-b border-slate-100 bg-slate-50/60">
                      Chart of Accounts
                    </div>
                    {otherAccounts.map(accountButton)}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Click-outside handler */}
      {open && (
        <div
          className="fixed inset-0 z-[55]"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}
