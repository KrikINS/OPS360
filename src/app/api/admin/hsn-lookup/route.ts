import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ data: [] })
  }

  const supabase = await createClient()

  // Search by code prefix or description keyword
  const { data, error } = await supabase
    .from("hsn_master")
    .select("*")
    .or(`hsn_code.ilike.${query}%,description.ilike.%${query}%`)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
