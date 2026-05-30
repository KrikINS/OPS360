import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const res = await db.execute(sql`
      SELECT
        po.*,
        row_to_json(v.*) AS vendor,
        row_to_json(b.*) AS branch,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', d.id,
            'discrepancy_type', d.discrepancy_type,
            'status', d.status,
            'admin_comment', d.admin_comment,
            'created_at', d.created_at
          )) FILTER (WHERE d.id IS NOT NULL), '[]'
        ) AS discrepancies,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', vb.id,
            'bill_number', vb.bill_number,
            'bill_amount', vb.bill_amount,
            'file_path', vb.file_path,
            'created_at', vb.created_at
          )) FILTER (WHERE vb.id IS NOT NULL), '[]'
        ) AS vendor_bills
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN branches b ON po.branch_id = b.id
      LEFT JOIN discrepancies d ON d.po_id = po.id
      LEFT JOIN vendor_bills vb ON vb.po_id = po.id
      GROUP BY po.id, v.id, b.id
      ORDER BY po.created_at DESC
    `);

    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[];
    const data = Array.isArray(result) ? result : (result as { rows?: Record<string, unknown>[] }).rows || [];
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
