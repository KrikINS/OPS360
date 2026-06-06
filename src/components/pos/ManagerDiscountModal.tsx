import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Lock, AlertCircle, Delete } from 'lucide-react'

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
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleConfirm = async (pinStr?: string) => {
    const pin = pinStr || digits.join('')
    if (pin.length < 4) {
      setError('4-digit PIN is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onConfirm(pin)
      setDigits(['', '', '', '']) // clear on success
    } catch (err: any) {
      setError(err.message || 'Invalid PIN')
      setDigits(['', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // Handle dialog open state change
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDigits(['', '', '', ''])
      setError('')
      onClose()
    }
  }

  // Handle keyboard input in the individual boxes
  const handleChange = (index: number, val: string) => {
    // Only allow numeric
    if (val && !/^\d$/.test(val)) return

    const newDigits = [...digits]
    newDigits[index] = val
    setDigits(newDigits)

    if (val && index < 3) {
      inputRefs.current[index + 1]?.focus()
    } else if (val && index === 3) {
      inputRefs.current[3]?.blur()
      handleConfirm(newDigits.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  // Number pad clicks
  const handlePadClick = (num: string) => {
    const firstEmpty = digits.findIndex(d => d === '')
    if (firstEmpty !== -1) {
      handleChange(firstEmpty, num)
    }
  }

  const handlePadBackspace = () => {
    const lastFilled = digits.findLastIndex(d => d !== '')
    if (lastFilled !== -1) {
      const newDigits = [...digits]
      newDigits[lastFilled] = ''
      setDigits(newDigits)
      inputRefs.current[lastFilled]?.focus()
    }
  }

  // Focus first empty box on mount/open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const firstEmpty = digits.findIndex(d => d === '')
        inputRefs.current[firstEmpty !== -1 ? firstEmpty : 0]?.focus()
      }, 100)
    }
  }, [isOpen, digits])

  const numpadNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]

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

        <div className="py-2 space-y-4">
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

          <div className="space-y-4 pt-2">
            <div className="flex justify-center gap-4">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-16 text-center text-3xl font-black rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              ))}
            </div>
            {error && (
              <div className="flex items-center justify-center gap-1.5 text-rose-500 text-xs font-bold animate-in shake">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Number Pad for Touch Terminals */}
          <div className="grid grid-cols-3 gap-2 px-8 pt-4">
            {numpadNumbers.map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 text-2xl font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 rounded-xl active:scale-95 transition-transform"
                onClick={() => handlePadClick(num.toString())}
              >
                {num}
              </Button>
            ))}
            <div /> {/* Empty space for bottom left */}
            <Button
              variant="outline"
              className="h-14 text-2xl font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 rounded-xl active:scale-95 transition-transform"
              onClick={() => handlePadClick('0')}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-14 text-2xl font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl active:scale-95 transition-transform"
              onClick={handlePadBackspace}
            >
              <Delete className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading} className="h-12 w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] h-12 w-full sm:w-auto text-sm font-bold tracking-wide" 
            onClick={() => handleConfirm()}
            disabled={loading || digits.some(d => d === '')}
          >
            {loading ? 'Verifying...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
