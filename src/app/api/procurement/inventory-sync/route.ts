import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { calculateLandedCost } from "@/utils/compliance"

export async function POST(request: Request) {
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

  const body = await request.json()
  const { po_id, items } = body // items: { product_id, serial_numbers: [], unit_price, hsn_code, freight }[]

  if (!po_id || !items || items.length === 0) {
    return NextResponse.json({ error: "PO ID and items are required" }, { status: 400 })
  }

  try {
    // 1. Validate PO exists and is approved
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('status, branch_id')
      .eq('id', po_id)
      .single()

    if (poError || !po) return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 })
    if (po.status !== 'approved') return NextResponse.json({ error: "Only approved Purchase Orders can be received" }, { status: 400 })

    // 2. Prepare inventory insertions
    const inventoryItems: { serial_number: string, hsn_code: string, price: number, landed_cost: number, status: string, branch_id: string | null }[] = []
    
    for (const item of items) {
      const { serial_numbers, unit_price, hsn_code, freight } = item
      
      const costDetails = calculateLandedCost(unit_price, freight, hsn_code)
      
      serial_numbers.forEach((sn: string) => {
        inventoryItems.push({
          serial_number: sn,
          hsn_code: hsn_code,
          price: unit_price,
          landed_cost: costDetails.totalLandedCost,
          status: 'Available',
          branch_id: po.branch_id
        })
      })
    }

    // 3. Insert into inventory
    const { error: inventoryError } = await supabase
      .from('inventory')
      .insert(inventoryItems)
      .select()

    if (inventoryError) throw new Error(inventoryError.message)

    // 4. Update PO status to 'received'
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({ status: 'received' })
      .eq('id', po_id)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ 
      success: true, 
      message: "GRN processed successfully", 
      items_added: inventoryItems.length 
    })

  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
