'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollableTable } from '@/components/ui/scrollable-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BookOpen, Plus, Search, X, Loader2, Shield } from 'lucide-react'
import { getChartOfAccounts, createAccount, toggleAccountStatus } from '@/actions/finance'

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']

const TYPE_COLORS: Record<string, string> = {
  Asset:     'bg-blue-50 text-blue-700 border-blue-200',
  Liability: 'bg-red-50 text-red-700 border-red-200',
  Equity:    'bg-purple-50 text-purple-700 border-purple-200',
  Revenue:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  Expense:   'bg-amber-50 text-amber-700 border-amber-200',
}

type Account = {
  id: string; code: string; name: string; type: string
  is_system: boolean | null; is_active: boolean | null; parent_id: string | null
}

export default function ChartOfAccountsPage() {
  const [accountList, setAccountList]   = useState<Account[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [typeFilter, setTypeFilter]     = useState<string>('all')
  const [showForm, setShowForm]         = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [toggling, setToggling]         = useState<Record<string, boolean>>({})
  const [toast, setToast]               = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm]                 = useState({ code: '', name: '', type: 'Asset', parentId: '' })

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getChartOfAccounts()
    if (result.success) setAccountList(result.accounts as Account[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.type) {
      showToast('error', 'Code, name and type are required')
      return
    }
    setSubmitting(true)
    const result = await createAccount({
      code: form.code, name: form.name, type: form.type,
      parentId: form.parentId || undefined,
    })
    setSubmitting(false)
    if (result.success) {
      showToast('success', `Account ${form.code} — ${form.name} created`)
      setShowForm(false)
      setForm({ code: '', name: '', type: 'Asset', parentId: '' })
      load()
    } else {
      showToast('error', result.error ?? 'Failed to create account')
    }
  }

  const handleToggle = async (id: string, current: boolean | null) => {
    setToggling(p => ({ ...p, [id]: true }))
    const result = await toggleAccountStatus(id, !current)
    setToggling(p => ({ ...p, [id]: false }))
    if (result.success) load()
    else showToast('error', result.error ?? 'Failed to update')
  }

  const filtered = accountList.filter(a => {
    const matchSearch = !search || a.code.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || a.type === typeFilter
    return matchSearch && matchType
  })

  // Group by type for summary
  const summary = ACCOUNT_TYPES.reduce((acc, t) => {
    acc[t] = accountList.filter(a => a.type === t).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#001529]/10 rounded-xl text-[#001529] border border-[#001529]/20">
            <BookOpen className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Chart of Accounts</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">
              Account Master — {accountList.length} accounts
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#001529] hover:bg-[#002545] text-white gap-2 h-10">
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`px-4 py-3 rounded-lg text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.message}
        </div>
      )}

      {/* Type Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        {ACCOUNT_TYPES.map(t => (
          <Card key={t} className={`cursor-pointer transition-all ${typeFilter === t ? 'ring-2 ring-[#001529]' : 'hover:shadow-md'}`}
            onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-black">{summary[t] ?? 0}</p>
              <Badge className={`text-[9px] font-bold mt-1 border ${TYPE_COLORS[t]}`}>{t}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by code or name..." className="pl-10 h-10"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={typeFilter === 'all' ? 'default' : 'outline'}
            className={typeFilter === 'all' ? 'bg-[#001529] h-10' : 'h-10'}
            onClick={() => setTypeFilter('all')}>All</Button>
          {ACCOUNT_TYPES.map(t => (
            <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'}
              className={`h-10 ${typeFilter === t ? 'bg-[#001529]' : ''}`}
              onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}>{t}</Button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader className="bg-muted/30 border-b py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4" />
            {typeFilter === 'all' ? 'All Accounts' : `${typeFilter} Accounts`} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
          ) : (
            <ScrollableTable minWidth="700px">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold w-24">Code</TableHead>
                    <TableHead className="font-bold">Account Name</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold text-center">System</TableHead>
                    <TableHead className="font-bold text-center">Status</TableHead>
                    <TableHead className="font-bold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(account => (
                    <TableRow key={account.id} className={!account.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm font-bold text-slate-700">{account.code}</TableCell>
                      <TableCell className="font-medium text-sm">{account.name}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-bold border ${TYPE_COLORS[account.type] ?? ''}`}>
                          {account.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {account.is_system
                          ? <span title="System account" className="flex justify-center"><Shield className="h-4 w-4 text-slate-400" /></span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] font-bold border ${account.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!account.is_system && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            disabled={toggling[account.id]}
                            onClick={() => handleToggle(account.id, account.is_active)}>
                            {toggling[account.id]
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : account.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">No accounts found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Add Account</h2>
                <p className="text-sm text-slate-500">Create a new Chart of Accounts entry</p>
              </div>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Account Code *</Label>
              <Input placeholder="e.g. 1100" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="h-9" />
              <p className="text-[10px] text-slate-400">Use a unique numeric code following your COA numbering</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Account Name *</Label>
              <Input placeholder="e.g. Petty Cash — Branch 2" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Account Type *</Label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full h-9 border rounded-lg px-3 text-sm bg-white">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <p className="text-[10px] text-slate-400">
                Asset · Liability · Equity · Revenue · Expense
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide">Parent Account (optional)</Label>
              <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                className="w-full h-9 border rounded-lg px-3 text-sm bg-white">
                <option value="">— No parent (top level) —</option>
                {accountList.filter(a => a.type === form.type).map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#001529] hover:bg-[#002545] text-white"
                onClick={handleCreate} disabled={submitting || !form.code || !form.name}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Create Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
