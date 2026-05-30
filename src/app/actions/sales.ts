"use server"

import { db } from "@/db/client"
import { sales_invoices, invoice_items } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function getCustomerHistoryAction(customerId: string) {
  try {
    const invoices = await db.select().from(sales_invoices).where(eq(sales_invoices.customer_id, customerId)).orderBy(desc(sales_invoices.created_at))
    
    // Simplification for historical items count
    const enriched = await Promise.all(invoices.map(async (inv) => {
      const itemsRes = await db.select().from(invoice_items).where(eq(invoice_items.invoice_id, inv.id))
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        created_at: inv.created_at?.toISOString() || new Date().toISOString(),
        total_amount: Number(inv.total_amount),
        items: [{ count: itemsRes.length }]
      }
    }))
    
    return { data: enriched }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getSalesForExportAction() { try { const data = await db.select().from(sales_invoices); return { data }; } catch(error) { return { error: { message: String(error) } }; } }