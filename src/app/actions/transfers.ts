"use server"

import { db } from "@/db/client"
import { inventory, products, user_permissions, profiles, stock_requests, stock_transfers } from "@/db/schema"
import { eq, sql, and, ilike, or, inArray } from "drizzle-orm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { branchFilterFor, hasCapability } from "@/lib/access"

export async function getWaybillDataAction(transferNumber: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "view", session))) {
      return { error: { message: "Insufficient permission" } }
    }
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
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "view", session))) {
      return { error: { message: "Insufficient permission" } }
    }
    const allowed = await branchFilterFor(session, "inventory", "view")

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
      ${allowed !== null ? sql`WHERE st.source_branch_id = ANY(${allowed}::uuid[]) OR st.destination_branch_id = ANY(${allowed}::uuid[])` : sql``}
      ORDER BY st.created_at DESC
    `)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const mapped = Array.isArray(result) ? result : result.rows || []
    return { data: mapped }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getUserProfileAction() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    const data = await db.select().from(profiles).where(eq(profiles.id, session.user.id))
    return { data: data[0] }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getUserPermissionsAction(module: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    const data = await db.select().from(user_permissions).where(and(eq(user_permissions.user_id, session.user.id), eq(user_permissions.module, module), eq(user_permissions.enabled, true)))
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getPendingDemandsAction(branchId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "view", session))) {
      return { error: { message: "Insufficient permission" } }
    }
    const allowedBranches = await branchFilterFor(session, "inventory", "view")
    if (allowedBranches !== null && !allowedBranches.includes(branchId)) {
      return { error: { message: "Insufficient permission for this branch" } }
    }

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

export async function getBranchStockRequestsAction(branchId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }

    const allowedBranches = await branchFilterFor(session, "inventory", "view")
    if (allowedBranches !== null && !allowedBranches.includes(branchId)) {
      return { error: { message: "Insufficient permission for this branch" } }
    }

    const res = await db.execute(sql`
      SELECT sr.*, 
        row_to_json(rb.*) as requesting_branch,
        row_to_json(sb.*) as source_branch,
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
      LEFT JOIN branches sb ON sr.source_branch_id = sb.id
      WHERE sr.requesting_branch_id = ${branchId} OR sr.source_branch_id = ${branchId}
      ORDER BY sr.created_at DESC
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
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "view", session))) {
      return { error: { message: "Insufficient permission" } }
    }
    const allowedBranches = await branchFilterFor(session, "inventory", "view")
    if (allowedBranches !== null && !allowedBranches.includes(branchId)) {
      return { error: { message: "Insufficient permission for this branch" } }
    }

    const res = await db.execute(sql`SELECT count(*) FROM inventory WHERE product_id = ${productId} AND branch_id = ${branchId} AND status = 'Available'`)
    const result = res as unknown as { rows?: { count: string }[] } | { count: string }[]
    const countStr = Array.isArray(result) ? result[0]?.count : result.rows?.[0]?.count
    return { data: parseInt(countStr || "0", 10) }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function searchProductsForTransferAction(term: string, branchId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "view", session))) {
      return { error: { message: "Insufficient permission" } }
    }
    const allowedBranches = await branchFilterFor(session, "inventory", "view")
    if (allowedBranches !== null && !allowedBranches.includes(branchId)) {
      return { error: { message: "Insufficient permission for this branch" } }
    }

    const searchTerm = `%${term}%`
    
    // We use sql.raw to allow the dynamic branchId without parameter mapping issues, 
    // or better, parameterized sql.
    const res = await db.execute(sql`
      SELECT p.*, COUNT(i.id) FILTER (WHERE i.status = 'Available')::int as available_units
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ${branchId}
      WHERE p.model_name ILIKE ${searchTerm} OR p.product_code ILIKE ${searchTerm}
      GROUP BY p.id
      LIMIT 10
    `)
    
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getAvailableUnitsAction(productId: string, branchId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "view", session))) {
      return { error: { message: "Insufficient permission" } }
    }
    const allowedBranches = await branchFilterFor(session, "inventory", "view")
    if (allowedBranches !== null && !allowedBranches.includes(branchId)) {
      return { error: { message: "Insufficient permission for this branch" } }
    }

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
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "edit", session))) {
      return { error: { message: "Insufficient permission" } }
    }
    const allowedBranches = await branchFilterFor(session, "inventory", "edit")
    if (allowedBranches !== null && !allowedBranches.includes(sourceId)) {
      return { error: { message: "Insufficient permission for this source branch" } }
    }

    const inventoryArr = `{${inventoryIds.join(',')}}`
    const res = await db.execute(sql`SELECT process_stock_transfer_send(${sourceId}, ${destId}, ${inventoryArr}::uuid[], ${notes})`)
    const result = res as unknown as { rows?: { process_stock_transfer_send: string }[] } | { process_stock_transfer_send: string }[]
    const transferNumber = Array.isArray(result) ? result[0]?.process_stock_transfer_send : result.rows?.[0]?.process_stock_transfer_send
    
    if (transferNumber && inventoryIds.length > 0) {
      await db.update(inventory).set({ status: 'In Transit' }).where(inArray(inventory.id, inventoryIds))
    }

    return { data: transferNumber }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function fulfillStockRequestAction(requestId: string, inventoryIds: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "edit", session))) {
      return { error: { message: "Insufficient permission" } }
    }

    const reqRes = await db.select().from(stock_requests).where(eq(stock_requests.id, requestId))
    if (!reqRes.length || !reqRes[0]) return { error: { message: "Stock request not found" } }
    
    const req = reqRes[0]
    if (!req.source_branch_id || !req.requesting_branch_id) {
      return { error: { message: "Stock request missing branch information" } }
    }

    const inventoryArr = `{${inventoryIds.join(',')}}`
    const res = await db.execute(sql`SELECT process_stock_transfer_send(${req.source_branch_id}, ${req.requesting_branch_id}, ${inventoryArr}::uuid[], ${'Fulfilled request ' + req.request_number})`)
    const result = res as unknown as { rows?: { process_stock_transfer_send: string }[] } | { process_stock_transfer_send: string }[]
    const transferNumber = Array.isArray(result) ? result[0]?.process_stock_transfer_send : result.rows?.[0]?.process_stock_transfer_send

    if (transferNumber) {
      await db.update(stock_transfers).set({ stock_request_id: requestId }).where(eq(stock_transfers.transfer_number, transferNumber))
      await db.update(stock_requests).set({ status: 'FULFILLED' }).where(eq(stock_requests.id, requestId))
      
      if (inventoryIds.length > 0) {
        await db.update(inventory).set({ status: 'In Transit' }).where(inArray(inventory.id, inventoryIds))
      }
    }

    return { data: transferNumber }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getTransferItemsAction(transferId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "view", session))) {
      return { error: { message: "Insufficient permission" } }
    }

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

export async function confirmTransferReceiptAction(transferId: string, notes: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: "Unauthorized" } }
    if (!(await hasCapability("inventory", "edit", session))) {
      return { error: { message: "Insufficient permission" } }
    }

    await db.execute(sql`SELECT process_stock_transfer_receive(${transferId}, ${session.user.id}, ${notes})`)
    return { success: true }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}
