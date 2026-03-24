import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Specialized server route utilizing the SERVICE ROLE KEY bypasses normal RLS
// and enables manual assignment of auth.users entities without user confirmation loops.
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    
    // 1. Validate the user executing the request is an authentic Admin
    const supabaseSession = createServerClient(
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

    const { data: { user } } = await supabaseSession.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabaseSession
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 })
    }

    // 2. Extract payload
    const body = await request.json()
    const { email, password, fullName, role, branchId, forcePasswordChange } = body

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    // 3. Init Service Role Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 4. Create User explicitly overriding email confirmations
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authUser.user) {
         return NextResponse.json({ error: "Failed to parse created user context." }, { status: 500 })
    }

    // 5. Upsert HR Metadata + default module permissions
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email: email,
        full_name: fullName,
        role: role,
        assigned_branch_id: branchId || null,
        force_password_change: forcePasswordChange === true,
      })

    if (profileError) {
       return NextResponse.json({ error: `User created but profile sync failed: ${profileError.message}` }, { status: 500 })
    }

    // 6. Seed default module permissions (all enabled)
    const modules = ['inventory','procurement','pos','transfer','accounting','staff','service','analytics']
    await supabaseAdmin.from('user_permissions').upsert(
      modules.map(m => ({ user_id: authUser.user!.id, module: m, enabled: true })),
      { onConflict: 'user_id,module' }
    )

    return NextResponse.json({ success: true, user: authUser.user }, { status: 201 })

  } catch (err) {
    console.error("Staff Creation Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
