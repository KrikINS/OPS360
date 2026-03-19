"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

function Checkbox({ className, onCheckedChange, ...props }: React.ComponentProps<"input"> & { onCheckedChange?: (checked: boolean) => void }) {
  const [checked, setChecked] = React.useState(props.checked || props.defaultChecked || false)

  React.useEffect(() => {
    if (props.checked !== undefined) {
      setChecked(props.checked as boolean)
    }
  }, [props.checked])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked
    setChecked(isChecked)
    onCheckedChange?.(isChecked)
  }

  return (
    <div className="relative flex items-center">
      <input
        type="checkbox"
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-slate-200 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-white checked:bg-[#001529] checked:border-[#001529]",
          className
        )}
        onChange={handleChange}
        checked={checked}
        {...props}
      />
      <Check className="absolute h-3 w-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5" />
    </div>
  )
}

export { Checkbox }
