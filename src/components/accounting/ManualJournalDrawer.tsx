'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Trash2, Loader2, Check, ChevronsUpDown,
  AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { fmtINR } from '@/lib/utils'
import { getActiveAccounts, createManualJournal } from '@/actions/finance'

// ── Types ──────────────────────────────────────────

type Account = {
  id: string
  code: string
  name: string
  type: string
}

type JournalLine = {
  id: string
  accountCode: string
  accountLabel: string
  debit: string
  credit: string
  description: string
}

const EMPTY_LINE = (): JournalLine => ({
  id: crypto.randomUUID(),
  accountCode: '',
  accountLabel: '',
  debit: '',
  credit: '',
  description: '',
})

// ── Type badge colors ──────────────────────────────

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

// ── Account Combobox ────────────────────────────────

function AccountCombobox({
  accounts,
  value,
  onSelect,
}: {
  accounts: Account[]
  value: string
  onSelect: (code: string, label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="w-full flex items-center justify-between h-8 px-2.5
          text-xs border rounded-md bg-white hover:bg-slate-50
          transition-colors text-left"
      >
        {selected
          ? <span className="truncate">{selected.code} — {selected.name}</span>
          : <span className="text-muted-foreground">Select account…</span>
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
          <div className="max-h-[240px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No account found.
              </p>
            ) : (
              filtered.map(a => (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => {
                    onSelect(a.code, `${a.code} — ${a.name}`)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5
                    text-xs rounded hover:bg-slate-100 transition-colors
                    text-left ${value === a.code ? 'bg-indigo-50' : ''}`}
                >
                  <Check className={`h-3 w-3 shrink-0 ${value === a.code ? 'opacity-100 text-indigo-600' : 'opacity-0'
                    }`} />
                  <span className="font-mono text-muted-foreground w-10 shrink-0">
                    {a.code}
                  </span>
                  <span className="flex-1 truncate">{a.name}</span>
                  <Badge variant="outline"
                    className={`text-[10px] py-0 px-1 ${typeBadge(a.type)}`}>
                    {a.type}
                  </Badge>
                </button>
              ))
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

// ── Main Drawer Component ───────────────────────────

export default function ManualJournalDrawer({
  open,
  onOpenChange,
  branchId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: string | null
  onSuccess: () => void
}) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const loadingAccounts = open && accounts === null
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [narration, setNarration] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([EMPTY_LINE(), EMPTY_LINE()])

  // Fetch accounts when drawer opens
  useEffect(() => {
    let active = true
    if (open && accounts === null) {
      getActiveAccounts().then(res => {
        if (active) {
          setAccounts(res.success ? res.accounts : [])
        }
      })
    }
    return () => { active = false }
  }, [open, accounts])

  // Dismiss toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Reset form
  const resetForm = useCallback(() => {
    setDate(new Date().toISOString().split('T')[0])
    setNarration('')
    setLines([EMPTY_LINE(), EMPTY_LINE()])
    setToast(null)
  }, [])

  // Line operations
  const addLine = () => setLines(prev => [...prev, EMPTY_LINE()])

  const removeLine = (id: string) => {
    setLines(prev => prev.length > 2 ? prev.filter(l => l.id !== id) : prev)
  }

  const updateLine = (id: string, field: keyof JournalLine, value: string) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l

      // If user enters debit, clear credit and vice versa
      if (field === 'debit' && value) {
        return { ...l, debit: value, credit: '' }
      }
      if (field === 'credit' && value) {
        return { ...l, credit: value, debit: '' }
      }

      return { ...l, [field]: value }
    }))
  }

  const setLineAccount = (id: string, code: string, label: string) => {
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, accountCode: code, accountLabel: label } : l
    ))
  }

  // Totals
  const totals = useMemo(() => {
    const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
    const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
    return { totalDebits, totalCredits }
  }, [lines])

  const isBalanced = Math.abs(totals.totalDebits - totals.totalCredits) < 0.01
  const hasAmount = totals.totalDebits > 0
  const hasMinLines = lines.filter(l => l.accountCode).length >= 2
  const hasNarration = narration.trim().length > 0
  const canSubmit = isBalanced && hasAmount && hasMinLines && hasNarration && !submitting

  // Submit
  const handleSubmit = async () => {
    if (!canSubmit || !branchId) return
    setSubmitting(true)

    const journalLines = lines
      .filter(l => l.accountCode && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map(l => ({
        accountCode: l.accountCode,
        debit: parseFloat(l.debit) || undefined,
        credit: parseFloat(l.credit) || undefined,
        description: l.description || undefined,
      }))

    const result = await createManualJournal({
      date,
      description: narration,
      branchId,
      lines: journalLines,
    })

    setSubmitting(false)

    if (result.success) {
      setToast({ type: 'success', message: 'Journal entry posted successfully' })
      setTimeout(() => {
        resetForm()
        onOpenChange(false)
        onSuccess()
      }, 1200)
    } else {
      setToast({ type: 'error', message: result.error ?? 'Failed to post journal entry' })
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) resetForm()
      onOpenChange(o)
    }}>
      <SheetContent
        side="right"
        className="sm:max-w-[50vw] w-full flex flex-col p-0"
        showCloseButton={true}
      >
        {/* ── Header ───────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/80">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Plus className="h-4 w-4 text-indigo-600" />
            </div>
            Post Manual Journal Entry
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Record opening balances, adjustments, or correcting entries.
            Debits must equal credits.
          </SheetDescription>
        </SheetHeader>

        {/* ── Scrollable body ──────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Toast */}
          {toast && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm
              ${toast.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
              {toast.type === 'success'
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertTriangle className="h-4 w-4 shrink-0" />
              }
              {toast.message}
            </div>
          )}

          {/* Date + Narration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">
                Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">
                Narration / Description
              </Label>
              <Textarea
                value={narration}
                onChange={e => setNarration(e.target.value)}
                placeholder="e.g. Opening Balance — Cash in Hand"
                className="text-xs min-h-[36px] max-h-[72px] resize-none"
                rows={1}
              />
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-3 px-2">
            <span className="col-span-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Account
            </span>
            <span className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right px-2">
              Debit (₹)
            </span>
            <span className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right px-2">
              Credit (₹)
            </span>
            <span className="col-span-1" />
          </div>

          {/* Line items */}
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading Chart of Accounts…
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div
                  key={line.id}
                  className="grid grid-cols-12 gap-3 items-start
                    p-2.5 rounded-lg border border-slate-200 bg-white
                    hover:border-slate-300 transition-colors group"
                >
                  {/* Account selector */}
                  <div className="col-span-5 space-y-1">
                    <AccountCombobox
                      accounts={accounts || []}
                      value={line.accountCode}
                      onSelect={(code, label) => setLineAccount(line.id, code, label)}
                    />
                    <Input
                      value={line.description}
                      onChange={e => updateLine(line.id, 'description', e.target.value)}
                      placeholder="Line memo (optional)"
                      className="h-6 text-[10px] border-dashed text-muted-foreground"
                    />
                  </div>

                  {/* Debit */}
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={e => updateLine(line.id, 'debit', e.target.value)}
                      placeholder="0.00"
                      className={`h-8 text-xs text-right font-mono w-full
                        ${line.debit ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold' : ''}`}
                    />
                  </div>

                  {/* Credit */}
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={e => updateLine(line.id, 'credit', e.target.value)}
                      placeholder="0.00"
                      className={`h-8 text-xs text-right font-mono w-full
                        ${line.credit ? 'bg-green-50 border-green-200 text-green-800 font-semibold' : ''}`}
                    />
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity
                        text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 2}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add line button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addLine}
            className="w-full border-dashed text-xs text-slate-500
              hover:text-indigo-600 hover:border-indigo-300"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Line
          </Button>
        </div>

        {/* ── Sticky footer ────────────────────────── */}
        <SheetFooter className="border-t bg-slate-50/80 px-6 py-4 space-y-3">
          {/* Totals row */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <span className="col-span-5 text-xs font-bold text-slate-700 uppercase tracking-widest">
              Totals
            </span>
            <div className={`col-span-3 text-xs font-bold text-right font-mono px-2 py-1.5 rounded
              ${isBalanced && hasAmount
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
              }`}>
              {fmtINR(totals.totalDebits)}
            </div>
            <div className={`col-span-3 text-xs font-bold text-right font-mono px-2 py-1.5 rounded
              ${isBalanced && hasAmount
                ? 'bg-green-100 text-green-800'
                : 'bg-green-50 text-green-700'
              }`}>
              {fmtINR(totals.totalCredits)}
            </div>
            <div className="col-span-1 flex items-center justify-center">
              {isBalanced && hasAmount ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : hasAmount ? (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              ) : null}
            </div>
          </div>

          {/* Variance indicator */}
          {hasAmount && !isBalanced && (
            <p className="text-[11px] text-orange-600 text-center">
              Out of balance by {fmtINR(Math.abs(totals.totalDebits - totals.totalCredits))}
            </p>
          )}

          {/* Validation checklist */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground justify-center">
            <span className={hasNarration ? 'text-green-600' : ''}>
              {hasNarration ? '✓' : '○'} Narration
            </span>
            <span className={hasMinLines ? 'text-green-600' : ''}>
              {hasMinLines ? '✓' : '○'} 2+ accounts
            </span>
            <span className={isBalanced && hasAmount ? 'text-green-600' : ''}>
              {isBalanced && hasAmount ? '✓' : '○'} DR = CR
            </span>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white
              font-semibold text-sm gap-2 h-10"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Post Journal Entry
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
