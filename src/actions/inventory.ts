'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  processStockTransferAction,
  confirmTransferReceiptAction,
  getStockTransfersAction,
} from '@/app/actions/transfers'
import { fetchInventoryDataAction } from '@/app/actions/inventory'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import crypto from 'crypto'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
export async function requestStockTransfer(input: {
  fromBranchId: string
  toBranchId: string
  items: Array<{ productId: string; requestedQty: number }>
  notes: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  const allInventoryIds: string[] = []

  for (const item of input.items) {
    const availableUnits = await db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.product_id, item.productId),
          eq(schema.inventory.branch_id, input.fromBranchId),
          eq(schema.inventory.status, 'Available')
        )
      )
      .limit(item.requestedQty)

    if (availableUnits.length < item.requestedQty) {
      return { success: false as const, error: `Insufficient stock for product ${item.productId}` }
    }

    for (const unit of availableUnits) {
      allInventoryIds.push(unit.id)
    }
  }

  const result = await processStockTransferAction(
    input.fromBranchId,
    input.toBranchId,
    allInventoryIds,
    input.notes,
  )

  console.log('TRANSFER RESULT:', result)

  if (result.error) {
    return { success: false as const, error: result.error.message }
  }

  return {
    success: true as const,
    transfer: {
      id: String(result.data ?? ''),
      status: 'pending',
    },
  }
}

export async function approveStockTransfer(input: { transferId: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  // In the existing system, approval is implicit when a manager fulfills a request.
  // This is a placeholder that marks the transfer as approved in concept.
  return { success: true as const, transfer: { id: input.transferId, status: 'approved' as const } }
}

export async function completeStockTransfer(input: { transferId: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  const result = await confirmTransferReceiptAction(
    input.transferId,
    session.user.id,
    '',
  )

  if (result.error) {
    console.log('COMPLETE TRANSFER ERROR:', result.error.message)
    return { success: false as const, error: result.error.message }
  }

  return { success: true as const }
}

export async function rejectStockTransfer(input: {
  transferId: string
  reason?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  try {
    await db
      .update(schema.stock_transfers)
      .set({ status: 'rejected' })
      .where(eq(schema.stock_transfers.id, input.transferId))

    return { success: true as const, transfer: { id: input.transferId, status: 'rejected' as const } }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function adjustStock(input: {
  branchId: string
  productId: string
  adjustmentQty: number
  reason: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  if (!input.reason || !input.reason.trim()) {
    return { success: false as const, error: 'Reason required for stock adjustment' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  if (role !== 'manager' && role !== 'admin' && role !== 'super_admin' && role !== 'admin/owner') {
    return { success: false as const, error: 'Insufficient permission: manager required' }
  }

  const { adjustmentQty, productId, branchId } = input

  // c) Count current available inventory units
  const availableQuery = await db.execute(sql`
    SELECT COUNT(*) as count FROM inventory
    WHERE product_id = ${productId}::uuid
      AND branch_id = ${branchId}::uuid
      AND status = 'Available'
  `)
  const countResult = availableQuery as unknown as { rows?: { count: string }[] } | { count: string }[]
  const currentCount = parseInt(
    Array.isArray(countResult) ? countResult[0]?.count : countResult.rows?.[0]?.count ?? '0'
  )

  // d) Check if there's enough stock for negative adjustments
  if (adjustmentQty < 0 && Math.abs(adjustmentQty) > currentCount) {
    return { success: false as const, error: 'insufficient stock to reduce' }
  }

  if (adjustmentQty > 0) {
    // e) If positive: insert N new rows
    const newUnits = Array.from({ length: adjustmentQty }, () => ({
      id: crypto.randomUUID(),
      product_id: productId,
      branch_id: branchId,
      status: 'Available',
    }))
    await db.insert(schema.inventory).values(newUnits)
  } else if (adjustmentQty < 0) {
    // f) If negative: update N rows using a subquery
    await db.execute(sql`
      UPDATE inventory SET status = 'Written-off', updated_at = now()
      WHERE id IN (
        SELECT id FROM inventory
        WHERE product_id = ${productId}::uuid
          AND branch_id = ${branchId}::uuid
          AND status = 'Available'
        LIMIT ${Math.abs(adjustmentQty)}
      )
    `)
  }

  // Record an inventory transaction for the audit trail
  await db.execute(sql`
    INSERT INTO inventory_transactions (branch_id, product_id, created_by, transaction_type, quantity, reference_id)
    VALUES (${branchId}::uuid, ${productId}::uuid, ${session.user.id}::uuid, 'ADJUSTMENT', ${adjustmentQty}, ${crypto.randomUUID()}::uuid)
  `)

  return { success: true as const, adjustmentQty }
}

export async function getInventorySummary(input: { branchId: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  const effectiveBranchId = await getEffectiveBranchId(session)
  if (effectiveBranchId && effectiveBranchId !== input.branchId) {
    const role = (session.user.role ?? '').toLowerCase()
    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'admin/owner'
    if (!isAdmin) {
      return { success: false as const, error: 'Unauthorized: cannot access another branch' }
    }
  }

  const result = await fetchInventoryDataAction(session.user.id, input.branchId)
  const rawItems = result.data ?? []

  // fetchInventoryDataAction returns one row per inventory unit.
  // Group by product_id so we return one summary entry per unique product.
  const productMap = new Map<string, { productId: string; sku: string; availableQty: number; [key: string]: unknown }>()
  for (const item of rawItems) {
    const productId = (item.product_id ?? item.product?.id ?? String(item.id)) as string
    const sku = (item.product?.product_code ?? '') as string
    if (!productMap.has(productId)) {
      productMap.set(productId, { ...item, productId, sku, availableQty: 1 })
    } else {
      const existing = productMap.get(productId)!
      existing.availableQty = (existing.availableQty as number) + 1
    }
  }

  const products = Array.from(productMap.values())

  return { success: true as const, products }
}

export async function allocateSerialNumber(input: {
  productId: string
  branchId: string
  serialNumber: string
  transactionId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await db.transaction(async (tx) => {
      // a) Find the serial number row
      const rows = await tx.select()
        .from(schema.serialNumbers)
        .where(
          and(
            eq(schema.serialNumbers.serialNumber, input.serialNumber),
            eq(schema.serialNumbers.productId, input.productId),
            eq(schema.serialNumbers.branchId, input.branchId)
          )
        )
        .limit(1)
        .for('update')

      // b) If not found
      if (rows.length === 0) {
        return { success: false, error: 'Serial number not found' }
      }

      const row = rows[0]

      // c) If found but status != 'available'
      if (row.status !== 'available') {
        return { success: false, error: 'Serial number not available — already sold or reserved' }
      }

      // d) Update the row
      await tx.update(schema.serialNumbers)
        .set({
          status: 'sold',
          transactionId: input.transactionId,
        })
        .where(eq(schema.serialNumbers.id, row.id))

      // e) Return success
      return { success: true }
    })
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getInventoryRegistryAction() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  try {
    const rows = await db
      .select({
        id:           schema.inventory.id,
        serial_number: schema.inventory.serial_number,
        status:       schema.inventory.status,
        branch_id:    schema.inventory.branch_id,
        branch_name:  schema.branches.name,
        product_id:   schema.inventory.product_id,
        price:        schema.inventory.price,
        landed_cost:  schema.inventory.landed_cost,
        source_po_id: schema.inventory.source_po_id,
        created_at:   schema.inventory.created_at,
        hsn_code:     schema.products.hsn_code,
        product: {
          id:              schema.products.id,
          brand:           schema.products.brand,
          model_name:      schema.products.model_name,
          category:        schema.products.category,
          description:     schema.products.description,
          product_code:    schema.products.product_code,
          base_price:      schema.products.base_price,
          min_stock_level: schema.products.min_stock_level,
          tracking_type:   schema.products.tracking_type,
        },
      })
      .from(schema.inventory)
      .leftJoin(schema.products, eq(schema.inventory.product_id, schema.products.id))
      .leftJoin(schema.branches, eq(schema.inventory.branch_id, schema.branches.id))
      .orderBy(schema.inventory.created_at)

    return { success: true as const, data: rows }
  } catch (error) {
    console.error('INVENTORY REGISTRY ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

export { getStockTransfersAction }
