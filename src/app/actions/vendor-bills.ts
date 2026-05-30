"use server"

import { db } from "@/db/client"
import { vendor_bills, discrepancies } from "@/db/schema"
import { bucket } from "@/lib/gcs"
import { eq, and, sql } from "drizzle-orm"
import { randomUUID } from "crypto"

export async function uploadVendorBillAction(formData: FormData) {
  try {
    const poId = formData.get('po_id') as string
    const billNumber = formData.get('bill_number') as string
    const billAmount = Number(formData.get('bill_amount'))
    const poTotal = Number(formData.get('po_total'))
    const totalBilledSoFar = Number(formData.get('total_billed_so_far'))
    
    // Check if there's a file
    const file = formData.get('file') as File | null
    let filePathStr: string | null = null

    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop()
      const fileName = `bills/${poId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const buffer = Buffer.from(await file.arrayBuffer())
      
      const gcsFile = bucket.file(fileName)
      await gcsFile.save(buffer, { contentType: file.type, resumable: false })
      filePathStr = fileName
    }

    // Insert bill

    await db.insert(vendor_bills).values({
      po_id: poId,
      bill_number: billNumber.trim(),
      bill_amount: String(billAmount),
      file_path: filePathStr,
      created_at: new Date()
    } as typeof vendor_bills.$inferInsert)

    // Discrepancy logic
    const priceGap = totalBilledSoFar - poTotal

    // Check existing
    const existingMismatches = await db.select({ id: discrepancies.id, admin_comment: discrepancies.admin_comment })
      .from(discrepancies)
      .where(and(
        eq(discrepancies.po_id, poId),
        eq(discrepancies.discrepancy_type, 'Price Mismatch')
      ))
    
    const existingPriceMismatch = existingMismatches.find(() => true) // just getting one

    if (priceGap > 50) { // Tolerance threshold
      if (existingPriceMismatch) {
        await db.update(discrepancies).set({
          status: 'Open',
          admin_comment: existingPriceMismatch.admin_comment ? existingPriceMismatch.admin_comment + ` | Vendor billed an additional ₹${billAmount} bringing variance to ₹${priceGap}` : `Vendor billed an additional ₹${billAmount} bringing variance to ₹${priceGap}`
        }).where(eq(discrepancies.id, existingPriceMismatch.id))
      } else {
        await db.insert(discrepancies).values({
          id: randomUUID(),
          po_id: poId,
          discrepancy_type: 'Price Mismatch',
          status: 'Open',
          admin_comment: `Vendor billed ₹${totalBilledSoFar} against PO Total of ₹${poTotal}. Variance: ₹${priceGap}`
        })
      }
    }

    return { success: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function deleteVendorBillAction(billId: string) { try { await db.execute(sql`DELETE FROM vendor_bills WHERE id = ${billId}`); return { error: null }; } catch(error) { return { error: { message: (error instanceof Error ? error.message : String(error)) } }; } }