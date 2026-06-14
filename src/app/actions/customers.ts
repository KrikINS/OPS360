"use server"

import { db } from "@/db/client"
import { customers, loyalty_points } from "@/db/schema"
import { randomUUID } from "crypto"
import { eq, sql } from "drizzle-orm"

export async function addCustomerAction(formData: Partial<typeof customers.$inferInsert>) {
  try {
    const data = await db.insert(customers).values({
      id: formData.id || randomUUID(),
      ...formData
    } as never).returning()
    return { data: data[0] }
  } catch (error) {
    if ((error as Record<string, unknown>).code === '23505') {
      return { error: { message: "Customer with this phone number already exists", code: '23505' } }
    }
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function updateCustomerAction(id: string, formData: Partial<typeof customers.$inferInsert>) {
  try {
    const data = await db.update(customers).set({ ...formData, updated_at: new Date() }).where(eq(customers.id, id)).returning()
    return { data: data[0] }
  } catch (error) {
    if ((error as Record<string, unknown>).code === '23505') {
      return { error: { message: "Customer with this phone number already exists", code: '23505' } }
    }
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

// Alias for legacy callers
export const createCustomerAction = addCustomerAction

export async function searchCustomerByPhoneAction(phone: string) {
  try {
    const data = await db.select().from(customers).where(eq(customers.phone_number, phone))
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getCustomersWithLoyaltyAction() {
  try {
    const data = await db
      .select({
        id: customers.id,
        full_name: customers.full_name,
        phone_number: customers.phone_number,
        email: customers.email,
        city: customers.city,
        state: customers.state,
        pincode: customers.pincode,
        gstin: customers.gstin,
        company_name: customers.company_name,
        customer_type: customers.customer_type,
        created_at: customers.created_at,
        is_credit_eligible: customers.is_credit_eligible,
        credit_limit: customers.credit_limit,
        credit_balance: customers.credit_balance,
        credit_payment_terms: customers.credit_payment_terms,
        loyalty_balance: sql<number>`COALESCE(SUM(${loyalty_points.points}), 0)::int`
      })
      .from(customers)
      .leftJoin(loyalty_points, eq(customers.id, loyalty_points.customer_id))
      .groupBy(customers.id)

    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

function unpackRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows
  }
  if (Array.isArray(result)) return result as T[]
  return []
}

export async function getCustomerInvoices(customerId: string) {
  try {
    const rows = await db.execute(sql`
      SELECT
        si.id,
        si.invoice_number,
        si.created_at,
        si.total_amount,
        COUNT(ii.id) AS item_count
      FROM sales_invoices si
      LEFT JOIN invoice_items ii ON ii.invoice_id = si.id
      WHERE si.customer_id = ${customerId}::uuid
      GROUP BY si.id, si.invoice_number, si.created_at, si.total_amount
      ORDER BY si.created_at DESC
    `)
    const invoices = unpackRows(rows)
    return { success: true as const, invoices }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}
