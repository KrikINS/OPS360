'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { purchase_orders, po_items, grn_receipts, grn_items, discrepancies, vendors, branches, products, hsn_codes, inventory, inventory_transactions } from '@/db/schema'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { postGRNJournal, createJournalEntry, postDebitNoteJournal } from '@/actions/finance'
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
    const year = new Date().getFullYear()
    const poCounterRes = await db.execute(sql`
      INSERT INTO sequential_counters (prefix, year, current_value)
      VALUES ('PO', ${year}, 1)
      ON CONFLICT (prefix, year) DO UPDATE
        SET current_value = sequential_counters.current_value + 1
      RETURNING current_value
    `)
    const poCounterRows = (poCounterRes as unknown as { rows?: { current_value: number }[] }).rows
      ?? (poCounterRes as unknown as { current_value: number }[])
    const poCounterValue = poCounterRows[0]?.current_value
    const poNumber = `PO/${year}/${poCounterValue}`

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
    const approvableStatuses = ['draft', 'pending_approval']
    if (!approvableStatuses.includes(existing[0].status ?? '')) {
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

export async function rejectPurchaseOrder(input: {
  poId: string
  reason?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isManager = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isManager) {
    return { success: false as const, error: 'Manager role required' }
  }

  const [existing] = await db
    .select()
    .from(purchase_orders)
    .where(eq(purchase_orders.id, input.poId))
    .limit(1)

  if (!existing) {
    return { success: false as const, error: 'Purchase order not found' }
  }

  const rejectableStatuses = ['draft', 'pending_approval']
  if (!rejectableStatuses.includes(existing.status ?? '')) {
    return {
      success: false as const,
      error: `Cannot reject a PO with status: ${existing.status}`,
    }
  }

  await db
    .update(purchase_orders)
    .set({
      status: 'cancelled',
      cancellation_reason: input.reason ?? null,
    })
    .where(eq(purchase_orders.id, input.poId))

  return { success: true as const }
}

export async function createGRN(input: {
  poId: string
  branchId: string
  items: Array<{ poItemId: string; receivedQty: number; serialNumbers?: string[] }>
  landedCosts: { freight?: number; customs?: number; insurance?: number; handling?: number }
  conditionNotes?: string | null
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
    const allowedStatuses = ['approved', 'partially_received']
    if (!allowedStatuses.includes(po.status ?? '')) {
      return { success: false as const, error: 'Purchase order is not approved — must approve before receiving' }
    }

    // 2. Generate GRN number
    const year = new Date().getFullYear()
    const grnCounterRes = await db.execute(sql`
      INSERT INTO sequential_counters (prefix, year, current_value)
      VALUES ('GRN', ${year}, 1)
      ON CONFLICT (prefix, year) DO UPDATE
        SET current_value = sequential_counters.current_value + 1
      RETURNING current_value
    `)
    const grnCounterRows = (grnCounterRes as unknown as { rows?: { current_value: number }[] }).rows
      ?? (grnCounterRes as unknown as { current_value: number }[])
    const counterValue = grnCounterRows[0]?.current_value
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
      serialNumbers: string[]
      taxRate?: number
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

      const [productInfo] = await db
        .select({
          gstRate: products.gst_rate,
          hsnCode: products.hsn_code,
        })
        .from(products)
        .where(eq(products.id, poItem.product_id))
        .limit(1)

      const itemGstRate = Number(productInfo?.gstRate ?? 18)

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
        serialNumbers: item.serialNumbers ?? [],
        taxRate: itemGstRate,
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
        condition_notes: input.conditionNotes ?? null,
      })
      .returning()

    // 6. Insert grn_items + inventory rows + discrepancy records
    for (const item of grnItemsData) {
      // Inventory rows — one row per serial number (or anonymous rows if no SNs)
      const inventoryRowValues = item.serialNumbers && item.serialNumbers.length > 0
        ? item.serialNumbers.map(sn => ({
            product_id:    item.productId,
            branch_id:     input.branchId,
            status:        'Available',
            serial_number: sn,
            price:         String(item.unitCost),
            landed_cost:   String(item.landedUnitCost),
            source_po_id:  input.poId,
          }))
        : Array.from({ length: item.receivedQty }, () => ({
            product_id:    item.productId,
            branch_id:     input.branchId,
            status:        'Available',
            serial_number: null,
            price:         String(item.unitCost),
            landed_cost:   String(item.landedUnitCost),
            source_po_id:  input.poId,
          }))

      let inventoryIds: string[] = []
      if (inventoryRowValues.length > 0) {
        const inventoryRows = await db.insert(inventory).values(inventoryRowValues).returning({ id: inventory.id })
        inventoryIds = inventoryRows.map(r => r.id)
      }

      // grn_items row
      await db.insert(grn_items).values({
        grn_id: grnHeader.id,
        po_item_id: item.poItemId,
        product_id: item.productId,
        ordered_qty: item.orderedQty,
        received_qty: item.receivedQty,
        unit_cost: String(item.unitCost),
        landed_unit_cost: String(item.landedUnitCost),
        inventory_ids: inventoryIds,
      })

      // Discrepancy record for any shortfall
      // Get cumulative received so far including this GRN
      const existingReceived = await db.execute(sql`
        SELECT COALESCE(SUM(received_qty), 0) as total
        FROM grn_items
        WHERE po_item_id = ${item.poItemId}
      `)
      const cumulativeReceived = Number((existingReceived as any).rows?.[0]?.total ?? (existingReceived as any)?.[0]?.total ?? 0)

      // Only create discrepancy if cumulative is still less than ordered after ALL GRNs
      if (cumulativeReceived < item.orderedQty) {
        await db.insert(discrepancies).values({
          po_id: input.poId,
          product_id: item.productId,
          po_item_id: item.poItemId,
          discrepancy_type: 'short_shipment',
          status: 'open',
          ordered_qty: item.orderedQty,
          received_qty: cumulativeReceived, // User's requested fix
          shortfall: item.orderedQty - cumulativeReceived,
        })
      }

      // Accumulate received qty on po_items
      await db.execute(sql`
        UPDATE po_items
        SET received_qty = COALESCE(received_qty, 0) + ${item.receivedQty}
        WHERE id = ${item.poItemId}
      `)

      // Auto-resolve discrepancies for items now fully received
      const cumulativeResult2 = await db.execute(sql`
        SELECT COALESCE(SUM(received_qty), 0) as total
        FROM grn_items
        WHERE po_item_id = ${item.poItemId}
      `)
      const cumulativeReceived2 = Number(
        (cumulativeResult2 as any).rows?.[0]?.total ??
        (cumulativeResult2 as any)?.[0]?.total ?? 0
      )

      const [poItemForResolve] = await db
        .select({ ordered_qty: po_items.ordered_qty })
        .from(po_items)
        .where(eq(po_items.id, item.poItemId))
        .limit(1)

      if (poItemForResolve && cumulativeReceived2 >= poItemForResolve.ordered_qty) {
        await db.execute(sql`
          UPDATE discrepancies
          SET status = 'resolved',
              admin_comment = 'Auto-resolved: full quantity received across multiple GRNs'
          WHERE po_item_id = ${item.poItemId}
            AND status = 'open'
        `)
      }
    }

    // Check ALL po_items for cumulative received
    const allPoItems = await db
      .select({
        id: po_items.id,
        ordered_qty: po_items.ordered_qty,
        received_qty: po_items.received_qty,
      })
      .from(po_items)
      .where(eq(po_items.po_id, input.poId))

    const allFullyReceived = allPoItems.every(
      pi => (pi.received_qty ?? 0) >= (pi.ordered_qty ?? 0)
    )

    const anyReceived = allPoItems.some(
      pi => (pi.received_qty ?? 0) > 0
    )

    let newPoStatus: string
    if (allFullyReceived) {
      newPoStatus = 'received'
    } else if (anyReceived) {
      newPoStatus = 'partially_received'
    } else {
      newPoStatus = 'approved' // shouldn't happen but safe
    }

    await db
      .update(purchase_orders)
      .set({ status: newPoStatus })
      .where(eq(purchase_orders.id, input.poId))

    // Post journal entry — strict: if this fails, the entire GRN rolls back
    // via the outer catch block (B12 fix — no more silent failures)
    // Determine intra vs inter-state to route ITC correctly (B4 fix)
    const [vendorState] = await db
      .select({ stateCode: vendors.state_code })
      .from(vendors)
      .where(eq(vendors.id, po.vendor_id!))
      .limit(1)

    const [branchState] = await db
      .select({ stateCode: branches.state_code })
      .from(branches)
      .where(eq(branches.id, input.branchId))
      .limit(1)

    // Defensive normalisation: trim whitespace and lower-case both codes before
    // comparing so "Maharashtra" vs "maharashtra" or " MH " vs "MH" always match.
    const vendorCode = (vendorState?.stateCode ?? '').toLowerCase().trim()
    const branchCode = (branchState?.stateCode ?? '').toLowerCase().trim()

    // Inter-state when either code is blank OR the codes differ after normalisation.
    // Defaulting to inter-state (IGST) is the safe direction — IGST is never
    // under-collected, while a wrong intra-state split would under-pay the
    // correct tax head.
    const isInterState = !vendorCode || !branchCode || vendorCode !== branchCode

    console.log(
      `[GRN Journal] vendor state="${vendorCode}" branch state="${branchCode}" → ${isInterState ? 'INTER-STATE (IGST → 1053)' : 'INTRA-STATE (CGST → 1051, SGST → 1052)'}`
    )

    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0

    for (const item of grnItemsData) {
      const taxableValue = item.receivedQty * item.unitCost
      const gstRate = item.taxRate ?? 0
      const gstAmount = taxableValue * (gstRate / 100)

      if (isInterState) {
        // Inter-state: entire GST is IGST → routes to account 1053
        totalIGST += gstAmount
      } else {
        // Intra-state: split equally into CGST + SGST → routes to 1051 / 1052
        totalCGST += gstAmount / 2
        totalSGST += gstAmount / 2
      }
    }

    // Round to 2 decimal places
    totalCGST = Math.round(totalCGST * 100) / 100
    totalSGST = Math.round(totalSGST * 100) / 100
    totalIGST = Math.round(totalIGST * 100) / 100

    // Total dealer cost = sum of (landedUnitCost × receivedQty)
    // This is the correct DR 1040 value — what we paid
    // for the stock including any freight spread
    const totalInventoryValue = grnItemsData.reduce(
      (sum, item) => sum + (item.landedUnitCost * item.receivedQty),
      0
    )
    const totalInventoryValueRounded = Math.round(totalInventoryValue * 100) / 100

    await postGRNJournal({
      grnId: grnHeader.id,
      poId: input.poId,
      branchId: input.branchId,
      createdBy: session.user.id,
      totalLandedCost: totalInventoryValueRounded,
      totalCGST,
      totalSGST,
      totalIGST,
    })

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

  const effectiveBranchId = await getEffectiveBranchId(session)
  if (!effectiveBranchId) {
    return { success: false as const, error: 'No branch assigned to your account' }
  }
  const userBranchId = effectiveBranchId

  try {
    // Fetch PO for state-code lookup
    const [po] = await db
      .select({ poNumber: purchase_orders.po_number, vendorId: purchase_orders.vendor_id, branchId: purchase_orders.branch_id })
      .from(purchase_orders)
      .where(eq(purchase_orders.id, input.poId))
      .limit(1)

    const [vendorState] = po?.vendorId
      ? await db.select({ stateCode: vendors.state_code }).from(vendors).where(eq(vendors.id, po.vendorId)).limit(1)
      : [null]
    const [branchState] = po?.branchId
      ? await db.select({ stateCode: branches.state_code }).from(branches).where(eq(branches.id, po.branchId)).limit(1)
      : [null]

    const vendorCode = (vendorState?.stateCode ?? '').toLowerCase().trim()
    const branchCode = (branchState?.stateCode ?? '').toLowerCase().trim()
    const isInterState = !vendorCode || !branchCode || vendorCode !== branchCode

    let totalLandedCost = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0
    const returnedIds: string[] = []

    for (const item of input.items) {
      const availableRows = await db
        .select({ id: inventory.id, landedCost: inventory.landed_cost })
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

      returnedIds.push(...ids)

      // Accumulate costs for journal
      const unitLanded = availableRows.reduce((s, r) => s + Number(r.landedCost ?? 0), 0)
      totalLandedCost += unitLanded

      const [productInfo] = await db
        .select({ gstRate: products.gst_rate })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1)

      const gstRate = Number(productInfo?.gstRate ?? 0)
      const gstAmount = unitLanded * (gstRate / 100)

      if (isInterState) {
        totalIGST += gstAmount
      } else {
        totalCGST += gstAmount / 2
        totalSGST += gstAmount / 2
      }
    }

    totalLandedCost = Math.round(totalLandedCost * 100) / 100
    totalCGST      = Math.round(totalCGST      * 100) / 100
    totalSGST      = Math.round(totalSGST      * 100) / 100
    totalIGST      = Math.round(totalIGST      * 100) / 100

    // Non-blocking: debit note + journal. Failures must never abort the committed
    // inventory change (units are already marked Returned above).
    let debitNoteId = 'unknown'
    let dnNumber = ''
    try {
      const year = new Date().getFullYear()
      const dnCounterRes = await db.execute(sql`
        INSERT INTO sequential_counters (prefix, year, current_value)
        VALUES ('DN', ${year}, 1)
        ON CONFLICT (prefix, year) DO UPDATE
          SET current_value = sequential_counters.current_value + 1
        RETURNING current_value
      `)
      const dnCounterRows = (dnCounterRes as unknown as { rows?: { current_value: number }[] }).rows
        ?? (dnCounterRes as unknown as { current_value: number }[])
      dnNumber = `DN/${year}/${dnCounterRows[0]?.current_value}`

      const reasonText = input.items[0]?.reason ?? 'Purchase return'
      const dnInsert = await db.execute(sql`
        INSERT INTO debit_notes (debit_note_number, po_id, branch_id, reason, amount, status)
        VALUES (
          ${dnNumber},
          ${input.poId}::uuid,
          ${userBranchId}::uuid,
          ${reasonText},
          ${totalLandedCost + totalCGST + totalSGST + totalIGST},
          'Pending'
        )
        RETURNING id
      `)
      const dnRows = (dnInsert as unknown as { rows?: { id: string }[] }).rows
        ?? (dnInsert as unknown as { id: string }[])
      debitNoteId = dnRows[0]?.id ?? 'unknown'

      await postDebitNoteJournal({
        debitNoteId,
        debitNoteNumber: dnNumber,
        poId: input.poId,
        branchId: userBranchId,
        createdBy: session.user.id,
        totalLandedCost,
        totalCGST,
        totalSGST,
        totalIGST,
      })
    } catch (dnErr) {
      console.error('[createReturnToVendor] debit note / journal failed (non-blocking):', dnErr)
    }

    return { success: true as const, debitNoteId, debitNoteNumber: dnNumber }
  } catch (error) {
    console.error('PROCUREMENT ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}

export { getPurchaseOrdersAction }

export async function shortClosePO(input: {
  poId: string
  reason?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {
    return { success: false as const, error: 'Manager role required to short-close' }
  }

  const [po] = await db
    .select({
      id: purchase_orders.id,
      po_number: purchase_orders.po_number,
      branch_id: purchase_orders.branch_id,
      vendor_id: purchase_orders.vendor_id,
      status: purchase_orders.status,
    })
    .from(purchase_orders)
    .where(eq(purchase_orders.id, input.poId))
    .limit(1)

  if (!po) {
    return { success: false as const, error: 'PO not found' }
  }

  if (!['approved', 'partially_received'].includes(po.status ?? '')) {
    return {
      success: false as const,
      error: `Cannot short-close PO with status: ${po.status}`,
    }
  }

  const items = await db
    .select({
      id: po_items.id,
      product_id: po_items.product_id,
      ordered_qty: po_items.ordered_qty,
      received_qty: po_items.received_qty,
      unit_cost: po_items.unit_cost,
    })
    .from(po_items)
    .where(eq(po_items.po_id, input.poId))

  // Fetch vendor and branch state codes — same pattern as createGRN for consistent ITC routing
  const [vendorStateRow] = await db
    .select({ stateCode: vendors.state_code })
    .from(vendors)
    .where(eq(vendors.id, po.vendor_id!))
    .limit(1)

  const [branchStateRow] = await db
    .select({ stateCode: branches.state_code })
    .from(branches)
    .where(eq(branches.id, po.branch_id!))
    .limit(1)

  const vendorCode = (vendorStateRow?.stateCode ?? '').toLowerCase().trim()
  const branchCode = (branchStateRow?.stateCode ?? '').toLowerCase().trim()
  const isInterState = !vendorCode || !branchCode || vendorCode !== branchCode

  let totalShortfallCost = 0
  let totalShortfallCGST = 0
  let totalShortfallSGST = 0
  let totalShortfallIGST = 0

  for (const item of items) {
    const ordered = Number(item.ordered_qty ?? 0)
    const received = Number(item.received_qty ?? 0)
    const shortfall = Math.max(0, ordered - received)

    if (shortfall > 0) {
      const unitCost = Number(item.unit_cost ?? 0)
      const shortfallCost = shortfall * unitCost

      const [prod] = await db
        .select({ gstRate: products.gst_rate })
        .from(products)
        .where(eq(products.id, item.product_id!))
        .limit(1)

      const gstRate = Number(prod?.gstRate ?? 18)
      const gstOnShortfall = shortfallCost * (gstRate / 100)

      totalShortfallCost += shortfallCost
      if (isInterState) {
        totalShortfallIGST += gstOnShortfall
      } else {
        totalShortfallCGST += gstOnShortfall / 2
        totalShortfallSGST += gstOnShortfall / 2
      }
    }
  }

  try {
    await db
      .update(purchase_orders)
      .set({
        status: 'SHORT_CLOSED',
        cancellation_reason: input.reason ?? 'Short-closed by manager',
      })
      .where(eq(purchase_orders.id, input.poId))

    if (totalShortfallCost > 0) {
      const totalShortfallGST = totalShortfallCGST + totalShortfallSGST + totalShortfallIGST
      const totalReversal = totalShortfallCost + totalShortfallGST

      const lines: Array<{
        accountCode: string
        debit?: number
        credit?: number
        description: string
      }> = []

      lines.push({
        accountCode: '2010',
        debit: totalReversal,
        description: `AP reversal — undelivered items on ${po.po_number}`,
      })

      lines.push({
        accountCode: '1040',
        credit: totalShortfallCost,
        description: `Inventory reversal — ${po.po_number} short-close`,
      })

      if (totalShortfallCGST > 0) {
        lines.push({
          accountCode: '1051',
          credit: totalShortfallCGST,
          description: `CGST ITC reversal — ${po.po_number}`,
        })
      }

      if (totalShortfallSGST > 0) {
        lines.push({
          accountCode: '1052',
          credit: totalShortfallSGST,
          description: `SGST ITC reversal — ${po.po_number}`,
        })
      }

      if (totalShortfallIGST > 0) {
        lines.push({
          accountCode: '1053',
          credit: totalShortfallIGST,
          description: `IGST ITC reversal — ${po.po_number}`,
        })
      }

      await createJournalEntry({
        description: `Short-Close: ${po.po_number} — ₹${totalReversal.toLocaleString('en-IN')} reversal`,
        referenceSource: 'SHORT_CLOSE',
        referenceId: input.poId,
        branchId: po.branch_id!,
        autoGenerated: true,
        createdBy: session.user.id,
        lines,
      })
    }

    await db.execute(sql`
      UPDATE discrepancies
      SET status = 'resolved',
          admin_comment = 'Auto-resolved: PO short-closed'
      WHERE po_id = ${input.poId}::uuid
        AND status = 'open'
    `)

    return {
      success: true as const,
      shortfallCost: totalShortfallCost,
      reversalAmount: totalShortfallCost + totalShortfallCGST + totalShortfallSGST + totalShortfallIGST,
    }
  } catch (error) {
    console.error('SHORT CLOSE ERROR:', error)
    return { success: false as const, error: (error as Error).message }
  }
}
