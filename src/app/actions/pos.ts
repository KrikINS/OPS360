"use server"

import { db } from "@/db/client"
import { profiles, branches, customers, inventory, products } from "@/db/schema"
import { eq, sql, and } from "drizzle-orm"

export async function getUserPosStatsAction() {
  try {
    const res = await db.execute(sql`SELECT * FROM get_user_pos_stats()`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function updatePosPinAction(userId: string, newPin: string) {
  try {
    await db.execute(sql`UPDATE profiles SET pos_pin = ${newPin} WHERE id = ${userId}`)
    return { success: true }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getPosInventoryAction(branchId: string) {
  try {
    const data = await db.select().from(inventory).where(and(eq(inventory.branch_id, branchId), eq(inventory.status, 'Available')))
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getPosProductsAction(productIds: string[]) {
  if (!productIds.length) return { data: [] }
  try {
    const data = await db.select().from(products).where(sql`${products.id} = ANY(${productIds})`)
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getAllPosProductsAction() {
  try {
    const data = await db.select().from(products)
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function searchCustomerByPhoneAction(phone: string) {
  try {
    const res = await db.execute(sql`SELECT * FROM search_customer_by_phone(${phone})`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function searchPosCustomersAction(term: string) {
  try {
    const res = await db.execute(sql`SELECT * FROM search_pos_customers(${term})`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function processPosSaleAction(payload: Record<string, unknown>) {
  try {
    const res = await db.execute(sql`SELECT process_pos_sale(${JSON.stringify(payload)}::jsonb)`)
    const result = res as unknown as { rows?: { process_pos_sale: Record<string, unknown> }[] } | { process_pos_sale: Record<string, unknown> }[]
    const data = Array.isArray(result) ? result[0]?.process_pos_sale : result.rows?.[0]?.process_pos_sale
    return { data }
  } catch (error: any) {
    const errorString = String(error) + (error.cause ? " CAUSE: " + String(error.cause) : "");
    return { error: { message: errorString } }
  }
}

export async function getInvoiceHeaderAction(id: string) {
  try {

    // we would need branches and customers, but let's just use raw SQL for now
    const res = await db.execute(sql`SELECT *, row_to_json(branches.*) as branches, row_to_json(customers.*) as customers FROM sales_invoices LEFT JOIN branches ON sales_invoices.branch_id = branches.id LEFT JOIN customers ON sales_invoices.customer_id = customers.id WHERE sales_invoices.id = ${id}`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const row = Array.isArray(result) ? result[0] : result.rows?.[0]
    return { data: row }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getInvoiceItemsDetailsAction(id: string) {
  try {
    const res = await db.execute(sql`SELECT * FROM view_invoice_details WHERE invoice_id = ${id}`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getPosInitialDataAction(userId: string, branchId?: string) {
  try {
    const [profileData, branchesData, walkInCustomer] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.id, userId)),
      db.select().from(branches),
      db.select().from(customers).where(eq(customers.phone_number, '0000000000'))
    ])
    
    return {
      profile: profileData[0],
      allBranches: branchesData,
      branch: branchId ? branchesData.find(b => b.id === branchId) : null,
      walkIn: walkInCustomer[0]
    }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}
