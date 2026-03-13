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
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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
  const { 
    name, trade_name, gstin, pan_number, 
    contact_person, email, phone, address, 
    state_code, bank_details, payment_terms, 
    credit_limit, category 
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
      status: 'awaiting_approval',
      compliance_status: 'Pending',
      created_by: user.id
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
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

  // Validate permissions: Admin or Manager for approval/deactivation
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    return NextResponse.json({ error: "Insufficient permissions to approve or deactivate vendors" }, { status: 403 })
  }

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: "Vendor ID and status are required" }, { status: 400 })

  const updateData: { status: string; approved_by?: string } = { status }
  if (status === 'approved') {
    updateData.approved_by = user.id
  }

  const { data, error } = await supabase
    .from('vendors')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
