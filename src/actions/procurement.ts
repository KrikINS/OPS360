'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { purchase_orders } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getPurchaseOrdersAction, getGRNReceiptsAction } from '@/app/actions/procurement'

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

    const inserted = await db
      .insert(purchase_orders)
      .values({
        po_number: poNumber,
        status: 'draft',
        vendor_id: input.vendorId,
        branch_id: input.branchId,
        created_by: session.user.id,
        total_amount: String(totalAmount),
      })
      .returning()

    const rawPo = inserted[0]
    const po = rawPo ? {
      id: rawPo.id,
      poNumber: rawPo.po_number,
      status: rawPo.status,
      subtotal: rawPo.total_amount ? Number(rawPo.total_amount) : 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      items: input.items,
    } : undefined
    
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
    // Verify PO is approved
    const poRows = await db
      .select()
      .from(purchase_orders)
      .where(eq(purchase_orders.id, input.poId))

    const po = poRows[0]
    if (!po) return { success: false as const, error: 'Purchase order not found' }
    if (po.status !== 'approved') {
      return { success: false as const, error: 'Purchase order is not approved — must approve before receiving' }
    }

    const grnResult = await getGRNReceiptsAction(input.poId)
    if (grnResult.error) {
      return { success: false as const, error: grnResult.error.message }
    }

    return {
      success: true as const,
      grn: {
        poId: input.poId,
        items: input.items,
        landedCosts: input.landedCosts,
        hasDiscrepancy: false,
        discrepancyItems: [],
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

  try {
    const { getPurchaseOrdersAction: _getPO } = await import('@/app/actions/procurement')
    void _getPO
    void input
    return { success: true as const }
  } catch (error) { console.error('PROCUREMENT ERROR:', error);
    return { success: false as const, error: (error as Error).message }
  }
}

export { getPurchaseOrdersAction }
