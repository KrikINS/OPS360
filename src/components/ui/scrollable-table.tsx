"use client"

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScrollableTableProps {
  children: React.ReactNode
  className?: string
  minWidth?: string
  maxHeight?: string
}

export function ScrollableTable({ children, className, minWidth = '100%', maxHeight }: ScrollableTableProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const [thumb, setThumb] = useState({ width: 0, left: 0 })
  const [scrollable, setScrollable] = useState(false)
  const dragRef = useRef<{ active: boolean; startX: number; startLeft: number }>({ active: false, startX: 0, startLeft: 0 })

  const update = useCallback(() => {
    const el = areaRef.current
    const rail = railRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const x = el.scrollLeft
    const canScroll = max > 4
    setScrollable(canScroll)
    setAtStart(x <= 4)
    setAtEnd(x >= max - 4)
    if (canScroll && rail) {
      const railW = rail.clientWidth
      const thumbW = Math.max(railW * (el.clientWidth / el.scrollWidth), 36)
      const travel = railW - thumbW
      setThumb({ width: thumbW, left: max > 0 ? (x / max) * travel : 0 })
    }
  }, [])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const inner = el.firstElementChild
    if (inner) ro.observe(inner)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update])

  const scrollByStep = (dir: 1 | -1) => {
    const el = areaRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: 'smooth' })
  }

  const onRailMouseDown = (e: React.MouseEvent) => {
    const el = areaRef.current
    const rail = railRef.current
    if (!el || !rail || e.target !== rail) return
    const r = rail.getBoundingClientRect()
    const p = (e.clientX - r.left - thumb.width / 2) / (r.width - thumb.width)
    el.scrollLeft = Math.max(0, Math.min(1, p)) * (el.scrollWidth - el.clientWidth)
  }

  const onThumbMouseDown = (e: React.MouseEvent) => {
    const el = areaRef.current
    if (!el) return
    dragRef.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft }
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = areaRef.current
      const rail = railRef.current
      if (!dragRef.current.active || !el || !rail) return
      const railW = rail.clientWidth
      const max = el.scrollWidth - el.clientWidth
      el.scrollLeft = dragRef.current.startLeft + ((e.clientX - dragRef.current.startX) / (railW - thumb.width)) * max
    }
    const onUp = () => { dragRef.current.active = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [thumb.width])

  return (
    <div className={cn("relative group/scroll", className)}>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-12 z-[2] transition-opacity duration-200 bg-gradient-to-l from-transparent to-white dark:to-slate-900"
        style={{ opacity: !atStart && scrollable ? 1 : 0 }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 z-[2] transition-opacity duration-200 bg-gradient-to-r from-transparent to-white dark:to-slate-900"
        style={{ opacity: !atEnd && scrollable ? 1 : 0 }}
      />

      {scrollable && !atStart && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByStep(-1)}
          className="absolute top-1/2 left-2 -translate-y-1/2 z-[30] w-7 h-7 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm opacity-50 group-hover/scroll:opacity-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-opacity duration-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {scrollable && !atEnd && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByStep(1)}
          className="absolute top-1/2 right-2 -translate-y-1/2 z-[30] w-7 h-7 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center shadow-sm opacity-50 group-hover/scroll:opacity-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-opacity duration-200"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        ref={areaRef}
        className={cn("overflow-x-auto", maxHeight ? "overflow-y-auto" : "")}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxHeight: maxHeight || undefined } as React.CSSProperties}
      >
        <div style={{ width: 'max-content', minWidth }}>
          {children}
        </div>
      </div>

      {scrollable && (
        <div className="px-3 pt-1.5 pb-2">
          <div
            ref={railRef}
            onMouseDown={onRailMouseDown}
            className="relative h-1.5 bg-slate-100 dark:bg-white/5 rounded-full cursor-pointer"
          >
            <div
              onMouseDown={onThumbMouseDown}
              className="absolute top-0 h-1.5 bg-slate-400 dark:bg-slate-500 group-hover/scroll:bg-slate-500 dark:group-hover/scroll:bg-slate-400 rounded-full cursor-grab active:cursor-grabbing active:bg-slate-600 transition-colors"
              style={{ width: `${thumb.width}px`, left: `${thumb.left}px` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
