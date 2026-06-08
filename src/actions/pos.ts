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
  loyaltyRedeemedAmount?: number
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

  // Post sales journal — errors are captured and returned as a warning.
  // The POS sale itself was committed by the DB procedure and cannot be
  // rolled back, but we surface failures so the UI can alert the operator
  // and the entry can be manually reposted (B12 fix).
  let spResult: { id?: string; subtotal: number; cgst?: number; sgst?: number; igst?: number; grandTotal: number } | null = null;
  let journalWarning: string | undefined
  try {
    spResult = result.data as {
      id: string
      subtotal: number
      cgst: number
      sgst: number
      igst: number
      grandTotal: number
    }

    const invoiceId = String(spResult.id ?? '')

    // Compute COGS: sum the landed_cost of all inventory units sold on this invoice.
    // inventory.invoice_id is set by processPosSaleAction, so this lookup is safe here.
    let cogsAmount = 0
    if (invoiceId) {
      try {
        const cogsResult = await db.execute(
          sql`SELECT COALESCE(SUM(landed_cost), 0) AS total_cogs
              FROM inventory
              WHERE invoice_id = ${invoiceId}::uuid`
        )
        const rows = ((cogsResult as unknown as { rows?: { total_cogs: string }[] }).rows) ?? (cogsResult as unknown as { total_cogs: string }[])
        cogsAmount = Number(rows[0]?.total_cogs ?? 0)
      } catch (cogsErr) {
        // Non-fatal: if the lookup fails, COGS stays 0 and journal still posts
        console.error('COGS lookup failed, defaulting to 0:', cogsErr)
      }
    }

    await postSalesJournal({
      invoiceId,
      branchId: input.branchId,
      createdBy: session.user.id,
      saleTotal: spResult.grandTotal,
      subtotal: spResult.subtotal,
      cgst: spResult.cgst ?? 0,
      sgst: spResult.sgst ?? 0,
      igst: spResult.igst ?? 0,
      cogs: cogsAmount,
      loyaltyDiscountAmount: input.loyaltyRedeemedAmount ?? 0,
    })
  } catch (journalError) {
    // Surface the error — don't swallow it silently
    const msg = (journalError as Error).message ?? 'Unknown journal error'
    console.error('[B12] Sales journal post FAILED — sale committed but ledger entry missing:', msg)
    journalWarning = `Sale completed but journal entry failed: ${msg}`
  }

  // Award loyalty points
  if (spResult) {
    try {
      const { earnPoints, redeemPoints } = await import('@/actions/loyalty')
      
      if (input.loyaltyRedeemedAmount && input.loyaltyRedeemedAmount > 0 && input.customerId) {
        await redeemPoints({
          customerId: input.customerId,
          pointsToRedeem: input.loyaltyRedeemedAmount,
          invoiceId: String(spResult.id ?? ''),
        })
      }
      
      const earnRes = await earnPoints({
        customerId: input.customerId ?? null,
        invoiceId: String(spResult.id ?? ''),
        saleAmount: spResult.grandTotal ?? 0,
        createdBy: session.user.id,
      })
      if (!earnRes?.success) {
        console.error('LOYALTY EARN FAILED:', earnRes?.error, {
          customerId: input.customerId,
          invoiceId: spResult.id,
          saleAmount: spResult.grandTotal,
        })
      }
    } catch (err) {
      console.error('LOYALTY EARN THREW:', err)
      // Don't block sale completion
    }
  }

  return {
    success: true as const,
    transaction: result.data as Record<string, unknown>,
    ...(journalWarning ? { journalWarning } : {}),
  }
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
