import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { inventory, inventory_transactions } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    const role = (session.user.role ?? '').toLowerCase()
    if (!['manager', 'admin', 'super_admin', 'admin/owner'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Manager permission required' }, { status: 403 })
    }

    const { inventoryId } = await request.json()
    if (!inventoryId) return NextResponse.json({ success: false, error: 'inventoryId required' }, { status: 400 })

    // Verify the unit is actually in Quarantine
    const unit = await db.query.inventory.findFirst({
      where: eq(inventory.id, inventoryId)
    })
    if (!unit) return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 })
    if (unit.status !== 'Quarantine') {
      return NextResponse.json({ success: false, error: 'Unit is not in Quarantine' }, { status: 400 })
    }

    // Release: flip to Available, keep invoice_id and invoice_item_id intact (preserves return history)
    await db.update(inventory)
      .set({ status: 'Available', updated_at: new Date() })
      .where(eq(inventory.id, inventoryId))

    // Record the status change as an inventory transaction
    await db.insert(inventory_transactions).values({
      product_id: unit.product_id!,
      branch_id: unit.branch_id!,
      transaction_type: 'quarantine_release',
      quantity: 1,
      reference_id: inventoryId,
      created_by: session.user.id,
    })

    return NextResponse.json({ success: true, inventoryId, newStatus: 'Available' })
  } catch (error) {
    console.error('[release-quarantine] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
