'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '80px', width: '80px', borderRadius: '16px', background: '#001529', color: 'white', fontSize: '28px', fontWeight: 900, marginBottom: '24px' }}>
            AppTerra
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>Critical Error</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px' }}>
            A critical error has occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', margin: '0 0 24px' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ background: '#001529', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 32px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
