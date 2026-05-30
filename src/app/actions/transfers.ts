"use server"

import { db } from "@/db/client"
import { inventory, products, user_permissions, profiles } from "@/db/schema"
import { eq, sql, and, ilike, or } from "drizzle-orm"

export async function getWaybillDataAction(transferNumber: string) {
  try {
    const res = await db.execute(sql`SELECT * FROM waybills WHERE transfer_number = ${transferNumber}`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result[0] : result.rows?.[0]
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getStockTransfersAction() {
  try {

    // we would need branches, waybills, items mapped, but doing a raw query is easier to match old UI structure
    const res = await db.execute(sql`
      SELECT st.*, 
        row_to_json(sb.*) as source_branch,
        row_to_json(db.*) as destination_branch,
        (SELECT json_agg(w.*) FROM waybills w WHERE w.transfer_id = st.id) as waybill,
        (SELECT json_agg(sti.*) FROM stock_transfer_items sti WHERE sti.transfer_id = st.id) as items
      FROM stock_transfers st
      LEFT JOIN branches sb ON st.source_branch_id = sb.id
      LEFT JOIN branches db ON st.destination_branch_id = db.id
      ORDER BY st.created_at DESC
    `)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const mapped = Array.isArray(result) ? result : result.rows || []
    return { data: mapped }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getUserProfileAction(userId: string) {
  try {
    const data = await db.select().from(profiles).where(eq(profiles.id, userId))
    return { data: data[0] }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getUserPermissionsAction(userId: string, module: string) {
  try {
    const data = await db.select().from(user_permissions).where(and(eq(user_permissions.user_id, userId), eq(user_permissions.module, module), eq(user_permissions.enabled, true)))
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getPendingDemandsAction(branchId: string) {
  try {
    const res = await db.execute(sql`
      SELECT sr.*, 
        row_to_json(rb.*) as requesting_branch,
        (SELECT json_agg(
          json_build_object(
            'id', sri.id,
            'product_id', sri.product_id,
            'quantity', sri.quantity,
            'product', row_to_json(p.*)
          )
        ) FROM stock_request_items sri LEFT JOIN products p ON sri.product_id = p.id WHERE sri.request_id = sr.id) as items
      FROM stock_requests sr
      LEFT JOIN branches rb ON sr.requesting_branch_id = rb.id
      WHERE sr.status = 'Pending' AND sr.source_branch_id = ${branchId}
    `)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getProductStockCountAction(productId: string, branchId: string) {
  try {
    const res = await db.execute(sql`SELECT count(*) FROM inventory WHERE product_id = ${productId} AND branch_id = ${branchId} AND status = 'Available'`)
    const result = res as unknown as { rows?: { count: string }[] } | { count: string }[]
    const countStr = Array.isArray(result) ? result[0]?.count : result.rows?.[0]?.count
    return { data: parseInt(countStr || "0", 10) }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function searchProductsForTransferAction(term: string) {
  try {
    // simplified search
    const searchTerm = `%${term}%`
    const data = await db.select().from(products).where(
      or(ilike(products.model_name, searchTerm), ilike(products.product_code, searchTerm))
    ).limit(10)
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getAvailableUnitsAction(productId: string, branchId: string) {
  try {
    const data = await db.select({
      id: inventory.id,
      serial_number: inventory.serial_number,
      product_id: inventory.product_id,
      status: inventory.status
    }).from(inventory).where(and(
      eq(inventory.product_id, productId),
      eq(inventory.branch_id, branchId),
      eq(inventory.status, 'Available')
    )).limit(50)
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function processStockTransferAction(sourceId: string, destId: string, inventoryIds: string[], notes: string) {
  try {
    const inventoryArr = `{${inventoryIds.join(',')}}`
    const res = await db.execute(sql`SELECT process_stock_transfer_send(${sourceId}, ${destId}, ${inventoryArr}::uuid[], ${notes})`)
    const result = res as unknown as { rows?: { process_stock_transfer_send: string }[] } | { process_stock_transfer_send: string }[]
    const transferNumber = Array.isArray(result) ? result[0]?.process_stock_transfer_send : result.rows?.[0]?.process_stock_transfer_send
    return { data: transferNumber }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function fulfillStockRequestAction(requestId: string, inventoryIds: string[]) {
  try {
    const inventoryArr = `{${inventoryIds.join(',')}}`
    const res = await db.execute(sql`SELECT fulfill_stock_request(${requestId}, ${inventoryArr}::uuid[])`)
    const result = res as unknown as { rows?: { fulfill_stock_request: string }[] } | { fulfill_stock_request: string }[]
    const transferNumber = Array.isArray(result) ? result[0]?.fulfill_stock_request : result.rows?.[0]?.fulfill_stock_request
    return { data: transferNumber }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getTransferItemsAction(transferId: string) {
  try {
    const res = await db.execute(sql`
      SELECT sti.inventory_id,
        json_build_object('serial_number', i.serial_number) as inventory,
        json_build_object('id', p.id, 'model_name', p.model_name) as product
      FROM stock_transfer_items sti
      LEFT JOIN inventory i ON sti.inventory_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE sti.transfer_id = ${transferId}
    `)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function confirmTransferReceiptAction(transferId: string, userId: string, notes: string) {
  try {
    await db.execute(sql`SELECT process_stock_transfer_receive(${transferId}, ${userId}, ${notes})`)
    return { success: true }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}
