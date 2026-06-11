"use client"

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScrollableTableProps {
  children: React.ReactNode
  className?: string
  minWidth?: string
}

export function ScrollableTable({ children, className, minWidth = '860px' }: ScrollableTableProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const [thumb, setThumb] = useState({ width: 0, left: 0 })
  const [scrollable, setScrollable] = useState(false)

  const update = useCallback(() => {
    const el = areaRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const x = el.scrollLeft
    const canScroll = max > 4
    setScrollable(canScroll)
    setAtStart(x <= 4)
    setAtEnd(x >= max - 4)
    const railW = el.clientWidth
    const thumbW = Math.max(railW * (el.clientWidth / el.scrollWidth), 36)
    const travel = railW - thumbW
    setThumb({ width: thumbW, left: max > 0 ? (x / max) * travel : 0 })
  }, [])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update])

  return (
    <div className={cn("relative group/scroll", className)}>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-14 z-[2] transition-opacity duration-200 bg-gradient-to-l from-transparent to-white dark:to-slate-900"
        style={{ opacity: !atStart && scrollable ? 1 : 0 }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-14 z-[2] transition-opacity duration-200 bg-gradient-to-r from-transparent to-white dark:to-slate-900"
        style={{ opacity: !atEnd && scrollable ? 1 : 0 }}
      />
      <div
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 z-[3] w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg transition-opacity duration-200"
        style={{ opacity: !atEnd && scrollable ? 1 : 0 }}
      >
        <ChevronRight className="h-4 w-4" />
      </div>
      <div
        ref={areaRef}
        className="overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <div style={{ minWidth }}>
          {children}
        </div>
      </div>
      {scrollable && (
        <div className="px-3 pt-1.5 pb-2">
          <div className="relative h-[5px] bg-slate-100 dark:bg-white/5 rounded-full">
            <div
              className="absolute top-0 h-[5px] bg-slate-300 dark:bg-slate-600 group-hover/scroll:bg-slate-500 dark:group-hover/scroll:bg-slate-400 rounded-full transition-colors"
              style={{ width: `${thumb.width}px`, left: `${thumb.left}px` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
