import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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
  const { vendor_id, branch_id, items, status = 'draft' } = body

  if (!vendor_id || !branch_id || !items || items.length === 0) {
    return NextResponse.json({ error: "Vendor, branch, and items are required" }, { status: 400 })
  }

  // Generate sequential PO number (PO-YYYY-XXXX)
  const currentYear = new Date().getFullYear().toString()
  const poPrefix = `PO-${currentYear}-`

  // Get the latest PO for this year to determine the next sequence number
  const { data: latestPO, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('po_number')
    .like('po_number', `${poPrefix}%`)
    .order('po_number', { ascending: false })
    .limit(1)
    .single()

  let sequenceNumber = 1
  if (latestPO && latestPO.po_number && !fetchError) {
    const lastSequenceStr = latestPO.po_number.split('-')[2]
    const lastSequenceNum = parseInt(lastSequenceStr, 10)
    if (!isNaN(lastSequenceNum)) {
      sequenceNumber = lastSequenceNum + 1
    }
  }

  const po_number = `${poPrefix}${sequenceNumber.toString().padStart(4, '0')}`

  // 1. Create Purchase Order
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      po_number,
      vendor_id,
      branch_id,
      status,
      created_by: user.id,
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
    total_item_cost: number
  }) => ({
    po_id: po.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate: item.tax_rate,
    total_item_cost: item.total_item_cost
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
  const { id, status } = body

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

  const updateData: { status: string, approved_by?: string } = { status }
  if (status === 'approved') updateData.approved_by = user.id

  const { data, error } = await supabase
    .from('purchase_orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
