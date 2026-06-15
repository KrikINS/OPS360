import { useEffect, useRef } from "react"

export function useBarcodeScanner(onScan: (serial: string) => void): void {
  const onScanRef = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan })

  useEffect(() => {
    let buffer = ""
    let lastKeyTime = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (target.dataset.barcodeInput === "true") return

      const now = Date.now()

      if (e.key === "Enter") {
        if (buffer.length >= 3 && now - lastKeyTime <= 100) {
          onScanRef.current(buffer)
        }
        buffer = ""
        lastKeyTime = 0
        return
      }

      if (now - lastKeyTime > 100 && lastKeyTime !== 0) {
        buffer = ""
      }

      if (e.key.length === 1) {
        buffer += e.key
        lastKeyTime = now
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
}
