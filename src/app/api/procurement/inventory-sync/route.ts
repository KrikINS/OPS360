import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createGRN } from '@/actions/procurement'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
import { db } from '@/db/client'
import { purchase_orders } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { po_id, items, condition_notes, branch_id } = body

    if (!po_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'po_id and items are required' },
        { status: 400 }
      )
    }

    // Priority: dialog selection → cookie/session → PO's own branch_id
    let branchId: string | null = branch_id ?? null

    if (!branchId) {
      branchId = await getEffectiveBranchId(session) ?? null
    }

    if (!branchId) {
      const [poRow] = await db
        .select({ branch_id: purchase_orders.branch_id })
        .from(purchase_orders)
        .where(eq(purchase_orders.id, po_id))
        .limit(1)
      branchId = poRow?.branch_id ?? null
    }

    if (!branchId) {
      return NextResponse.json(
        { error: 'Please select a receiving branch.' },
        { status: 400 }
      )
    }

    // Map GRNDialog item shape to createGRN input shape.
    const grnItems = items.map((item: {
      item_id: string
      serial_numbers: string[]
      freight?: number
    }) => ({
      poItemId:      item.item_id,
      receivedQty:   item.serial_numbers.length,
      serialNumbers: item.serial_numbers,
    }))

    const totalFreight = items.reduce(
      (sum: number, item: { freight?: number }) => sum + (item.freight ?? 0),
      0
    )

    const result = await createGRN({
      poId:           po_id,
      branchId:       branchId,
      items:          grnItems,
      landedCosts:    { freight: totalFreight },
      conditionNotes: condition_notes ?? null,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      grn: result.grn,
    })
  } catch (error) {
    console.error('GRN sync error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process GRN' },
      { status: 500 }
    )
  }
}
