import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.request?.cookies) {
      event.request.cookies = {}
    }
    return event
  },
})
