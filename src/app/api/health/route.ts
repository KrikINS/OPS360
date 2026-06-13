import { NextResponse } from 'next/server'

export async function GET() {
  // Validate critical env vars are present at runtime
  const missing = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
    .filter(key => !process.env[key])

  if (missing.length > 0) {
    return NextResponse.json(
      { status: 'error', missing },
      { status: 503 }
    )
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.SENTRY_ENVIRONMENT ?? 'unknown',
  })
}
