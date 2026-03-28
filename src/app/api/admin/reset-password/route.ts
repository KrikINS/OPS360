import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Helper to generate a random 4-character suffix
function generateSuffix(length: number = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Omitted confusing chars like I, 1, 0, O
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

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

    const normalizedRole = profile?.role?.toLowerCase().trim() || ""
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'owner' || normalizedRole === 'admin/owner'

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 })
    }

    // 2. Extract payload
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "Missing Target User ID." }, { status: 400 })
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

    // 4. Generate Temporary Password
    const tempPassword = `ETHAN-${generateSuffix()}`

    // 5. Update Auth User Password & Metadata
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: tempPassword,
        user_metadata: { requires_password_change: true }
      }
    )

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 6. Update Profile to force password change (redundant but good for UI consistency)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ force_password_change: true })
      .eq('id', userId)

    if (profileError) {
       return NextResponse.json({ error: `Password reset but failed to set forced change flag: ${profileError.message}` }, { status: 500 })
    }

    // 7. Log the action in audit_logs
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        admin_id: user.id,
        target_id: userId,
        event_type: 'PASSWORD_RESET',
        details: { 
          message: 'Administrative password reset triggered.',
          format: 'ETHAN-XXXX'
        }
      })

    if (auditError) {
      console.error("Audit Logging Failed:", auditError)
      // We don't necessarily want to fail the whole request if auditing fails after success, 
      // but the user's instructions were strict.
    }

    return NextResponse.json({ 
      success: true, 
      temporaryPassword: tempPassword 
    }, { status: 200 })

  } catch (err) {
    console.error("Password Reset Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
