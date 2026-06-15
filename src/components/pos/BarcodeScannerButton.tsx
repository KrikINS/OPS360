"use client"

import { useState } from "react"
import { ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CameraScanner } from "@/components/shared/CameraScanner"
import { usePos } from "@/context/PosContext"

export function BarcodeScannerButton() {
  const { addToCartBySerial, setToast } = usePos()
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsScannerOpen(true)}
        className="h-11 px-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all shrink-0 shadow-none"
        variant="ghost"
      >
        <ScanLine className="h-5 w-5" />
      </Button>
      {isScannerOpen && (
        <CameraScanner
          onScan={async (serial) => {
            const result = await addToCartBySerial(serial)
            const toastMap: Record<string, { message: string; type: 'success' | 'error' }> = {
              added:        { message: `Added: ${serial}`, type: 'success' },
              duplicate:    { message: `Already in cart: ${serial}`, type: 'error' },
              not_found:    { message: `Serial not found: ${serial}`, type: 'error' },
              unavailable:  { message: `Unit not available: ${serial}`, type: 'error' },
              wrong_branch: { message: `Serial not at this branch`, type: 'error' },
              no_branch:    { message: `No branch selected`, type: 'error' },
            }
            setToast(toastMap[result])
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </>
  )
}
