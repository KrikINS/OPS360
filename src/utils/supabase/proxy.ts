import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("--- SYSTEM CONFIGURATION ERROR: Missing Supabase Environment Variables ---")
      return new NextResponse(
        JSON.stringify({ error: "System configuration error. Please contact administration." }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      )
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Fetch user from auth to refresh token if needed
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()

    // Always allow unauthenticated users on login/signup routes
    const isAuthRoute = url.pathname.startsWith('/login')

    // If unauthenticated and trying to access app, redirect to login
    if (!user && !isAuthRoute) {
      url.pathname = '/login'
      url.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // If authenticated and trying to access login, redirect to home
    if (user && isAuthRoute) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (user) {
      // Fetch profile to get role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, force_password_change')
        .eq('id', user.id)
        .single()

      const role = profile?.role || 'sales'

      // Enforce forced password change on first login
      const isChangePwRoute = url.pathname.startsWith('/change-password')
      if (profile?.force_password_change && !isChangePwRoute) {
        url.pathname = '/change-password'
        return NextResponse.redirect(url)
      }

      // Route Guards
      const path = url.pathname

      if (path.startsWith('/admin') || path.startsWith('/staff')) {
        if (role !== 'Admin/Owner') {
          url.pathname = '/unauthorized'
          return NextResponse.redirect(url)
        }
      }

      if (path.startsWith('/transfer')) {
        if (role !== 'Admin/Owner' && role !== 'manager') {
          url.pathname = '/unauthorized'
          return NextResponse.redirect(url)
        }
      }

      if (path.startsWith('/pos') || path.startsWith('/vendors')) {
        if (role !== 'Admin/Owner' && role !== 'manager' && role !== 'sales') {
          url.pathname = '/unauthorized'
          return NextResponse.redirect(url)
        }
      }

      if (path.startsWith('/service')) {
        if (role !== 'Admin/Owner' && role !== 'manager' && role !== 'technician') {
          url.pathname = '/unauthorized'
          return NextResponse.redirect(url)
        }
      }
    }

    return supabaseResponse
  } catch (_err: unknown) {
    return NextResponse.next({ request });
  }
}
