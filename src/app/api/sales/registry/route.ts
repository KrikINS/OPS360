import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin()
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

    const normalizedRole = (profile.role || "").toLowerCase().trim();
    const isAuthorized = normalizedRole === 'admin/owner' || 
                         normalizedRole === 'owner' ||
                         normalizedRole === 'manager' || 
                         normalizedRole === 'sales rep' ||
                         normalizedRole === 'admin';

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden - Role unauthorized" }, { status: 403 })
    }

    // 3. Fetch from the V8 RPC (supports customer IDs and names)
    const { data, error } = await supabase
      .rpc('get_sales_registry_v8', {
        p_branch_id: branchId && branchId !== "ALL_000" ? branchId : null
      })

    if (error) {
      console.error("Supabase RPC Error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const error = err as Error
    console.error("Sales Registry Fetch Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
