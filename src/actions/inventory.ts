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
import { eq, and, sql } from 'drizzle-orm'
import crypto from 'crypto'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
import { hasCapability, branchFilterFor } from '@/lib/access'
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
    console.error('COMPLETE TRANSFER ERROR:', result.error.message)
    return { success: false as const, error: result.error.message }
  }

  // Post transfer journal non-blocking
  try {
    // Fetch transfer details needed for the journal
    const transferRes = await db.execute(sql`
      SELECT
        st.source_branch_id,
        st.destination_branch_id,
        st.transfer_number,
        COUNT(sti.id)  AS item_count,
        COALESCE(SUM(i.landed_cost), 0) AS total_landed_cost
      FROM stock_transfers st
      JOIN stock_transfer_items sti
        ON sti.transfer_id = st.id
      JOIN inventory i
        ON i.id = sti.inventory_id
      WHERE st.id = ${input.transferId}::uuid
      GROUP BY st.source_branch_id,
               st.destination_branch_id,
               st.transfer_number
    `)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (transferRes as any).rows ?? transferRes
    const t = rows[0]

    if (t && Number(t.total_landed_cost) > 0) {
      const { postTransferJournal } =
        await import('@/actions/finance')
      await postTransferJournal({
        transferId:      input.transferId,
        sourceBranchId:  String(t.source_branch_id),
        destBranchId:    String(t.destination_branch_id),
        createdBy:       session.user.id,
        totalLandedCost: Number(t.total_landed_cost),
        itemCount:       Number(t.item_count),
        transferNumber:  String(t.transfer_number ?? input.transferId),
      })
    } else {
      console.warn(
        '[TRANSFER] Journal skipped — total_landed_cost is 0 ' +
        'or transfer not found for id:', input.transferId
      )
    }
  } catch (journalErr) {
    console.error(
      '[TRANSFER] Journal FAILED — transfer already ' +
      'confirmed, ledger entry missing:', journalErr
    )
    // Non-blocking — transfer already committed
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

  if (!(await hasCapability("inventory", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }

  const { adjustmentQty, productId, branchId } = input

  const adjAllowed = await branchFilterFor(session, "inventory", "edit")
  if (adjAllowed !== null && !adjAllowed.includes(branchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }

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
    // Fetch landed_cost of the units about to be written off (FIFO order)
    const unitsToWriteOff = await db.execute(sql`
      SELECT id, COALESCE(landed_cost, 0) AS landed_cost
      FROM inventory
      WHERE product_id = ${productId}::uuid
        AND branch_id = ${branchId}::uuid
        AND status = 'Available'
      ORDER BY created_at ASC
      LIMIT ${Math.abs(adjustmentQty)}
    `)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writeOffRows = (unitsToWriteOff as any).rows ?? unitsToWriteOff
    const totalWriteOffCost = writeOffRows.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, r: any) => sum + Number(r.landed_cost ?? 0), 0
    )

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

    if (totalWriteOffCost > 0) {
      try {
        const { createJournalEntry } = await import('@/actions/finance')
        await createJournalEntry({
          description:
            `Inventory write-off: ` +
            `${Math.abs(adjustmentQty)} unit(s) — ` +
            `${input.reason}`,
          referenceSource: 'ADJUSTMENT',
          referenceId: crypto.randomUUID(),
          branchId,
          autoGenerated: true,
          createdBy: session.user.id,
          lines: [
            {
              accountCode: '5090',
              debit: Math.round(totalWriteOffCost * 100) / 100,
              description:
                `Write-off: ${Math.abs(adjustmentQty)} unit(s) — ${input.reason}`,
            },
            {
              accountCode: '1040',
              credit: Math.round(totalWriteOffCost * 100) / 100,
              description: 'Inventory asset reduced',
            },
          ],
        })
      } catch (journalErr) {
        console.error(
          '[ADJUSTMENT] Write-off journal FAILED — inventory already updated:',
          journalErr
        )
      }
    }
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

  if (!(await hasCapability("inventory", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
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

import { products } from '@/db/schema'

export async function getLowStockItems(input?: { branchId?: string | null }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!(await hasCapability("inventory", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }

  try {
    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.model_name,
        p.brand,
        p.product_code,
        p.min_stock_level,
        p.base_price,
        p.vendor_id,
        v.name AS vendor_name,
        v.id   AS vendor_id_check,
        COUNT(CASE WHEN i.status = 'Available' THEN 1 END) AS available_units,
        COUNT(CASE WHEN i.status = 'Available' THEN 1 END) AS total_available
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      LEFT JOIN vendors v ON v.id = p.vendor_id
      WHERE p.min_stock_level > 0
      GROUP BY p.id, p.model_name, p.brand, p.product_code,
               p.min_stock_level, p.base_price, p.vendor_id, v.name, v.id
      HAVING COUNT(CASE WHEN i.status = 'Available' THEN 1 END) <= p.min_stock_level
      ORDER BY available_units ASC, p.model_name ASC
    `)

    function unpackRows<T = Record<string, unknown>>(result: unknown): T[] {
      if (result && typeof result === 'object' && 'rows' in result) return (result as { rows: T[] }).rows
      if (Array.isArray(result)) return result as T[]
      return []
    }

    const items = unpackRows(rows).map((r: any) => ({
      id:              r.id as string,
      model_name:      r.model_name as string,
      brand:           r.brand as string,
      product_code:    r.product_code as string,
      min_stock_level: Number(r.min_stock_level),
      base_price:      Number(r.base_price),
      vendor_id:       r.vendor_id as string | null,
      vendor_name:     r.vendor_name as string | null,
      available_units: Number(r.available_units),
      total_available: Number(r.total_available),
    }))

    return { success: true as const, items }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function updateMinStockLevel(input: {
  productId: string
  minStockLevel: number
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!(await hasCapability("inventory", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  if (input.minStockLevel < 0) return { success: false as const, error: 'Min stock level cannot be negative' }
  try {
    await db.update(products)
      .set({ min_stock_level: input.minStockLevel })
      .where(eq(products.id, input.productId))
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function assignVendorToProduct(input: { productId: string, vendorId: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!(await hasCapability("inventory", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  try {
    await db.update(products).set({ vendor_id: input.vendorId }).where(eq(products.id, input.productId))
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function getAllProductsWithStockLevel(input?: { branchId?: string | null }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!(await hasCapability("inventory", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  try {
    const rows = await db.execute(sql`
      SELECT
        p.id, p.model_name, p.brand, p.product_code, p.min_stock_level, p.vendor_id,
        v.name AS vendor_name,
        COUNT(CASE WHEN i.status = 'Available' THEN 1 END) AS available_units
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      LEFT JOIN vendors v ON v.id = p.vendor_id
      GROUP BY p.id, p.model_name, p.brand, p.product_code, p.min_stock_level, p.vendor_id, v.name
      ORDER BY p.model_name ASC
    `)
    function unpackRows<T = Record<string, unknown>>(result: unknown): T[] {
      if (result && typeof result === 'object' && 'rows' in result) return (result as { rows: T[] }).rows
      if (Array.isArray(result)) return result as T[]
      return []
    }
    const items = unpackRows(rows).map((r: any) => ({
      id: r.id as string, model_name: r.model_name as string,
      brand: r.brand as string, product_code: r.product_code as string,
      min_stock_level: Number(r.min_stock_level ?? 0),
      vendor_id: r.vendor_id as string | null, vendor_name: r.vendor_name as string | null,
      available_units: Number(r.available_units ?? 0),
    }))
    return { success: true as const, items }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}