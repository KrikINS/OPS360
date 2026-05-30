"use server"

import { db } from "@/db/client"
import { purchase_orders } from "@/db/schema"
import { desc, sql } from "drizzle-orm"

export async function getPurchaseOrdersAction() {
  try {
    const data = await db.select().from(purchase_orders).orderBy(desc(purchase_orders.created_at))
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getGRNReceiptsAction(poId: string) {
  try {
    const res = await db.execute(sql`SELECT * FROM grn_receipts WHERE po_id = ${poId} ORDER BY created_at DESC`); const data = (res as unknown as { rows?: Record<string, unknown>[] }).rows || res;
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}
