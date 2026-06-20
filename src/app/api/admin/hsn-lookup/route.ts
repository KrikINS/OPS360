
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ data: [] })
  }

  

  // Search by code prefix, description keyword, or search_tags
  const { data, error } = await import("@/app/actions/hsn").then(m => m.searchHsnCodes(query))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
