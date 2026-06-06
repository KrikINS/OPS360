import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { sales_invoices, customers, branches, invoice_items, products, serialNumbers } from '@/db/schema'
import { eq, desc, and, or, ilike } from 'drizzle-orm'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchIdParam = searchParams.get('branchId')
    let branchId = branchIdParam || await getEffectiveBranchId(session)
    
    // Admin override "ALL_000" allows viewing all branches
    if (branchId === 'ALL_000') {
      branchId = null
    }

    const searchQuery = searchParams.get('search') || ''

    let queryConditions = undefined
    if (branchId) {
      queryConditions = eq(sales_invoices.branch_id, branchId)
    }

    if (searchQuery) {
      const searchCondition = or(
        ilike(sales_invoices.invoice_number, `%${searchQuery}%`),
        ilike(customers.full_name, `%${searchQuery}%`),
        ilike(branches.name, `%${searchQuery}%`)
      )
      queryConditions = queryConditions ? and(queryConditions, searchCondition) : searchCondition
    }

    const invoices = await db
      .select({
        sale_id: sales_invoices.id,
        invoice_number: sales_invoices.invoice_number,
        created_at: sales_invoices.created_at,
        total_amount: sales_invoices.total_amount,
        customer_id: sales_invoices.customer_id,
        customer_name: customers.full_name,
        branch_name: branches.name,
        payment_method: sales_invoices.payment_mode,
        status: sales_invoices.status
      })
      .from(sales_invoices)
      .leftJoin(customers, eq(sales_invoices.customer_id, customers.id))
      .leftJoin(branches, eq(sales_invoices.branch_id, branches.id))
      .where(queryConditions)
      .orderBy(desc(sales_invoices.created_at))
      .limit(200) // basic safeguard

    // Map to the shape expected by SalesRegistryTable
    const formattedData = invoices.map(inv => ({
      ...inv,
      customer_name: inv.customer_name || 'Walk-in Customer',
      branch_name: inv.branch_name || 'Main Branch',
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('Failed to fetch registry:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
