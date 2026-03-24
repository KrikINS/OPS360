import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Verify admin role using the ADMIN CLIENT (bypasses RLS)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // 2. Verify Admin Role using the dedicated join-free RPC (passing explicit user ID)
    const { data: isAdmin } = await supabaseAdmin.rpc('check_is_admin_v3', { p_user_id: user.id })
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 })
    }

    // 3. Fetch from the Master RPC (bypasses all View/Join resolution issues)
    const { data, error } = await supabaseAdmin
      .rpc('get_sales_registry_v3')

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error("Sales Registry Fetch Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
