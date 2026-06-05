import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  ignoreErrors: [
    'bis_skin_checked',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Load failed',
    'ChunkLoadError',
  ],
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      return null
    }
    return event
  },
})
