import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { adjustPoints } from '@/actions/loyalty'

export function LoyaltyAdjustModal({ open, onOpenChange, customer, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, customer: any, onSuccess: () => void }) {
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!points || !reason) return
    setLoading(true)
    setError(null)
    const res = await adjustPoints({
      customerId: customer.id,
      points: Number(points),
      reason
    })
    setLoading(false)
    if (res.success) {
      onSuccess()
      onOpenChange(false)
      setPoints('')
      setReason('')
    } else {
      setError(res.error || 'Failed to adjust points')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-widest text-slate-900">Adjust Loyalty Points</DialogTitle>
          <p className="text-xs font-bold text-slate-500">For {customer?.full_name}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Points Adjustment (Use negative to deduct)</Label>
            <Input
              type="number"
              required
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 100 or -50"
              className="font-mono text-lg font-black"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reason</Label>
            <Textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for adjustment"
              className="resize-none"
            />
          </div>
          {error && <div className="text-xs font-bold text-rose-500 bg-rose-50 p-2 rounded">{error}</div>}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
