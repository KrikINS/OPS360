"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.ComponentProps<"button"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({ className, checked, onCheckedChange, disabled, ...props }: SwitchProps) {
  const [internalChecked, setInternalChecked] = React.useState(checked || false)

  React.useEffect(() => {
    setInternalChecked(checked || false)
  }, [checked])

  const handleToggle = () => {
    if (disabled) return
    const next = !internalChecked
    setInternalChecked(next)
    onCheckedChange?.(next)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={internalChecked ? "true" : "false"}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        internalChecked ? "bg-[#001529]" : "bg-slate-200",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
          internalChecked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

export { Switch }
