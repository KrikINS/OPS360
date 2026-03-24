import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 1. Verify Authentication using the standard client
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // 2. Verify Admin Role using the dedicated join-free RPC (passing explicit user ID)
    const { data: isAdmin } = await supabaseAdmin.rpc('check_is_admin_v3', { p_user_id: user.id })
    if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 })
    }

    // 3. Fetch Invoice Header with branch and customer details (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('sales_invoices')
      .select(`
        *,
        branches(*),
        customers(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error("Invoice Header Fetch Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
