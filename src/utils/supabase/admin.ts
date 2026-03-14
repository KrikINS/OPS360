import { createClient } from "@supabase/supabase-js"

/**
 * Creates a high-privilege Supabase client using the SERVICE_ROLE_KEY.
 * Use this ONLY in Server Components or API Routes for operations 
 * that bypass RLS (e.g., system updates, bulk syncs).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.")
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
