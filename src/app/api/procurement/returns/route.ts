import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }) },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { serial_number, reason } = await req.json()

    if (!serial_number || !reason) {
      return NextResponse.json({ error: "Serial number and reason are required" }, { status: 400 })
    }

    // 1. Find the inventory item and its landed cost/pedigree
    const { data: item, error: fetchError } = await supabase
      .from("inventory")
      .select("id, landed_cost, source_po_id, status")
      .eq("serial_number", serial_number)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    if (item.status === "Sold") {
      return NextResponse.json({ error: "Cannot return a sold item" }, { status: 400 })
    }

    if (item.status === "Returned") {
       return NextResponse.json({ error: "Item is already returned" }, { status: 400 })
    }

    // 2. Perform transaction: Update status + Create Debit Note
    // Since we are in an API, we can't do a multi-table transaction easily without RPC, 
    // but we can do them sequentially or use a single query if possible.
    // For simplicity and audit safety, we'll do them sequentially.

    const { error: updateError } = await supabase
      .from("inventory")
      .update({ status: "Returned" })
      .eq("id", item.id)

    if (updateError) throw updateError

    const { error: dnError } = await supabase
      .from("debit_notes")
      .insert({
        inventory_id: item.id,
        po_id: item.source_po_id,
        amount: item.landed_cost || 0,
        reason: reason,
        created_by: user?.id
      })

    if (dnError) throw dnError

    return NextResponse.json({ 
      success: true, 
      debit_note_amount: item.landed_cost,
      message: `Item ${serial_number} returned successfully. Debit note generated.`
    })
  } catch (error: any) {
    console.error("Return error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
