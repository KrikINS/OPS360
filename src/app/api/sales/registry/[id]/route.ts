import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const normalizedRole = (profile.role || "").toLowerCase().trim();
    const isAuthorized = normalizedRole === 'admin/owner' || 
                         normalizedRole === 'manager' || 
                         normalizedRole === 'sales rep' ||
                         normalizedRole === 'admin';

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden - Role unauthorized" }, { status: 403 })
    }

    // Bypass RLS using Admin Client to ensure robust fetch regardless of user branch restrictions for historical printing
    const { data, error } = await supabaseAdmin
      .from('sales_invoices')
      .select('*, branches(*), customers(*)')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
