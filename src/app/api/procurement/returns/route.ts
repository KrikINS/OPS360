import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { inventory, inventory_transactions, purchase_orders, vendors, branches, products } from '@/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { postDebitNoteJournal } from '@/actions/finance'

export async function GET() {
  return NextResponse.json({ data: [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const role = (session.user.role ?? '').toLowerCase()
  const isManager = ['manager', 'admin', 'super_admin', 'admin/owner'].includes(role)
  if (!isManager) {
    return NextResponse.json({ success: false, error: 'Manager role required' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const poId          = formData.get('po_id') as string | null
    const serialsRaw    = formData.get('serial_numbers') as string | null
    const reason        = formData.get('reason') as string | null

    if (!poId || !serialsRaw || !reason) {
      return NextResponse.json({ success: false, error: 'Missing required fields: po_id, serial_numbers, reason' }, { status: 400 })
    }

    let serialNumbers: string[]
    try {
      serialNumbers = JSON.parse(serialsRaw)
      if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) throw new Error()
    } catch {
      return NextResponse.json({ success: false, error: 'serial_numbers must be a non-empty JSON array' }, { status: 400 })
    }

    // 1. Fetch PO for state-code and branch lookup
    const [po] = await db
      .select({ poNumber: purchase_orders.po_number, vendorId: purchase_orders.vendor_id, branchId: purchase_orders.branch_id })
      .from(purchase_orders)
      .where(eq(purchase_orders.id, poId))
      .limit(1)

    if (!po) {
      return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 })
    }

    const [vendorRow] = po.vendorId
      ? await db.select({ stateCode: vendors.state_code, name: vendors.name }).from(vendors).where(eq(vendors.id, po.vendorId)).limit(1)
      : [null]
    const [branchRow] = po.branchId
      ? await db.select({ stateCode: branches.state_code }).from(branches).where(eq(branches.id, po.branchId)).limit(1)
      : [null]

    const vendorCode = (vendorRow?.stateCode ?? '').toLowerCase().trim()
    const branchCode = (branchRow?.stateCode ?? '').toLowerCase().trim()
    const isInterState = !vendorCode || !branchCode || vendorCode !== branchCode

    // 2. Find inventory rows by serial number, belonging to this PO, status Available
    const inventoryRows = await db
      .select({
        id:          inventory.id,
        productId:   inventory.product_id,
        landedCost:  inventory.landed_cost,
        serialNumber: inventory.serial_number,
        status:      inventory.status,
      })
      .from(inventory)
      .where(
        and(
          eq(inventory.source_po_id, poId),
          eq(inventory.status, 'Available'),
          sql`${inventory.serial_number} = ANY(${serialNumbers})`
        )
      )

    const foundSerials = inventoryRows.map(r => r.serialNumber).filter(Boolean)
    const missingSerials = serialNumbers.filter(sn => !foundSerials.includes(sn))
    if (missingSerials.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Serial numbers not found or not available: ${missingSerials.join(', ')}`,
      }, { status: 400 })
    }

    const ids = inventoryRows.map(r => r.id)

    // 3. Mark inventory as Returned
    await db
      .update(inventory)
      .set({ status: 'Returned', updated_at: new Date() })
      .where(inArray(inventory.id, ids))

    // 4. Insert inventory_transactions — one per serial
    if (ids.length > 0) {
      await db.insert(inventory_transactions).values(
        inventoryRows.map(row => ({
          product_id:       row.productId!,
          branch_id:        po.branchId!,
          transaction_type: 'return_to_vendor',
          quantity:         -1,
          reference_id:     poId,
          created_by:       session.user.id,
          inventory_id:     row.id,
        }))
      )
    }

    // 5. Compute costs per product
    const productIds = [...new Set(inventoryRows.map(r => r.productId).filter(Boolean) as string[])]
    const productRows = await db
      .select({ id: products.id, gstRate: products.gst_rate, modelName: products.model_name })
      .from(products)
      .where(sql`${products.id} = ANY(${productIds})`)

    const productMap = new Map(productRows.map(p => [p.id, p]))

    let totalLandedCost = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0
    const itemNames: string[] = []

    for (const row of inventoryRows) {
      const lc = Number(row.landedCost ?? 0)
      totalLandedCost += lc

      const prod = row.productId ? productMap.get(row.productId) : null
      if (prod && !itemNames.includes(prod.modelName ?? '')) {
        itemNames.push(prod.modelName ?? '')
      }
      const gstRate = Number(prod?.gstRate ?? 0)
      const gstAmount = lc * (gstRate / 100)
      if (isInterState) {
        totalIGST += gstAmount
      } else {
        totalCGST += gstAmount / 2
        totalSGST += gstAmount / 2
      }
    }

    totalLandedCost = Math.round(totalLandedCost * 100) / 100
    totalCGST       = Math.round(totalCGST       * 100) / 100
    totalSGST       = Math.round(totalSGST       * 100) / 100
    totalIGST       = Math.round(totalIGST       * 100) / 100
    const totalAmount = totalLandedCost + totalCGST + totalSGST + totalIGST

    // 6. Generate debit note number
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
    const dnNumber = `DN/${year}/${dnCounterRows[0]?.current_value}`

    // 7. Insert debit note record
    const dnInsert = await db.execute(sql`
      INSERT INTO debit_notes (
        debit_note_number, po_id, branch_id, vendor_id, reason,
        amount, status, serial_numbers, item_names,
        metadata, created_by
      ) VALUES (
        ${dnNumber},
        ${poId}::uuid,
        ${po.branchId ?? null}::uuid,
        ${po.vendorId ?? null}::uuid,
        ${reason},
        ${totalAmount},
        'Pending',
        ${serialNumbers}::text[],
        ${itemNames}::text[],
        ${JSON.stringify({ serial_numbers: serialNumbers, item_names: itemNames })}::jsonb,
        ${session.user.id}::uuid
      )
      RETURNING id
    `)
    const dnRows = (dnInsert as unknown as { rows?: { id: string }[] }).rows
      ?? (dnInsert as unknown as { id: string }[])
    const debitNoteId = dnRows[0]?.id ?? 'unknown'

    // 8. Non-blocking journal posting
    if (totalLandedCost > 0 && po.branchId) {
      postDebitNoteJournal({
        debitNoteId,
        debitNoteNumber: dnNumber,
        poId,
        branchId: po.branchId,
        createdBy: session.user.id,
        totalLandedCost,
        totalCGST,
        totalSGST,
        totalIGST,
      }).catch(err => console.error('[API /procurement/returns] journal failed (non-blocking):', err))
    }

    return NextResponse.json({
      success: true,
      message: `Return processed — Debit Note ${dnNumber} generated for ₹${totalAmount.toLocaleString('en-IN')}`,
      debit_note_id: debitNoteId,
      debit_note_number: dnNumber,
    })
  } catch (error) {
    console.error('[API /procurement/returns] error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
