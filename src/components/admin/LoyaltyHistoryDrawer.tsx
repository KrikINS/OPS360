'use client'
import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Loader2, Star, Gift, Settings2, TrendingUp, TrendingDown } from 'lucide-react'
import { getCustomerLoyalty } from '@/actions/loyalty'
import { fmtINR } from '@/lib/utils'

type Transaction = {
  id: string
  type: string
  points: number
  balanceAfter: number
  description: string | null
  createdAt: Date | string | null
}

type LoyaltyData = {
  balance: number
  redemptionValue: number
  totalEarned: number
  totalRedeemed: number
  transactions: Transaction[]
  config: { pointsPerRupee: number; rupeesPerPoint: number }
}

interface LoyaltyHistoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string | null
  customerName: string | null
}

export function LoyaltyHistoryDrawer({
  open, onOpenChange, customerId, customerName,
}: LoyaltyHistoryDrawerProps) {
  const [data, setData]     = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open || !customerId) return
    setLoading(true)
    setData(null)
    setError(null)
    getCustomerLoyalty(customerId).then(result => {
      if (result.success) {
        setData(result as unknown as LoyaltyData)
      } else {
        setError(result.error ?? 'Failed to load loyalty data')
      }
      setLoading(false)
    })
  }, [open, customerId])

  const typeConfig = (type: string, points: number = 0) => {
    switch (type) {
      case 'earn':
        return { label: 'Earned', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', sign: '+', signColor: 'text-emerald-600' }
      case 'redeem':
        return { label: 'Redeemed', icon: TrendingDown, color: 'bg-amber-50 text-amber-700 border-amber-200', sign: '', signColor: 'text-amber-600' }
      case 'adjust':
        return { label: 'Adjusted', icon: Settings2, color: 'bg-blue-50 text-blue-700 border-blue-200', sign: points > 0 ? '+' : '', signColor: 'text-blue-600' }
      default:
        return { label: type, icon: Star, color: 'bg-slate-50 text-slate-600 border-slate-200', sign: '', signColor: 'text-slate-600' }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
              <Star className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-base font-black">Loyalty History</p>
              <p className="text-xs text-slate-500 font-normal">{customerName ?? 'Customer'}</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        )}

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="space-y-5 pt-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-1">Current Balance</p>
                <p className="text-2xl font-black text-purple-700">{data.balance} <span className="text-sm font-bold text-purple-400">pts</span></p>
                <p className="text-xs text-purple-500 mt-0.5">≈ {fmtINR(data.redemptionValue)} value</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Earn Rate</p>
                <p className="text-lg font-black text-slate-700">₹100 <span className="text-sm font-bold text-slate-400">= 1 pt</span></p>
                <p className="text-xs text-slate-400 mt-0.5">1 pt = {fmtINR(data.config.rupeesPerPoint)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Total Earned</p>
                <p className="text-xl font-black text-emerald-700">+{data.totalEarned} <span className="text-xs font-bold text-emerald-400">pts</span></p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Total Redeemed</p>
                <p className="text-xl font-black text-amber-700">{data.totalRedeemed} <span className="text-xs font-bold text-amber-400">pts</span></p>
              </div>
            </div>

            {/* Transaction history */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Transaction History ({data.transactions.length})
              </p>

              {data.transactions.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Gift className="h-10 w-10 mx-auto text-slate-200" />
                  <p className="text-sm text-slate-400">No loyalty transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.transactions.map(tx => {
                    const cfg = typeConfig(tx.type, tx.points)
                    const Icon = cfg.icon
                    return (
                      <div key={tx.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className={`p-1.5 rounded-lg border ${cfg.color} shrink-0 mt-0.5`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <Badge className={`text-[9px] font-black border px-1.5 py-0 ${cfg.color}`}>
                              {cfg.label}
                            </Badge>
                            <span className={`text-sm font-black tabular-nums ${cfg.signColor}`}>
                              {cfg.sign}{tx.points > 0 ? tx.points : Math.abs(tx.points)} pts
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 truncate">{tx.description ?? '—'}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-slate-400">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                            <p className="text-[10px] text-slate-400 tabular-nums">
                              Balance: <span className="font-bold text-purple-600">{tx.balanceAfter} pts</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
