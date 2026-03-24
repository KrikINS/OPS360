import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
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

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // 2. Allow access based on role or branch allotment
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, assigned_branch_ids')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const allowedRoles = ['admin', 'manager', 'staff']
    if (!allowedRoles.includes(profile.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 3. Fetch from the V5 RPC (supports optional branch filtering)
    const { data, error } = await supabase
      .rpc('get_sales_registry_v5', {
        p_branch_id: branchId || null
      })

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error("Sales Registry Fetch Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
