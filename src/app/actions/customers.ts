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

export async function getCustomerStatement(customerId: string) {
  try {
    // 1. Customer profile + credit info
    const customerRows = unpackRows<{
      id: string; full_name: string; email: string | null; phone_number: string | null
      address: string | null; city: string | null; gstin: string | null
      customer_type: string | null; company_name: string | null
      loyalty_balance: number; credit_limit: string | null
      credit_balance: string | null; credit_payment_terms: string | null
      is_credit_eligible: boolean | null
    }>(await db.execute(sql`
      SELECT id, full_name, email, phone_number, address, city, gstin,
             customer_type, company_name, loyalty_balance,
             credit_limit, credit_balance, credit_payment_terms, is_credit_eligible
      FROM customers WHERE id = ${customerId}::uuid LIMIT 1
    `))
    if (!customerRows.length) return { success: false as const, error: 'Customer not found' }
    const customer = customerRows[0]

    // 2. All invoices (cash + credit)
    const invoiceRows = unpackRows<{
      id: string; invoice_number: string; created_at: string
      total_amount: string; payment_mode: string | null
      payment_status: string | null; amount_paid: string | null
      due_date: string | null; item_count: string
    }>(await db.execute(sql`
      SELECT si.id, si.invoice_number, si.created_at, si.total_amount,
             si.payment_mode, si.payment_status, si.amount_paid, si.due_date,
             COUNT(ii.id) AS item_count
      FROM sales_invoices si
      LEFT JOIN invoice_items ii ON ii.invoice_id = si.id
      WHERE si.customer_id = ${customerId}::uuid
      GROUP BY si.id, si.invoice_number, si.created_at, si.total_amount,
               si.payment_mode, si.payment_status, si.amount_paid, si.due_date
      ORDER BY si.created_at ASC
    `))

    // 3. Credit payments
    const paymentRows = unpackRows<{
      id: string; invoice_id: string; amount: string
      payment_mode: string; notes: string | null; created_at: string
      invoice_number: string | null
    }>(await db.execute(sql`
      SELECT cp.id, cp.invoice_id, cp.amount, cp.payment_mode,
             cp.notes, cp.created_at, si.invoice_number
      FROM credit_payments cp
      LEFT JOIN sales_invoices si ON si.id = cp.invoice_id
      WHERE cp.customer_id = ${customerId}::uuid
      ORDER BY cp.created_at ASC
    `))

    // 4. Loyalty points history
    const loyaltyRows = unpackRows<{
      id: string; type: string; points: number
      balance_after: number; description: string | null; created_at: string
    }>(await db.execute(sql`
      SELECT id, type, points, balance_after, description, created_at
      FROM loyalty_points
      WHERE customer_id = ${customerId}::uuid
      ORDER BY created_at ASC
    `))

    // 5. Summary calculations
    const totalSpend      = invoiceRows.reduce((s, i) => s + Number(i.total_amount), 0)
    const totalInvoices   = invoiceRows.length
    const creditInvoices  = invoiceRows.filter(i => i.payment_mode === 'credit')
    const totalOutstanding = creditInvoices.reduce((s, i) => s + Number(i.total_amount) - Number(i.amount_paid ?? 0), 0)
    const firstPurchase   = invoiceRows[0]?.created_at ?? null
    const lastPurchase    = invoiceRows[invoiceRows.length - 1]?.created_at ?? null

    return {
      success: true as const,
      customer, invoices: invoiceRows, payments: paymentRows,
      loyalty: loyaltyRows,
      summary: { totalSpend, totalInvoices, totalOutstanding, firstPurchase, lastPurchase },
    }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}
