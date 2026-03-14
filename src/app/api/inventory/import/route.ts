import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  try {
    const { items } = await request.json()
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
    }

    // 1. Fetch reference data
    const [productsRes, branchesRes, poRes] = await Promise.all([
      supabase.from("products").select("id, model_name, hsn_code"),
      supabase.from("branches").select("id, name"),
      supabase.from("purchase_orders").select("id").eq("po_number", "LEGACY_IMPORT").single()
    ])

    if (productsRes.error) throw productsRes.error
    if (branchesRes.error) throw branchesRes.error
    if (poRes.error) throw new Error("Legacy Import PO not found. Please initialize the database.")

    const productsMap = new Map(productsRes.data.map(p => [p.model_name.toLowerCase(), p]))
    const branchesMap = new Map(branchesRes.data.map(b => [b.name.toLowerCase(), b.id]))
    const legacyPoId = poRes.data.id

    // 2. Process and Smart Match
    const inventoryData = items.map((item: any) => {
      const productName = (item["Item Name"] || "").toLowerCase().trim()
      const branchName = (item["Branch"] || "").toLowerCase().trim()
      
      const product = productsMap.get(productName)
      const branchId = branchesMap.get(branchName)

      if (!product) {
        throw new Error(`Product not found in Master: ${item["Item Name"]}`)
      }
      if (!branchId) {
        throw new Error(`Branch not found: ${item["Branch"]}`)
      }

      return {
        serial_number: item["Serial Number"],
        hsn_code: product.hsn_code,
        status: "Available",
        branch_id: branchId,
        price: parseFloat(item["Estimated Cost"] || "0"),
        landed_cost: parseFloat(item["Estimated Cost"] || "0"),
        source_po_id: legacyPoId,
        product_id: product.id
      }
    })

    // 3. Insert into inventory (serial_number uniqueness is enforced by DB)
    const { data, error } = await supabase
      .from("inventory")
      .insert(inventoryData)
      .select()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "Duplicate serial numbers found in the upload or database." }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true, count: data.length })

  } catch (error: any) {
    console.error("Import error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
