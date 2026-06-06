import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { invoice_items, products, serialNumbers } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id } = await context.params

    const items = await db
      .select({
        id: invoice_items.id,
        invoice_id: invoice_items.invoice_id,
        product_id: invoice_items.product_id,
        qty: invoice_items.qty,
        unit_price: invoice_items.unit_price,
        discount_amount: invoice_items.discount_amount,
        discount_pct: invoice_items.discount_pct,
        name: products.model_name,
        hsn_code: products.hsn_code,
        gst_rate: products.gst_rate,
        serial_number: sql`string_agg(${serialNumbers.serialNumber}, ', ')`.as('serial_number')
      })
      .from(invoice_items)
      .leftJoin(products, eq(invoice_items.product_id, products.id))
      .leftJoin(serialNumbers, eq(invoice_items.id, serialNumbers.transactionId))
      .where(eq(invoice_items.invoice_id, id))
      .groupBy(
        invoice_items.id,
        products.id
      )
      .orderBy(invoice_items.id)

    return NextResponse.json(items)
  } catch (error) {
    console.error('Failed to fetch invoice items:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
