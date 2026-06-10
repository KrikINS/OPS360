"use server"

import { db } from "@/db/client"
import { vendors, purchase_orders, expense_records, stock_transfers, stock_requests, products, inventory } from "@/db/schema"
import { and, eq, inArray, sql, lt } from "drizzle-orm"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getEffectiveBranchId } from "@/app/actions/_utils/branch"

export type NotificationType =
  | 'PENDING_PO_APPROVAL'
  | 'PO_NEEDS_REVISION'
  | 'PENDING_EXPENSE_APPROVAL'
  | 'PENDING_VENDOR_APPROVAL'
  | 'PENDING_STOCK_TRANSFER'
  | 'PENDING_STOCK_REQUEST'
  | 'LOW_STOCK_ALERT'
  | 'PENDING_DEBIT_NOTE'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  href: string
  priority: 'high' | 'medium' | 'low'
}

export async function getPendingApprovalsAction(): Promise<Notification[]> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return []

    const role = (session.user.role ?? "").toLowerCase()
    const userId = session.user.id
    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'admin/owner'
    const isManager = role === 'manager'
    const isAdminOrManager = isAdmin || isManager
    const branchId = await getEffectiveBranchId(session)

    const notifications: Notification[] = []

    const queries: Promise<void>[] = []

    // 1. PENDING_PO_APPROVAL — admins/managers see all POs pending approval
    if (isAdminOrManager) {
      queries.push(
        db.select({ id: purchase_orders.id, po_number: purchase_orders.po_number })
          .from(purchase_orders)
          .where(eq(purchase_orders.status, 'pending_approval'))
          .then(rows => {
            for (const po of rows) {
              notifications.push({
                id: `poa-${po.id}`,
                type: 'PENDING_PO_APPROVAL',
                title: 'PO Approval Required',
                message: `PO/${po.po_number} is awaiting approval`,
                href: '/procurement/po-registry',
                priority: 'high',
              })
            }
          })
      )
    }

    // 2. PO_NEEDS_REVISION — only the PO creator sees their own revision requests
    if (userId) {
      queries.push(
        db.select({
          id: purchase_orders.id,
          po_number: purchase_orders.po_number,
          revision_notes: purchase_orders.revision_notes,
        })
          .from(purchase_orders)
          .where(and(
            eq(purchase_orders.status, 'needs_revision'),
            eq(purchase_orders.created_by, userId)
          ))
          .then(rows => {
            for (const po of rows) {
              notifications.push({
                id: `por-${po.id}`,
                type: 'PO_NEEDS_REVISION',
                title: 'PO Revision Required',
                message: `PO/${po.po_number} returned for revision — ${po.revision_notes ?? 'see notes'}`,
                href: '/procurement/po-registry',
                priority: 'high',
              })
            }
          })
      )
    }

    // 3. PENDING_EXPENSE_APPROVAL — admins/managers
    if (isAdminOrManager) {
      queries.push(
        db.select({ id: expense_records.id, description: expense_records.description, amount: expense_records.amount })
          .from(expense_records)
          .where(eq(expense_records.status, 'pending'))
          .then(rows => {
            for (const exp of rows) {
              notifications.push({
                id: `exp-${exp.id}`,
                type: 'PENDING_EXPENSE_APPROVAL',
                title: 'Expense Approval Required',
                message: `₹${Number(exp.amount).toLocaleString('en-IN')} — ${exp.description}`,
                href: '/accounting',
                priority: 'high',
              })
            }
          })
      )
    }

    // 4. PENDING_VENDOR_APPROVAL — admins/managers
    if (isAdminOrManager) {
      queries.push(
        db.select({ id: vendors.id, name: vendors.name })
          .from(vendors)
          .where(inArray(vendors.status, ['Pending', 'awaiting_approval']))
          .then(rows => {
            for (const v of rows) {
              notifications.push({
                id: `ven-${v.id}`,
                type: 'PENDING_VENDOR_APPROVAL',
                title: 'Vendor Approval Required',
                message: `${v.name} is awaiting approval`,
                href: '/vendors',
                priority: 'medium',
              })
            }
          })
      )
    }

    // 5. PENDING_STOCK_TRANSFER — transfers in-transit to this branch (destination branch)
    if (branchId) {
      queries.push(
        db.select({ id: stock_transfers.id, transfer_number: stock_transfers.transfer_number })
          .from(stock_transfers)
          .where(and(
            eq(stock_transfers.status, 'In-Transit'),
            eq(stock_transfers.destination_branch_id, branchId)
          ))
          .then(rows => {
            for (const t of rows) {
              notifications.push({
                id: `stt-${t.id}`,
                type: 'PENDING_STOCK_TRANSFER',
                title: 'Incoming Transfer',
                message: `Transfer ${t.transfer_number} is in-transit — receive to complete`,
                href: '/transfer',
                priority: 'medium',
              })
            }
          })
      )
    }

    // 6. PENDING_STOCK_REQUEST — requests pending fulfillment from this branch (source branch)
    if (branchId) {
      queries.push(
        db.select({ id: stock_requests.id, request_number: stock_requests.request_number })
          .from(stock_requests)
          .where(and(
            eq(stock_requests.status, 'Pending'),
            eq(stock_requests.source_branch_id, branchId)
          ))
          .then(rows => {
            for (const r of rows) {
              notifications.push({
                id: `str-${r.id}`,
                type: 'PENDING_STOCK_REQUEST',
                title: 'Stock Request Pending',
                message: `Request ${r.request_number} is awaiting your branch's fulfillment`,
                href: '/transfer',
                priority: 'medium',
              })
            }
          })
      )
    }

    // 7. LOW_STOCK_ALERT — products below min_stock_level in this branch (admins/managers)
    if (isAdminOrManager && branchId) {
      queries.push(
        db.execute(sql`
          SELECT p.id, p.model_name, p.min_stock_level,
                 COUNT(i.id) FILTER (WHERE i.status = 'Available') AS available_count
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ${branchId}::uuid
          WHERE p.min_stock_level > 0
            AND p.tracking_type != 'Legacy'
          GROUP BY p.id, p.model_name, p.min_stock_level
          HAVING COUNT(i.id) FILTER (WHERE i.status = 'Available') < p.min_stock_level
          LIMIT 10
        `).then(result => {
          const rows = result.rows as Array<{ id: string; model_name: string; min_stock_level: number; available_count: number }>
          for (const row of rows) {
            notifications.push({
              id: `ls-${row.id}`,
              type: 'LOW_STOCK_ALERT',
              title: 'Low Stock Alert',
              message: `${row.model_name} — ${row.available_count} units (min: ${row.min_stock_level})`,
              href: '/products',
              priority: 'low',
            })
          }
        })
      )
    }

    // 8. PENDING_DEBIT_NOTE — admins/managers
    if (isAdminOrManager) {
      queries.push(
        db.execute(sql`
          SELECT id, debit_note_number, amount FROM debit_notes WHERE status = 'Pending' LIMIT 20
        `).then(result => {
          const rows = result.rows as Array<{ id: string; debit_note_number: string; amount: string }>
          for (const row of rows) {
            notifications.push({
              id: `dn-${row.id}`,
              type: 'PENDING_DEBIT_NOTE',
              title: 'Debit Note Pending',
              message: `${row.debit_note_number} — ₹${Number(row.amount).toLocaleString('en-IN')} awaiting approval`,
              href: '/procurement/po-registry',
              priority: 'low',
            })
          }
        })
      )
    }

    await Promise.all(queries)

    // Sort: high → medium → low
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return notifications
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return []
  }
}
