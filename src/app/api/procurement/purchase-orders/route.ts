import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/admin"

export async function GET() {
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

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      vendor:vendors(name),
      branch:branches(name),
      items:purchase_order_items(
        *,
        product:products(model_name, hsn_code)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch profiles to map created_by and approved_by to human readable names
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email')
  const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email]) || [])

  const enrichedData = data.map(po => ({
    ...po,
    requester_name: profileMap.get(po.created_by) || 'Unknown',
    approver_name: po.approved_by ? profileMap.get(po.approved_by) : null
  }))

  return NextResponse.json(enrichedData)
}

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
  const { vendor_id, branch_id, items, terms_content, status = 'draft' } = body

  if (!vendor_id || !branch_id || !items || items.length === 0) {
    return NextResponse.json({ error: "Vendor, branch, and items are required" }, { status: 400 })
  }

  // Generate sequential PO number (PO-YYYY-XXXX)
  const currentYear = new Date().getFullYear().toString()
  const poPrefix = `PO-${currentYear}-`

  // Use admin client for sequence check to be safe
  const adminSupabase = createAdminClient()

  // Get all POs for this year to find the true numeric maximum
  const { data: allPOs } = await adminSupabase
    .from('purchase_orders')
    .select('po_number')
    .like('po_number', `${poPrefix}%`)

  let maxSequence = 0
  if (allPOs && allPOs.length > 0) {
    allPOs.forEach(po => {
      const parts = po.po_number.split('-')
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10)
        if (!isNaN(num) && num > maxSequence) {
          maxSequence = num
        }
      }
    })
  }

  let finalSequence = maxSequence + 1
  let po_number = `${poPrefix}${finalSequence.toString().padStart(4, '0')}`

  // Double check collision (highly unlikely after fix but safe)
  const { data: existingCheck } = await adminSupabase
    .from('purchase_orders')
    .select('id')
    .eq('po_number', po_number)
    .single()

  if (existingCheck) {
    // If somehow a collision still exists (race condition?), skip until free
    // This is a last resort to prevent 500s
    console.warn(`[PO-Generation] Manual collision detected for ${po_number}, trying next...`)
    finalSequence++
    po_number = `${poPrefix}${finalSequence.toString().padStart(4, '0')}`
  }

  console.log(`[PO-Generation] Generated: ${po_number} (Max found: ${maxSequence})`)

  // 1. Create Purchase Order
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      po_number,
      vendor_id,
      branch_id,
      status,
      created_by: user.id,
      terms_content,
      total_amount: items.reduce((acc: number, item: { total_item_cost: number }) => acc + item.total_item_cost, 0)
    })
    .select()
    .single()

  if (poError) return NextResponse.json({ error: poError.message }, { status: 500 })

  // 2. Create Purchase Order Items
  const poItems = items.map((item: { 
    product_id: string, 
    quantity: number, 
    unit_price: number,
    tax_rate: number,
    total_item_cost: number,
    override_reason?: string
  }) => ({
    po_id: po.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate: item.tax_rate,
    total_item_cost: item.total_item_cost,
    override_reason: item.override_reason
  }))

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(poItems)

  if (itemsError) {
    // Cleanup PO if items fail (simplified)
    await supabase.from('purchase_orders').delete().eq('id', po.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json(po, { status: 201 })
}

export async function PATCH(request: Request) {
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
  const { id, status, vendor_id, branch_id, items, terms_content, total_amount, cancellation_reason } = body

  if (!id || !status) return NextResponse.json({ error: "ID and status are required" }, { status: 400 })

  // Check roles for approval
  if (status === 'approved') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Only admins can approve purchase orders" }, { status: 403 })
    }
  }

  const updateData: Record<string, string | number | null> = { status }
  if (status === 'approved') updateData.approved_by = user.id
  if (vendor_id) updateData.vendor_id = vendor_id
  if (branch_id) updateData.branch_id = branch_id
  if (total_amount) updateData.total_amount = total_amount
  if (terms_content) updateData.terms_content = terms_content
  if (cancellation_reason) updateData.cancellation_reason = cancellation_reason

  // If items are provided, we need to update items (Revise & Approve flow)
  if (items && items.length > 0) {
    const adminSupabase = createAdminClient()
    
    // 1. Delete existing items
    const { error: deleteError } = await adminSupabase
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', id)
    
    if (deleteError) return NextResponse.json({ error: "Failed to clear existing items" }, { status: 500 })

    // 2. Insert new items
    const { error: insertError } = await adminSupabase
      .from('purchase_order_items')
      .insert(items.map((item: { product_id: string, quantity: number, unit_price: number, tax_rate: number, total_item_cost: number, override_reason?: string }) => ({
        purchase_order_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        total_item_cost: item.total_item_cost,
        override_reason: item.override_reason
      })))

    if (insertError) return NextResponse.json({ error: "Failed to update items" }, { status: 500 })
    
    // Recalculate total if not provided explicitly
    if (!total_amount) {
      updateData.total_amount = items.reduce((acc: number, item: any) => acc + item.total_item_cost, 0)
    }
  }

  const { data, error } = await supabase
    .from('purchase_orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
