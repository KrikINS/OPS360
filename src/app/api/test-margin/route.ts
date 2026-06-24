import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db.execute(sql`
      SELECT
        p.id AS product_id,
        p.model_name,
        p.brand,
        p.product_code,
        p.base_price AS mrp,
        COUNT(ii.id) AS units_sold,
        SUM(ii.unit_price * ii.qty) AS total_revenue,
        SUM(COALESCE(ii.cost_price, 0) * ii.qty) AS total_cogs,
        SUM(ii.unit_price * ii.qty) -
          SUM(COALESCE(ii.cost_price, 0) * ii.qty)
          AS gross_profit
      FROM invoice_items ii
      JOIN sales_invoices si ON si.id = ii.invoice_id
      JOIN products p ON p.id = ii.product_id
      WHERE si.created_at >= '2026-04-01'::timestamp
        AND si.created_at <= '2026-06-24'::timestamp + interval '1 day' - interval '1 second'
      GROUP BY p.id, p.model_name, p.brand,
        p.product_code, p.base_price
      ORDER BY gross_profit DESC
    `);
    return NextResponse.json(result.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
