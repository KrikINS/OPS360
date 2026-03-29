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
  // console.log('[InventorySync] Request Body:', JSON.stringify(body, null, 2))
  const { po_id, items, condition_notes } = body // items: { product_id, serial_numbers: [], unit_price, hsn_code, freight }[]

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

    interface SyncItem {
      product_id: string;
      serial_numbers: string[];
      unit_price: number;
      hsn_code: string;
      freight: number;
      item_id: string;
    }

    const itemsWithLandedCost = (items as SyncItem[]).map((item) => {
      const { product_id, serial_numbers, unit_price, hsn_code, freight, item_id } = item
      const vendorData = (po.vendor && !Array.isArray(po.vendor)) ? po.vendor as { state: string } : { state: 'Kerala' }
      const vendorState = vendorData.state || 'Kerala'
      const costDetails = calculateLandedCost(unit_price, freight, hsn_code, vendorState, serial_numbers.length)
      
      return {
        product_id,
        serial_numbers,
        unit_price,
        hsn_code,
        landed_cost: costDetails.totalLandedCost,
        freight,
        item_id
      }
    })

    // 3. Call Atomic RPC
    const { data: result, error: rpcError } = await adminSupabase.rpc('process_grn_atomic', {
      arg_po_id: po_id,
      arg_originator_id: user.id,
      arg_items: itemsWithLandedCost,
      arg_condition_notes: condition_notes || null
    })

    if (rpcError) throw new Error(rpcError.message)
    
    // Result is an array like [{success: bool, message: text, grn_id: uuid}]
    const response = Array.isArray(result) ? result[0] : result
    
    if (!response?.success) {
      const msg = response?.message || "Internal transaction failed"
      if (msg.includes('DUPLICATE_SERIAL:')) {
        const serial = msg.split(':')[1]
        return NextResponse.json({ 
          error: `The serial number "${serial}" is already in the registry. Please verify and try again.`,
          code: 'DUPLICATE_SERIAL'
        }, { status: 400 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: response.message, 
      grn_id: response.grn_id,
      items_added: (items as SyncItem[]).reduce((acc: number, i) => acc + i.serial_numbers.length, 0)
    })

  } catch (err) {
    const error = err as Error
    console.error('[InventorySync] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
