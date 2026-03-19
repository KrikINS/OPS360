import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * GET /api/vendors
 * Fetches all vendors ordered by creation date.
 */
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
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * POST /api/vendors
 * Creates a new vendor in 'awaiting_approval' status.
 */
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
  const { 
    name, trade_name, gstin, pan_number, 
    contact_person, email, phone, address, 
    state_code, bank_details, payment_terms, 
    credit_limit, category, brand_ids, category_ids 
  } = body

  if (!name) return NextResponse.json({ error: "Vendor name is required" }, { status: 400 })

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      name,
      trade_name,
      gstin,
      pan_number,
      contact_person,
      email,
      phone,
      address,
      state_code,
      bank_details,
      payment_terms,
      credit_limit: credit_limit ? parseFloat(credit_limit) : 0,
      category,
      brand_ids: Array.isArray(brand_ids) ? brand_ids : [],
      category_ids: Array.isArray(category_ids) ? category_ids : [],
      status: 'awaiting_approval',
      compliance_status: 'Pending',
      created_by: user.id
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

/**
 * PATCH /api/vendors
 * Updates vendor status or compliance status with audit logging.
 * Permissions: Admin or Manager only.
 */
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

  // Validate permissions: Admin or Manager for approval/deactivation
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    return NextResponse.json({ error: "Insufficient permissions to update vendors" }, { status: 403 })
  }

  const body = await request.json()
  const { id, status, compliance_status } = body

  if (!id) return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })

  // Fetch current vendor data for audit logging
  const { data: currentVendor } = await supabase
    .from('vendors')
    .select('status, compliance_status')
    .eq('id', id)
    .single()

  const updateData: Record<string, string | number> = {}
  if (status) {
    updateData.status = status
    if (status === 'approved') updateData.approved_by = user.id
  }
  if (compliance_status) updateData.compliance_status = compliance_status
  
  if (body.brand_ids) updateData.brand_ids = body.brand_ids
  if (body.category_ids) updateData.category_ids = body.category_ids

  const { data, error } = await supabase
    .from('vendors')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log audit if compliance_status changed
  if (compliance_status && currentVendor && currentVendor.compliance_status !== compliance_status) {
    await supabase.from('vendor_audit_log').insert({
      vendor_id: id,
      changed_by: user.id,
      field_name: 'compliance_status',
      old_value: currentVendor.compliance_status,
      new_value: compliance_status
    })
  } else if (status && currentVendor && currentVendor.status !== status) {
    await supabase.from('vendor_audit_log').insert({
      vendor_id: id,
      changed_by: user.id,
      field_name: 'status',
      old_value: currentVendor.status,
      new_value: status
    })
  }

  return NextResponse.json(data)
}
