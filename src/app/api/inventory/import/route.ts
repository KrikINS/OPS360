import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const ALLOWED_BRANCHES = ["Test Main Branch", "Test Branch 1", "Test Branch 2"]
    const productsMap = new Map(productsRes.data.map(p => [p.model_name.toLowerCase(), p]))
    const branchesMap = new Map(
      branchesRes.data
        .filter(b => ALLOWED_BRANCHES.includes(b.name))
        .map(b => [b.name.toLowerCase(), b.id])
    )
    const legacyPoId = poRes.data.id

    // 2. Process and Smart Match
    const inventoryData = items.map((item: any) => {
      const productName = (item["Item Name"] || "").toLowerCase().trim()
      const branchNameInput = (item["Branch"] || "").trim()
      const branchNameLower = branchNameInput.toLowerCase()
      
      const product = productsMap.get(productName)
      const branchId = branchesMap.get(branchNameLower)

      if (!product) {
        throw new Error(`Product not found in Master: ${item["Item Name"]}`)
      }
      
      if (!ALLOWED_BRANCHES.includes(branchNameInput)) {
         throw new Error(`Forbidden Branch: "${branchNameInput}". Only Test Main Branch, Test Branch 1, and Test Branch 2 are allowed.`)
      }

      if (!branchId) {
        throw new Error(`Branch name exists but ID not found in database: ${branchNameInput}`)
      }

      return {
        serial_number: item["Serial Number"],
        hsn_code: product.hsn_code,
        status: "Available",
        branch_id: branchId,
        price: parseFloat(item["Estimated Cost"] || "0"),
        landed_cost: parseFloat(item["Estimated Cost"] || "0"),
        source_po_id: legacyPoId,
        product_id: product.id,
        ...(item["Inward Date"] ? { created_at: item["Inward Date"] } : {})
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
