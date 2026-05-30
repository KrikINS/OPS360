"use client"

import { useEffect } from 'react'

type Shortcut = {
  key: string
  alt?: boolean
  ctrl?: boolean
  shift?: boolean
  action: () => void
}

export function usePosHotkeys(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      shortcuts.forEach(s => {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase()
        const altMatch = s.alt ? e.altKey : !e.altKey
        const ctrlMatch = s.ctrl ? e.ctrlKey : !e.ctrlKey
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey

        if (keyMatch && altMatch && ctrlMatch && shiftMatch) {
          e.preventDefault()
          s.action()
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
