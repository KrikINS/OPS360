"use server"

import { db } from "@/db/client"
import { purchase_orders } from "@/db/schema"
import { desc, sql } from "drizzle-orm"

export async function getPurchaseOrdersAction() {
  try {
    const data = await db.select().from(purchase_orders).orderBy(desc(purchase_orders.created_at))
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getGRNReceiptsAction(poId: string) {
  try {
    const res = await db.execute(sql`
      SELECT
        gr.id,
        gr.grn_number,
        gr.po_id,
        gr.branch_id,
        gr.created_by,
        gr.total_landed_cost,
        gr.has_discrepancy,
        gr.condition_notes,
        gr.created_at,
        p.full_name AS originator_name,
        b.name      AS branch_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id',               gi.id,
              'product_id',       gi.product_id,
              'ordered_qty',      gi.ordered_qty,
              'received_qty',     gi.received_qty,
              'landed_unit_cost', gi.landed_unit_cost,
                'serial_numbers', (
                  CASE
                    WHEN gi.inventory_ids IS NOT NULL
                         AND array_length(gi.inventory_ids, 1) > 0
                    THEN (
                      SELECT json_agg(inv.serial_number ORDER BY inv.serial_number)
                        FILTER (WHERE inv.serial_number IS NOT NULL)
                      FROM inventory inv
                      WHERE inv.id = ANY(gi.inventory_ids::uuid[])
                    )
                    ELSE (
                      SELECT json_agg(inv.serial_number ORDER BY inv.serial_number)
                        FILTER (WHERE inv.serial_number IS NOT NULL)
                      FROM inventory inv
                      WHERE inv.source_po_id = gr.po_id
                        AND inv.product_id = gi.product_id
                        AND inv.branch_id = gr.branch_id
                        AND inv.created_at BETWEEN
                          gr.created_at - interval '1 minute'
                          AND gr.created_at + interval '5 minutes'
                    )
                  END
                ),
              'product', (
                SELECT json_build_object(
                  'model_name',   pr.model_name,
                  'product_code', pr.product_code,
                  'hsn_code',     pr.hsn_code
                )
                FROM products pr
                WHERE pr.id = gi.product_id
                LIMIT 1
              )
            )
          ) FILTER (WHERE gi.id IS NOT NULL),
          '[]'::json
        ) AS grn_items
      FROM grn_receipts gr
      LEFT JOIN profiles  p  ON p.id  = gr.created_by
      LEFT JOIN branches  b  ON b.id  = gr.branch_id
      LEFT JOIN grn_items gi ON gi.grn_id = gr.id
      WHERE gr.po_id = ${poId}
      GROUP BY gr.id, gr.grn_number, gr.po_id, gr.branch_id,
               gr.created_by, gr.total_landed_cost,
               gr.has_discrepancy, gr.condition_notes, gr.created_at,
               p.full_name, b.name
      ORDER BY gr.created_at DESC
    `)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (res as any).rows ?? (res as any) ?? []
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getDiscrepanciesAction() {
  try {
    const res = await db.execute(sql`
      SELECT
        d.id,
        d.po_id,
        d.product_id,
        d.po_item_id,
        d.discrepancy_type,
        d.status,
        d.admin_comment,
        d.ordered_qty,
        d.received_qty,
        d.shortfall,
        d.created_at,
        po.po_number,
        po.vendor_id,
        v.name        AS vendor_name,
        p.model_name  AS product_name,
        p.product_code
      FROM discrepancies d
      LEFT JOIN purchase_orders po ON po.id = d.po_id
      LEFT JOIN vendors          v  ON v.id  = po.vendor_id
      LEFT JOIN products         p  ON p.id  = d.product_id
      ORDER BY d.created_at DESC
    `)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (res as any).rows ?? (res as any) ?? []
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}
