import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const forcePasswordChange = token?.forcePasswordChange

    // If password change required, only allow /change-password and /api/auth routes
    if (forcePasswordChange) {
      if (
        !pathname.startsWith('/change-password') &&
        !pathname.startsWith('/api/auth')
      ) {
        return NextResponse.redirect(new URL('/change-password', req.url))
      }
    }

    // If on change-password but flag is false, redirect to launchpad
    if (!forcePasswordChange && pathname.startsWith('/change-password')) {
      return NextResponse.redirect(new URL('/launchpad', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
