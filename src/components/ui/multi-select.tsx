"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full", className)}>
          <div
            className={cn(
              "flex min-h-[40px] w-full flex-wrap items-center justify-between gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer",
              open && "ring-2 ring-ring ring-offset-2"
            )}
          >
        <div className="flex flex-wrap gap-1">
          {selected.length > 0 ? (
            selected.map((item) => (
              <Badge
                variant="secondary"
                key={item}
                className="font-medium bg-slate-100 text-slate-900 border-slate-200"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUnselect(item)
                }}
              >
                {options.find((o) => o.value === item)?.label || item}
                <X 
                  className="ml-1 h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUnselect(item)
                  }}
                />
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
        </div>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-1 shadow-md" 
        align="start"
      >
        <div className="max-h-60 w-full overflow-auto">
          <div className="sticky top-0 z-10 bg-popover pb-1">
            <div className="flex items-center border-b px-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 border-none focus-visible:ring-0"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="mt-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No item found.</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                      isSelected && "font-bold"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange(
                        isSelected
                          ? selected.filter((item) => item !== option.value)
                          : [...selected, option.value]
                      )
                    }}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {isSelected && <Check className="h-4 w-4" />}
                    </span>
                    {option.label}
                  </div>
                )
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="sticky bottom-0 bg-popover border-t p-1 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs font-bold uppercase tracking-widest h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
