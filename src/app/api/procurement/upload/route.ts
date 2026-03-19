import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const formData = await req.formData()
    const file = formData.get("file") as File
    const poId = formData.get("po_id") as string
    const billNumber = formData.get("bill_number") as string
    const billAmount = formData.get("bill_amount") as string

    if (!file || !poId) {
      return NextResponse.json({ error: "File and PO ID are required" }, { status: 400 })
    }

    // Since we use the service role key, this will bypass RLS.
    const fileExt = file.name.split('.').pop()
    const fileName = `${poId}-${Date.now()}.${fileExt}`
    const filePath = `bills/${fileName}`

    // Next.js App Router File object to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from("vendor-bills")
      .upload(filePath, buffer, { contentType: file.type || 'application/octet-stream' })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      throw uploadError
    }

    // Since it's a private bucket, getting the public URL doesn't work for public embedding unless we use authenticated requests or signed URLs.
    // However, I can still generate a signed URL or let the client fetch it via createSignedUrl when needed, or just store the path.
    // For simplicity, let's just store the path and use an API to view it, OR we generate a long-lived signed URL (e.g., 10 years) for storing in the DB.
    
    // Actually, createSignedUrl is safe and standard:
    const { data: signData, error: signError } = await supabase.storage
      .from("vendor-bills")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10) // 10 years expiry

    if (signError) {
       console.error("Signing error:", signError)
       throw signError
    }

    const { error: insertBillError } = await supabase
      .from("vendor_bills")
      .insert({
        po_id: poId,
        bill_number: billNumber || 'SUPPLEMENTAL',
        bill_amount: parseFloat(billAmount || '0'),
        file_path: signData.signedUrl
      })

    if (insertBillError) {
      console.error("Bill insertion error:", insertBillError)
      throw insertBillError
    }

    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({ 
        bill_url: signData.signedUrl,
        vendor_bill_amount: parseFloat(billAmount || '0'),
        invoice_url: signData.signedUrl 
      })
      .eq("id", poId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, url: signData.signedUrl })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
