"use server"

import { db } from "@/db/client"
import { profiles, branches, customers, inventory, products } from "@/db/schema"
import { eq, sql, and } from "drizzle-orm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies } from "next/headers"
import { hasCapability, branchFilterFor } from "@/lib/access"

export async function getUserPosStatsAction() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return { data: [] }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }

    const cookieStore = await cookies()
    const branchId = session.user.branchId
      ?? cookieStore.get('activeBranchId')?.value
      ?? null

    const res = await db.execute(
      sql`SELECT * FROM get_user_pos_stats(
        ${session.user.id}::uuid,
        ${branchId}::uuid
      )`
    )
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function updatePosPinAction(userId: string, newPin: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (session.user.id !== userId && !(await hasCapability("admin", "edit", session))) return { error: { message: "Insufficient permission" } }
    await db.execute(sql`UPDATE profiles SET pos_pin = ${newPin} WHERE id = ${userId}`)
    return { success: true }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getPosInventoryAction(branchId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }
    const data = await db.select().from(inventory).where(and(eq(inventory.branch_id, branchId), eq(inventory.status, 'Available')))
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getPosProductsAction(productIds: string[]) {
  if (!productIds.length) return { data: [] }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }
    const data = await db.select().from(products).where(sql`${products.id} = ANY(${productIds})`)
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getAllPosProductsAction() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }
    const data = await db.select().from(products)
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function searchCustomerByPhoneAction(phone: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }
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
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }
    const res = await db.execute(sql`SELECT * FROM search_pos_customers(${term})`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function processPosSaleAction(payload: Record<string, unknown>) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: { message: "Unauthorized" } }
  if (!(await hasCapability("sales", "edit", session))) {
    return { error: { message: "Insufficient permission" } }
  }
  const branchId = (payload?.branch_id ?? payload?.branchId) as string | undefined
  const allowed = await branchFilterFor(session, "sales", "edit")
  if (allowed !== null && (!branchId || !allowed.includes(branchId))) {
    return { error: { message: "You don't have access to this branch" } }
  }
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
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }

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
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }
    const res = await db.execute(sql`SELECT * FROM view_invoice_details WHERE invoice_id = ${id}`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

// ── getInvoiceItemsForReturnAction ──────────────────
// Fetches invoice items enriched with derived GST amounts for the return form.
// NOTE: invoice_items has NO cgst/sgst/igst columns. GST is derived from
// products.gst_rate using the tax-inclusive formula:
//   total_gst_per_unit = unit_price * gst_rate / (100 + gst_rate)
//   cgst_per_unit = sgst_per_unit = total_gst_per_unit / 2  (intra-state assumed)
export async function getInvoiceItemsForReturnAction(invoiceId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: { message: 'Unauthorized' } }
  if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }

  try {
    const res = await db.execute(sql`
      SELECT
        ii.id                                                              AS invoice_item_id,
        ii.product_id,
        p.model_name,
        p.brand,
        ii.qty,
        ii.unit_price,
        COALESCE(ii.cost_price, inv_cost.landed_cost, 0)                  AS cost_price,
        COALESCE(p.gst_rate, 0)::numeric                                   AS gst_rate,
        ROUND(
          ii.unit_price::numeric
          * COALESCE(p.gst_rate, 0)::numeric
          / (100 + COALESCE(p.gst_rate, 0)::numeric)
          / 2,
          2
        )                                                                  AS cgst_per_unit,
        ROUND(
          ii.unit_price::numeric
          * COALESCE(p.gst_rate, 0)::numeric
          / (100 + COALESCE(p.gst_rate, 0)::numeric)
          / 2,
          2
        )                                                                  AS sgst_per_unit,
        0::numeric                                                         AS igst_per_unit,
        ii.discount_amount,
        inv_sn.id                                                          AS inventory_id,
        inv_sn.serial_number
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      LEFT JOIN LATERAL (
        SELECT landed_cost FROM inventory
        WHERE invoice_item_id = ii.id
          AND status = 'Sold'
        LIMIT 1
      ) inv_cost ON true
      LEFT JOIN LATERAL (
        SELECT id, serial_number FROM inventory
        WHERE invoice_item_id = ii.id
          AND status = 'Sold'
        LIMIT 1
      ) inv_sn ON true
      WHERE ii.invoice_id = ${invoiceId}::uuid
        AND EXISTS (SELECT 1 FROM inventory s WHERE s.invoice_item_id = ii.id AND s.status = 'Sold')
    `)

    const rows = ((res as unknown as { rows?: unknown[] }).rows ?? res) as {
      invoice_item_id: string
      product_id:      string
      model_name:      string
      brand:           string | null
      qty:             number
      unit_price:      string
      cost_price:      string
      gst_rate:        string
      cgst_per_unit:   string
      sgst_per_unit:   string
      igst_per_unit:   string
      discount_amount: string | null
      inventory_id:    string | null
      serial_number:   string | null
    }[]

    const items = rows.map(r => ({
      invoiceItemId:  r.invoice_item_id,
      productId:      r.product_id,
      modelName:      r.model_name,
      brand:          r.brand ?? '',
      qty:            Number(r.qty),
      unitPrice:      Number(r.unit_price),
      costPrice:      Number(r.cost_price),
      gstRate:        Number(r.gst_rate),
      cgstPerUnit:    Number(r.cgst_per_unit),
      sgstPerUnit:    Number(r.sgst_per_unit),
      igstPerUnit:    Number(r.igst_per_unit),
      discountAmount: Number(r.discount_amount ?? 0),
      inventoryId:    r.inventory_id ?? undefined,
      serialNumber:   r.serial_number ?? undefined,
    }))

    return { data: items }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function scanSerialAtPosAction(
  serial: string,
  branchId: string
): Promise<
  | { data: { inventoryId: string; productId: string } }
  | { error: 'not_found' | 'unavailable' | 'wrong_branch' | 'unauthorized' }
> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: 'unauthorized' }
    if (!(await hasCapability("sales", "edit", session))) return { error: 'unauthorized' }
    const rows = await db
      .select()
      .from(inventory)
      .where(sql`UPPER(${inventory.serial_number}) = UPPER(${serial})`)
      .limit(1)

    if (!rows.length) return { error: 'not_found' }

    const row = rows[0]
    if (row.branch_id !== branchId) return { error: 'wrong_branch' }
    if (row.status !== 'Available') return { error: 'unavailable' }

    return { data: { inventoryId: row.id, productId: row.product_id as string } }
  } catch (error) {
    console.error('scanSerialAtPosAction error:', error)
    return { error: 'not_found' }
  }
}

export async function getPosInitialDataAction(userId: string, branchId?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }
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
