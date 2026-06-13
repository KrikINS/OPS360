'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-red-600 text-white mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Something went wrong</h1>
          <p className="text-slate-500 mt-2 text-sm">An unexpected error occurred. Our team has been notified.</p>
          {error.digest && (
            <p className="text-slate-400 mt-1 text-xs font-mono">Error ID: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[#001529] text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-[#002545] transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="bg-slate-100 text-slate-700 text-sm font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
