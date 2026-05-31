'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { purchase_orders, po_items, grn_receipts, grn_items, discrepancies, vendors, branches, products, hsn_codes, inventory, inventory_transactions } from '@/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getPurchaseOrdersAction } from '@/app/actions/procurement'

export type PurchaseOrderItem = {
  productId: string
  orderedQty: number
  unitCost: number
}

export async function createPurchaseOrder(input: {
  branchId: string
  vendorId: string
  items: PurchaseOrderItem[]
  expectedDeliveryDate: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  if (role !== 'manager' && role !== 'admin' && role !== 'super_admin' && role !== 'admin/owner') {
    return { success: false as const, error: 'Insufficient permission: manager required' }
  }

  try {
    // Generate PO number using the sequential_counters table
    const year = new Date().getFullYear()
    await db.execute(sql`
      INSERT INTO sequential_counters (prefix, year, current_value)
      VALUES ('PO', ${year}, 1)
      ON CONFLICT (prefix, year) DO UPDATE
        SET current_value = sequential_counters.current_value + 1
    `)
    const counterRes = await db.execute(sql`
      SELECT current_value FROM sequential_counters WHERE prefix = 'PO' AND year = ${year}
    `)
    const counterResult = counterRes as unknown as { rows?: { current_value: number }[] } | { current_value: number }[]
    const counterValue = Array.isArray(counterResult)
      ? counterResult[0]?.current_value
      : (counterResult as { rows?: { current_value: number }[] }).rows?.[0]?.current_value
    const poNumber = `PO/${year}/${counterValue}`

    const totalAmount = input.items.reduce((s, i) => s + i.orderedQty * i.unitCost, 0)

    // ── Fetch vendor and branch state codes for GST determination ──
    const [vendorRow] = await db
      .select({ stateCode: vendors.state_code })
      .from(vendors)
      .where(eq(vendors.id, input.vendorId))
      .limit(1)

    const [branchRow] = await db
      .select({ stateCode: branches.state_code })
      .from(branches)
      .where(eq(branches.id, input.branchId))
      .limit(1)

    const isInterState = vendorRow?.stateCode !== branchRow?.stateCode

    // ── Calculate GST per line item ──
    // products.hsn_code is a text column matching hsn_codes.hsn_code
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0

    for (const item of input.items) {
      const lineValue = item.orderedQty * item.unitCost

      const [hsnRow] = await db
        .select({
          cgstRate: hsn_codes.cgst_rate,
          sgstRate: hsn_codes.sgst_rate,
          igstRate: hsn_codes.igst_rate,
        })
        .from(products)
        .innerJoin(hsn_codes, eq(products.hsn_code, hsn_codes.hsn_code))
        .where(eq(products.id, item.productId))
        .limit(1)

      if (hsnRow) {
        if (isInterState) {
          totalIgst += lineValue * (Number(hsnRow.igstRate) / 100)
        } else {
          totalCgst += lineValue * (Number(hsnRow.cgstRate) / 100)
          totalSgst += lineValue * (Number(hsnRow.sgstRate) / 100)
        }
      }
    }

    totalCgst = Math.round(totalCgst * 100) / 100
    totalSgst = Math.round(totalSgst * 100) / 100
    totalIgst = Math.round(totalIgst * 100) / 100

    const inserted = await db
      .insert(purchase_orders)
      .values({
        po_number: poNumber,
        status: 'draft',
        vendor_id: input.vendorId,
        branch_id: input.branchId,
        created_by: session.user.id,
        total_amount: String(totalAmount),
        cgst_amount: String(totalCgst),
        sgst_amount: String(totalSgst),
        igst_amount: String(totalIgst),
      })
      .returning()

    const rawPo = inserted[0]
    if (!rawPo) return { success: false as const, error: 'Insert returned no rows' }

    // Insert line items into po_items
    if (input.items.length > 0) {
      await db.insert(po_items).values(
        input.items.map(item => ({
          po_id: rawPo.id,
          product_id: item.productId,
          ordered_qty: item.orderedQty,
          unit_cost: String(item.unitCost),
        }))
      )
    }

    // Query back inserted po_items so callers have real IDs
    const insertedItems = await db
      .select()
      .from(po_items)
      .where(eq(po_items.po_id, rawPo.id))

    const po = {
      id: rawPo.id,
      poNumber: rawPo.po_number,
      status: rawPo.status,
      subtotal: rawPo.total_amount ? Number(rawPo.total_amount) : 0,
      cgst: rawPo.cgst_amount ? Number(rawPo.cgst_amount) : 0,
      sgst: rawPo.sgst_amount ? Number(rawPo.sgst_amount) : 0,
      igst: rawPo.igst_amount ? Number(rawPo.igst_amount) : 0,
      items: insertedItems.map(i => ({
        id: i.id,
        productId: i.product_id,
        orderedQty: i.ordered_qty,
        unitCost: Number(i.unit_cost),
      })),
    }

    return { success: true as const, po }
  } catch (error) { console.error('PROCUREMENT ERROR:', error);
    return { success: false as const, error: (error as Error).message }
  }
}

export async function approvePurchaseOrder(input: { poId: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  if (role !== 'manager' && role !== 'admin' && role !== 'super_admin' && role !== 'admin/owner') {
    return { success: false as const, error: 'Insufficient permission: manager required' }
  }

  try {
    const existing = await db
      .select()
      .from(purchase_orders)
      .where(eq(purchase_orders.id, input.poId))
      .limit(1)

    if (!existing[0]) {
      return { success: false as const, error: 'Purchase order not found' }
    }
    if (existing[0].status !== 'draft') {
      return { success: false as const, error: 'Purchase order cannot be approved — invalid status' }
    }

    const updated = await db
      .update(purchase_orders)
      .set({ status: 'approved', approved_by: session.user.id })
      .where(eq(purchase_orders.id, input.poId))
      .returning()

    if (!updated.length) {
      return { success: false as const, error: 'Purchase order not found' }
    }

    const rawPo = updated[0]
    const po = {
      id: rawPo.id,
      poNumber: rawPo.po_number,
      status: rawPo.status,
      approvedBy: rawPo.approved_by,
      approvedAt: new Date().toISOString(),
    }

    return { success: true as const, po }
  } catch (error) { console.error('PROCUREMENT ERROR:', error);
    return { success: false as const, error: (error as Error).message }
  }
}

export async function createGRN(input: {
  poId: string
  branchId: string
  items: Array<{ poItemId: string; receivedQty: number }>
  landedCosts: { freight?: number; customs?: number; insurance?: number; handling?: number }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  try {
    // 1. Verify PO is approved
    const [po] = await db
      .select()
      .from(purchase_orders)
      .where(eq(purchase_orders.id, input.poId))
      .limit(1)

    if (!po) return { success: false as const, error: 'Purchase order not found' }
    if (po.status !== 'approved') {
      return { success: false as const, error: 'Purchase order is not approved — must approve before receiving' }
    }

    // 2. Generate GRN number
    const year = new Date().getFullYear()
    await db.execute(sql`
      INSERT INTO sequential_counters (prefix, year, current_value)
      VALUES ('GRN', ${year}, 1)
      ON CONFLICT (prefix, year) DO UPDATE
        SET current_value = sequential_counters.current_value + 1
    `)
    const counterRes = await db.execute(sql`
      SELECT current_value FROM sequential_counters
      WHERE prefix = 'GRN' AND year = ${year}
    `)
    const counterResult = counterRes as unknown as { rows?: { current_value: number }[] } | { current_value: number }[]
    const counterValue = Array.isArray(counterResult)
      ? counterResult[0]?.current_value
      : (counterResult as { rows?: { current_value: number }[] }).rows?.[0]?.current_value
    const grnNumber = `GRN/${year}/${counterValue}`

    // 3. Total landed cost spread across all received units
    const totalLandedCost = Object.values(input.landedCosts)
      .reduce((sum, v) => sum + (v ?? 0), 0)
    const totalReceivedUnits = input.items.reduce((sum, i) => sum + i.receivedQty, 0)
    const landedCostPerUnit = totalReceivedUnits > 0
      ? totalLandedCost / totalReceivedUnits
      : 0

    // 4. Process each line item
    type GrnItemData = {
      poItemId: string
      productId: string
      orderedQty: number
      receivedQty: number
      unitCost: number
      landedUnitCost: number
      shortfall: number
    }
    const grnItemsData: GrnItemData[] = []
    let hasDiscrepancy = false

    for (const item of input.items) {
      const [poItem] = await db
        .select()
        .from(po_items)
        .where(eq(po_items.id, item.poItemId))
        .limit(1)

      if (!poItem) {
        return { success: false as const, error: `PO item not found: ${item.poItemId}` }
      }

      const shortfall = poItem.ordered_qty - item.receivedQty
      if (shortfall > 0) hasDiscrepancy = true

      const landedUnitCost = Math.round(
        (Number(poItem.unit_cost) + landedCostPerUnit) * 100
      ) / 100

      grnItemsData.push({
        poItemId: item.poItemId,
        productId: poItem.product_id,
        orderedQty: poItem.ordered_qty,
        receivedQty: item.receivedQty,
        unitCost: Number(poItem.unit_cost),
        landedUnitCost,
        shortfall,
      })
    }

    // 5. Insert grn_receipts header
    const [grnHeader] = await db
      .insert(grn_receipts)
      .values({
        grn_number: grnNumber,
        po_id: input.poId,
        branch_id: input.branchId,
        created_by: session.user.id,
        total_landed_cost: String(Math.round(totalLandedCost * 100) / 100),
        has_discrepancy: hasDiscrepancy,
      })
      .returning()

    // 6. Insert grn_items + inventory rows + discrepancy records
    for (const item of grnItemsData) {
      // grn_items row
      await db.insert(grn_items).values({
        grn_id: grnHeader.id,
        po_item_id: item.poItemId,
        product_id: item.productId,
        ordered_qty: item.orderedQty,
        received_qty: item.receivedQty,
        unit_cost: String(item.unitCost),
        landed_unit_cost: String(item.landedUnitCost),
      })

      // Inventory rows — one Available unit per received qty
      if (item.receivedQty > 0) {
        await db.insert(inventory).values(
          Array.from({ length: item.receivedQty }, () => ({
            product_id: item.productId,
            branch_id: input.branchId,
            status: 'Available',
            price: String(item.unitCost),
            landed_cost: String(item.landedUnitCost),
            source_po_id: input.poId,
          }))
        )
      }

      // Discrepancy record for any shortfall
      if (item.shortfall > 0) {
        await db.insert(discrepancies).values({
          po_id: input.poId,
          product_id: item.productId,
          po_item_id: item.poItemId,
          discrepancy_type: 'short_shipment',
          status: 'open',
          ordered_qty: item.orderedQty,
          received_qty: item.receivedQty,
          shortfall: item.shortfall,
        })
      }

      // Update po_items.received_qty
      await db
        .update(po_items)
        .set({ received_qty: item.receivedQty })
        .where(eq(po_items.id, item.poItemId))
    }

    return {
      success: true as const,
      grn: {
        id: grnHeader.id,
        grnNumber,
        poId: input.poId,
        hasDiscrepancy,
        discrepancyItems: grnItemsData
          .filter(i => i.shortfall > 0)
          .map(i => ({
            productId: i.productId,
            orderedQty: i.orderedQty,
            receivedQty: i.receivedQty,
            shortfall: i.shortfall,
          })),
        items: grnItemsData,
      },
    }
  } catch (error) { console.error('PROCUREMENT ERROR:', error);
    return { success: false as const, error: (error as Error).message }
  }
}

export async function createReturnToVendor(input: {
  poId: string
  items: Array<{ productId: string; qty: number; reason: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  if (role !== 'manager' && role !== 'admin' && role !== 'super_admin' && role !== 'admin/owner') {
    return { success: false as const, error: 'Insufficient permission: manager required' }
  }

  if (!session.user.branchId) {
    return { success: false as const, error: 'No branch assigned to your account' }
  }
  const userBranchId = session.user.branchId

  try {
    for (const item of input.items) {
      const availableRows = await db
        .select({ id: inventory.id })
        .from(inventory)
        .where(
          and(
            eq(inventory.product_id, item.productId),
            eq(inventory.branch_id, userBranchId),
            eq(inventory.status, 'Available')
          )
        )
        .limit(item.qty)

      if (availableRows.length < item.qty) {
        return {
          success: false as const,
          error: `Insufficient stock to return — only ${availableRows.length} units available for product ${item.productId}`,
        }
      }

      const ids = availableRows.map(r => r.id)

      await db
        .update(inventory)
        .set({ status: 'Returned', updated_at: new Date() })
        .where(inArray(inventory.id, ids))

      await db.insert(inventory_transactions).values(
        ids.map(id => ({
          product_id: item.productId,
          branch_id: userBranchId,
          transaction_type: 'return_to_vendor',
          quantity: -1,
          reference_id: input.poId,
          created_by: session.user.id,
          inventory_id: id,
        }))
      )
    }

    return { success: true as const }
  } catch (error) {
    console.error('PROCUREMENT ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

export { getPurchaseOrdersAction }
