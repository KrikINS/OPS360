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
  // NOTE: This wrapper is NOT called by PosContext.executeCheckout.
  // Journal posting and loyalty are handled directly in executeCheckout.
  // This function is retained for external API / test usage only.
  // Do NOT delete — but do NOT call from POS terminal.
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

    // --- REVERSE JOURNAL (non-blocking) ---
    try {
      const invRows = await db.execute(
        sql`SELECT branch_id, total_amount, subtotal, cgst, sgst, igst, payment_mode
            FROM sales_invoices
            WHERE id = ${input.transactionId}::uuid`
      )
      const invData = ((invRows as unknown as { rows?: unknown[] }).rows ?? invRows) as {
        branch_id: string
        total_amount: string
        subtotal: string
        cgst: string | null
        sgst: string | null
        igst: string | null
        payment_mode: string | null
      }[]

      if (invData.length > 0) {
        const invoice = invData[0]

        const cogsRows = await db.execute(
          sql`SELECT COALESCE(SUM(landed_cost), 0) AS total_cogs
              FROM inventory
              WHERE invoice_id = ${input.transactionId}::uuid`
        )
        const cogsData = ((cogsRows as unknown as { rows?: unknown[] }).rows ?? cogsRows) as { total_cogs: string }[]
        const cogsAmount = Number(cogsData[0]?.total_cogs ?? 0)

        const { getCashAccountCode, createJournalEntry } = await import('@/actions/finance')
        const cashCode = await getCashAccountCode(invoice.branch_id)

        const saleTotal = Number(invoice.total_amount ?? 0)
        const subtotal  = Number(invoice.subtotal ?? 0)
        const cgst      = Number(invoice.cgst ?? 0)
        const sgst      = Number(invoice.sgst ?? 0)
        const igst      = Number(invoice.igst ?? 0)

        const reverseLines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [
          { accountCode: cashCode, credit: saleTotal,  description: 'Cash reversed — voided POS sale' },
          { accountCode: '4000',   debit:  subtotal,   description: 'Revenue reversed — voided sale' },
        ]
        if (cgst > 0) reverseLines.push({ accountCode: '2020', debit: cgst, description: 'CGST payable reversed' })
        if (sgst > 0) reverseLines.push({ accountCode: '2030', debit: sgst, description: 'SGST payable reversed' })
        if (igst > 0) reverseLines.push({ accountCode: '2040', debit: igst, description: 'IGST payable reversed' })
        if (cogsAmount > 0) {
          reverseLines.push({ accountCode: '5010', credit: cogsAmount, description: 'COGS reversed' })
          reverseLines.push({ accountCode: '1040', debit:  cogsAmount, description: 'Inventory asset restored' })
        }

        await createJournalEntry({
          date: new Date(),
          description: `VOID: Invoice ${input.transactionId} — ${input.reason}`,
          referenceSource: 'VOID',
          referenceId: input.transactionId,
          branchId: invoice.branch_id,
          autoGenerated: false,
          createdBy: session.user.id,
          lines: reverseLines,
        })
      }
    } catch (journalErr) {
      console.error('[VOID] Reverse journal FAILED — inventory already restored, ledger entry missing:', journalErr)
      // Non-blocking: inventory restoration has already committed
    }
    // --- END REVERSE JOURNAL ---

    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function processReturn(input: {
  invoiceId: string
  reason: string
  refundMethod: 'cash' | 'bank' | 'loyalty_points'
  items: Array<{
    invoiceItemId: string
    productId: string
    inventoryId?: string
    qty: number
    unitPrice: number
    costPrice?: number
    cgst: number
    sgst: number
    igst: number
  }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }

  const role = (session.user.role ?? '').toLowerCase()
  if (!['manager', 'admin', 'super_admin', 'admin/owner'].includes(role)) {
    return { success: false as const, error: 'Insufficient permission: manager required' }
  }

  // Fetch original invoice
  const invRows = await db.execute(
    sql`SELECT branch_id, customer_id, status, total_amount, subtotal, cgst, sgst, igst
        FROM sales_invoices WHERE id = ${input.invoiceId}::uuid`
  )
  const invData = ((invRows as unknown as { rows?: unknown[] }).rows ?? invRows) as {
    branch_id: string
    customer_id: string | null
    status: string | null
    total_amount: string
    subtotal: string
    cgst: string | null
    sgst: string | null
    igst: string | null
  }[]

  if (!invData.length) return { success: false as const, error: 'Invoice not found' }
  const invoice = invData[0]

  if (invoice.status === 'returned' || invoice.status === 'voided') {
    return { success: false as const, error: 'Invoice already reversed' }
  }

  // Calculate return totals from input items
  const totalRefund    = input.items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
  const returnCGST     = input.items.reduce((s, i) => s + i.cgst * i.qty, 0)
  const returnSGST     = input.items.reduce((s, i) => s + i.sgst * i.qty, 0)
  const returnIGST     = input.items.reduce((s, i) => s + i.igst * i.qty, 0)
  const returnSubtotal = totalRefund - returnCGST - returnSGST - returnIGST
  const returnCOGS     = input.items.reduce((s, i) => s + (i.costPrice ?? 0) * i.qty, 0)

  let returnId = ''

  try {
    await db.transaction(async (tx) => {
      // Restore inventory units
      for (const item of input.items) {
        if (item.inventoryId) {
          // Serialised unit — restore directly by ID
          await tx.execute(sql`
            UPDATE inventory
            SET status = 'Available', invoice_id = null, updated_at = now()
            WHERE id = ${item.inventoryId}::uuid
          `)
        } else {
          // Non-serialised — restore FIFO units matching invoice + product
          await tx.execute(sql`
            WITH units AS (
              SELECT id FROM inventory
              WHERE product_id = ${item.productId}::uuid
                AND branch_id  = ${invoice.branch_id}::uuid
                AND status     = 'Sold'
                AND invoice_id = ${input.invoiceId}::uuid
              LIMIT ${item.qty}
              FOR UPDATE
            )
            UPDATE inventory
            SET status = 'Available', invoice_id = null, updated_at = now()
            WHERE id IN (SELECT id FROM units)
          `)
        }
      }

      // Insert return header
      const returnRows = await tx.execute(sql`
        INSERT INTO sales_returns
          (invoice_id, branch_id, created_by, reason, refund_method, refund_amount)
        VALUES (
          ${input.invoiceId}::uuid,
          ${invoice.branch_id}::uuid,
          ${session.user.id}::uuid,
          ${input.reason},
          ${input.refundMethod},
          ${String(totalRefund)}
        )
        RETURNING id
      `)
      const returnData = ((returnRows as unknown as { rows?: { id: string }[] }).rows ?? returnRows) as { id: string }[]
      returnId = returnData[0].id

      // Insert return line items
      for (const item of input.items) {
        await tx.execute(sql`
          INSERT INTO sales_return_items
            (return_id, invoice_item_id, product_id, inventory_id,
             qty, unit_price, cost_price, cgst, sgst, igst)
          VALUES (
            ${returnId}::uuid,
            ${item.invoiceItemId}::uuid,
            ${item.productId}::uuid,
            ${item.inventoryId ? sql`${item.inventoryId}::uuid` : sql`null`},
            ${item.qty},
            ${String(item.unitPrice)},
            ${item.costPrice != null ? String(item.costPrice) : null},
            ${String(item.cgst)},
            ${String(item.sgst)},
            ${String(item.igst)}
          )
        `)
      }

      // Mark invoice as returned
      await tx.execute(sql`
        UPDATE sales_invoices SET status = 'returned'
        WHERE id = ${input.invoiceId}::uuid
      `)
    })

    // Reverse journal (non-blocking)
    try {
      const { getCashAccountCode, createJournalEntry } = await import('@/actions/finance')

      let refundAccountCode: string
      if (input.refundMethod === 'cash') {
        refundAccountCode = await getCashAccountCode(invoice.branch_id)
      } else if (input.refundMethod === 'bank') {
        refundAccountCode = '1020'
      } else {
        refundAccountCode = '2050' // Loyalty Liability credited = points owed back to customer
      }

      const reverseLines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [
        { accountCode: refundAccountCode, credit: totalRefund, description: 'Refund issued to customer' },
        { accountCode: '4000', debit: returnSubtotal, description: 'Revenue reversed — return' },
      ]
      if (returnCGST > 0) reverseLines.push({ accountCode: '2020', debit: returnCGST, description: 'CGST payable reversed' })
      if (returnSGST > 0) reverseLines.push({ accountCode: '2030', debit: returnSGST, description: 'SGST payable reversed' })
      if (returnIGST > 0) reverseLines.push({ accountCode: '2040', debit: returnIGST, description: 'IGST payable reversed' })
      if (returnCOGS > 0) {
        reverseLines.push({ accountCode: '5010', credit: returnCOGS, description: 'COGS reversed — goods returned' })
        reverseLines.push({ accountCode: '1040', debit: returnCOGS, description: 'Inventory asset restored' })
      }

      const journalEntry = await createJournalEntry({
        date: new Date(),
        description: `RETURN: Invoice ${input.invoiceId} — ${input.reason}`,
        referenceSource: 'RETURN',
        referenceId: returnId,
        branchId: invoice.branch_id,
        autoGenerated: false,
        createdBy: session.user.id,
        lines: reverseLines,
      })

      await db.execute(sql`
        UPDATE sales_returns SET journal_entry_id = ${journalEntry.id}::uuid
        WHERE id = ${returnId}::uuid
      `)
    } catch (journalErr) {
      console.error('[RETURN] Reverse journal FAILED — inventory and return records committed, ledger entry missing:', journalErr)
    }

    // Loyalty points refund (non-blocking) — only if refund method is loyalty_points
    if (input.refundMethod === 'loyalty_points' && invoice.customer_id) {
      try {
        const { earnPoints } = await import('@/actions/loyalty')
        await earnPoints({
          customerId: invoice.customer_id,
          invoiceId: returnId,
          saleAmount: totalRefund,
          createdBy: session.user.id,
        })
      } catch (loyaltyErr) {
        console.error('[RETURN] Loyalty point refund FAILED:', loyaltyErr)
      }
    }

    return { success: true as const, returnId, refundAmount: totalRefund }
  } catch (error) {
    return { success: false as const, error: (error as Error).message }
  }
}

export async function getTransactionById(id: string) {
  const result = await getInvoiceHeaderAction(id)
  if (result.error) return null
  return result.data as Record<string, unknown> | null
}
