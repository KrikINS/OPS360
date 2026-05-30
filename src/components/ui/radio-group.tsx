"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.InputHTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, disabled, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn("grid gap-2", className)}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const radioItem = child as React.ReactElement<{ value: string; disabled?: boolean }>;
            return React.cloneElement(child, {
              checked: radioItem.props.value === value,
              onChange: () => !disabled && onValueChange?.(radioItem.props.value),
              disabled: disabled || radioItem.props.disabled,
            } as React.Attributes & Partial<typeof radioItem.props>)
          }
          return child
        })}
      </div>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, checked, onChange, disabled, ...props }, ref) => {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="radio"
          ref={ref}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            "h-4 w-4 appearance-none rounded-full border border-slate-300 bg-white checked:border-[5px] checked:border-[#001529] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#001529] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
