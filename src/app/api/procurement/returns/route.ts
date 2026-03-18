import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const formData = await req.formData()
    const po_id = formData.get("po_id") as string
    const serial_numbers = JSON.parse(formData.get("serial_numbers") as string) as string[]
    const reason = formData.get("reason") as string
    const proofFile = formData.get("proof") as File | null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let evidence_url = ""
    if (proofFile) {
      const fileName = `${po_id}-${Date.now()}-${proofFile.name}`
      const { error: uploadError } = await supabase.storage
        .from("returns-evidence")
        .upload(`proof/${fileName}`, proofFile)

      if (uploadError) throw uploadError
      
      const { data: publicUrl } = supabase.storage
        .from("returns-evidence")
        .getPublicUrl(`proof/${fileName}`)
      
      evidence_url = publicUrl.publicUrl
    }

    // Call RPC
    const { data, error: rpcError } = await supabase.rpc("process_purchase_return_atomic", {
      p_po_id: po_id,
      p_serial_numbers: serial_numbers,
      p_reason: reason,
      p_evidence_url: evidence_url,
      p_user_id: user.id
    })

    if (rpcError) throw rpcError
    
    const result = data as { 
      success: boolean; 
      total_amount: number; 
      units_returned: number; 
      debit_note_id: string;
      debit_note_number: string;
      error?: string 
    }
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Return processed successfully. ${result.units_returned} units returned. Debit note: ${result.debit_note_number}`,
        total_amount: result.total_amount,
        debit_note_id: result.debit_note_id,
        debit_note_number: result.debit_note_number
      })
    } else {
      return NextResponse.json({ error: result.error || "Failed to process return" }, { status: 400 })
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("Return engine failure:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
