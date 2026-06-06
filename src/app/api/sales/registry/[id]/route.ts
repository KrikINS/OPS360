import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { sales_invoices, customers, branches } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id } = await context.params

    const [invoice] = await db
      .select({
        id: sales_invoices.id,
        invoice_number: sales_invoices.invoice_number,
        created_at: sales_invoices.created_at,
        total_amount: sales_invoices.total_amount,
        subtotal: sales_invoices.subtotal,
        cgst: sales_invoices.cgst,
        sgst: sales_invoices.sgst,
        igst: sales_invoices.igst,
        payment_mode: sales_invoices.payment_mode,
        status: sales_invoices.status,
        customers: customers,
        branches: branches,
      })
      .from(sales_invoices)
      .leftJoin(customers, eq(sales_invoices.customer_id, customers.id))
      .leftJoin(branches, eq(sales_invoices.branch_id, branches.id))
      .where(eq(sales_invoices.id, id))

    if (!invoice) {
      return new NextResponse('Invoice Not Found', { status: 404 })
    }

    // Map `branches` to an object so the frontend `InvoiceTemplate` gets the fields it expects.
    return NextResponse.json({ ...invoice })
  } catch (error) {
    console.error('Failed to fetch invoice:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
