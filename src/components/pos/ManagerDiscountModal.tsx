import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, AlertCircle } from 'lucide-react'

interface ManagerDiscountModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (pin: string) => Promise<void>
  productName: string
  requestedPct: number
  maxAllowedPct: number
}

export function ManagerDiscountModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  requestedPct,
  maxAllowedPct
}: ManagerDiscountModalProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!pin) {
      setError('PIN is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onConfirm(pin)
      setPin('') // clear on success
    } catch (err: any) {
      setError(err.message || 'Invalid PIN')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  // Handle dialog open state change (especially when closing via Esc or clicking outside)
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPin('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Manager Approval Required
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                Discount exceeds limits.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Product</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate ml-4">{productName}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Auto-Approval Limit</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{maxAllowedPct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Requested Discount</span>
              <span className="font-black text-rose-600 dark:text-rose-400">{requestedPct}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Enter Manager PIN
            </label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••"
              maxLength={6}
              className="text-center tracking-[0.5em] font-black text-lg h-12"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-1.5 text-rose-500 text-xs font-bold mt-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" 
            onClick={handleConfirm}
            disabled={loading || !pin}
          >
            {loading ? 'Verifying...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
