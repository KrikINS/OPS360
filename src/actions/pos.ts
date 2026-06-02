'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
import { sql } from 'drizzle-orm'
import {
  processPosSaleAction,
  getInvoiceHeaderAction,
} from '@/app/actions/pos'
import { postSalesJournal } from '@/actions/finance'

export type TransactionItem = {
  productId: string
  qty: number
  unitPrice: number
}

export async function createTransaction(input: {
  branchId: string
  items: TransactionItem[]
  paymentMode: string
  customerId: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized: not authenticated' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  const effectiveBranchId = await getEffectiveBranchId(session);
  if (!effectiveBranchId) {
    return { success: false as const, error: 'No branch assigned to your account' };
  }
  if (!['admin', 'manager', 'super_admin', 'admin/owner'].includes(role)) {
    if (effectiveBranchId !== input.branchId) {
      return { success: false as const, error: 'Unauthorized: branch mismatch' }
    }
  }

  const payload = {
    branch_id: input.branchId,
    payment_mode: input.paymentMode,
    customer_id: input.customerId,
    user_id: session.user.id,
    items: input.items.map((i) => ({
      product_id: i.productId,
      qty: i.qty,
      unit_price: i.unitPrice,
    })),
  }

  const result = await processPosSaleAction(payload)
  if (result.error) {
    return { success: false as const, error: result.error.message }
  }

  // Post sales journal — fire and forget, don't fail the transaction
  try {
    const saleTotal = input.items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
    await postSalesJournal({
      invoiceId: String((result.data as Record<string, unknown>)?.id ?? ''),
      branchId: input.branchId,
      createdBy: session.user.id,
      saleTotal,
      subtotal: saleTotal,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cogs: 0,
    })
  } catch (journalError) {
    console.error('Sales journal post failed:', journalError)
  }

  return { success: true as const, transaction: result.data as Record<string, unknown> }
}

export async function voidTransaction(input: {
  transactionId: string
  reason: string
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
    await db.transaction(async (tx) => {
      // Get branch id
      const inv = await tx.execute(sql`SELECT branch_id FROM sales_invoices WHERE id = ${input.transactionId}::uuid`);
      const branchId = (inv.rows[0] as { branch_id: string | null } | undefined)?.branch_id;
      
      if (!branchId) throw new Error("Invoice not found");

      // Update invoice status
      await tx.execute(sql`UPDATE sales_invoices SET status = 'voided' WHERE id = ${input.transactionId}::uuid`);

      // Get items
      const items = await tx.execute(sql`SELECT product_id, qty as quantity FROM invoice_items WHERE invoice_id = ${input.transactionId}::uuid`);
      
      // Restore stock and log transactions
      for (const item of items.rows as { product_id: string; quantity: number }[]) {
        await tx.execute(sql`
          WITH updated_inv AS (
            SELECT id FROM inventory
            WHERE product_id = ${item.product_id}::uuid 
              AND branch_id = ${branchId}::uuid
              AND status = 'Sold'
            LIMIT ${item.quantity}
            FOR UPDATE
          )
          UPDATE inventory 
          SET status = 'Available', updated_at = now()
          WHERE id IN (SELECT id FROM updated_inv)
        `);

        await tx.execute(sql`
          INSERT INTO inventory_transactions (branch_id, product_id, created_by, transaction_type, quantity, reference_id)
          VALUES (${branchId}::uuid, ${item.product_id}::uuid, ${session.user.id}::uuid, 'VOID', ${item.quantity}, ${input.transactionId}::uuid)
        `);
      }
    });
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function getTransactionById(id: string) {
  const result = await getInvoiceHeaderAction(id)
  if (result.error) return null
  return result.data as Record<string, unknown> | null
}
