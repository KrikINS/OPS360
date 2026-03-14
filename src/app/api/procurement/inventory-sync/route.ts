import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { calculateLandedCost } from "@/utils/compliance"
import { createAdminClient } from "@/utils/supabase/admin"

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

    const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  console.log('[InventorySync] Request Body:', JSON.stringify(body, null, 2))
  const { po_id, items } = body // items: { product_id, serial_numbers: [], unit_price, hsn_code, freight }[]

  if (!po_id || !items || items.length === 0) {
    console.error('[InventorySync] Validation Failed - Missing po_id or items:', { po_id: !!po_id, itemsCount: items?.length })
    return NextResponse.json({ error: "PO ID and items are required" }, { status: 400 })
  }

  try {
    // 1. Validate PO exists and is approved
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('status, branch_id, vendor:vendors(state)')
      .eq('id', po_id)
      .single()

    if (poError || !po) return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 })
    if (po.status !== 'approved' && po.status !== 'partially_received') {
      return NextResponse.json({ error: "Only approved or partially received orders can be updated" }, { status: 400 })
    }

    // 2. Prepare inventory insertions and update quantities
    type InventoryItemInsert = {
      serial_number: string;
      hsn_code: string;
      price: number;
      landed_cost: number;
      status: string;
      branch_id: string;
      source_po_id: string;
    };
    const inventoryItems: InventoryItemInsert[] = []
    
    for (const item of items) {
      const { product_id, serial_numbers, unit_price, hsn_code, freight } = item
      
      const vendorData = (po.vendor && !Array.isArray(po.vendor)) ? po.vendor as { state: string } : { state: 'Kerala' }
      const vendorState = vendorData.state || 'Kerala'
      const costDetails = calculateLandedCost(unit_price, freight, hsn_code, vendorState, serial_numbers.length)
      
      serial_numbers.forEach((sn: string) => {
        inventoryItems.push({
          serial_number: sn,
          hsn_code: hsn_code,
          price: unit_price,
          landed_cost: costDetails.totalLandedCost, // This is now unit landed cost
          status: 'Available',
          branch_id: po.branch_id,
          source_po_id: po_id
        })
      })

      // Update the received quantity for this specific PO item (using admin client)
      const { error: itemUpdateError } = await adminSupabase.rpc('increment_received_quantity', {
        item_product_id: product_id,
        item_po_id: po_id,
        increment_by: serial_numbers.length
      })

      if (itemUpdateError) throw new Error(`Failed to update item quantity: ${itemUpdateError.message}`)
    }

    // 3. Insert into inventory (use admin client to bypass RLS)
    const { error: inventoryError } = await adminSupabase
      .from('inventory')
      .insert(inventoryItems)

    if (inventoryError) throw new Error(inventoryError.message)

    // 4. Determine PO Status
    // Fetch all items for this PO to compare quantities
    const { data: poItems, error: itemsError } = await adminSupabase
      .from('purchase_order_items')
      .select('quantity, received_quantity')
      .eq('po_id', po_id)

    if (itemsError) throw new Error(itemsError.message)

    const totalOrdered = poItems.reduce((acc, item) => acc + item.quantity, 0)
    const totalReceived = poItems.reduce((acc, item) => acc + item.received_quantity, 0)

    let finalStatus = 'partially_received'
    if (totalReceived >= totalOrdered) {
      finalStatus = 'received'
    }

    const { error: updateError } = await adminSupabase
      .from('purchase_orders')
      .update({ status: finalStatus })
      .eq('id', po_id)

    if (updateError) throw new Error(`PO Status Update Failed: ${updateError.message}`)

    return NextResponse.json({ 
      success: true, 
      message: `GRN processed as ${finalStatus}`, 
      items_added: inventoryItems.length,
      total_received: totalReceived,
      total_ordered: totalOrdered
    })

  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
