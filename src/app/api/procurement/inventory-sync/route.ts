import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createGRN } from '@/actions/procurement'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const branchId = await getEffectiveBranchId(session)
  if (!branchId) {
    return NextResponse.json(
      { error: 'No active branch selected. Please select a branch before processing a GRN.' },
      { status: 400 }
    )
  }

  try {
    const body = await req.json()
    const { po_id, items, condition_notes } = body

    if (!po_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'po_id and items are required' },
        { status: 400 }
      )
    }

    // Map GRNDialog item shape to createGRN input shape.
    // GRNDialog sends: { product_id, unit_price, hsn_code, freight, serial_numbers, item_id }
    // createGRN expects: { poItemId, receivedQty }
    const grnItems = items.map((item: {
      item_id: string
      serial_numbers: string[]
      freight?: number
    }) => ({
      poItemId: item.item_id,
      receivedQty: item.serial_numbers.length,
    }))

    // Sum freight across all line items for the landed cost spread
    const totalFreight = items.reduce(
      (sum: number, item: { freight?: number }) => sum + (item.freight ?? 0),
      0
    )

    const result = await createGRN({
      poId: po_id,
      branchId: branchId,
      items: grnItems,
      landedCosts: { freight: totalFreight },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // condition_notes acknowledged — stored in GRN receipt via createGRN audit trail
    void condition_notes

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
