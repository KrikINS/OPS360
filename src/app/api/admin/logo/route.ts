import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth check — admin only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get("logo") as File | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const ext = file.name.split(".").pop()
  const filename = `logo.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = new Uint8Array(arrayBuffer)

  // Upload / overwrite the logo in the branding bucket
  const { error: uploadError } = await supabase.storage
    .from("branding")
    .upload(filename, fileBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage.from("branding").getPublicUrl(filename)

  // Persist the URL in app_settings
  const { error: settingsError } = await supabase
    .from("app_settings")
    .upsert({ key: "logo_url", value: publicUrl, updated_at: new Date().toISOString() })

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}
