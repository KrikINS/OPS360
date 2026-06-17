import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { purchase_orders, po_items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hasCapability, branchFilterFor } from "@/lib/access";

type POItemPayload = {
  product_id: string
  quantity: number
  unit_price: number
  tax_rate?: number
}

type SqlRows = { rows?: Record<string, unknown>[] }

export async function GET() {
  try {
    const res = await db.execute(sql`
      SELECT
        po.*,
        row_to_json(v.*) AS vendor,
        row_to_json(b.*) AS branch,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id',                pi.id,
            'po_id',             pi.po_id,
            'product_id',        pi.product_id,
            'quantity',          pi.ordered_qty,
            'unit_price',        pi.unit_cost,
            'tax_rate',          COALESCE(h.gst_rate, p.gst_rate, 0),
            'total_item_cost',   pi.ordered_qty * pi.unit_cost * (1 + COALESCE(h.gst_rate, p.gst_rate, 0) / 100),
            'received_quantity', COALESCE(pi.received_qty, 0),
            'product', jsonb_build_object(
              'id',           p.id,
              'model_name',   p.model_name,
              'product_code', p.product_code,
              'hsn_code',     p.hsn_code,
              'brand',        p.brand
            )
          )) FILTER (WHERE pi.id IS NOT NULL), '[]'
        ) AS items,
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
        ) AS vendor_bills,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM vendor_payments vp
          WHERE vp.po_id = po.id
        ) AS paid_amount,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', vp.id,
              'amount', vp.amount,
              'payment_method', vp.payment_method,
              'reference_number', vp.reference_number,
              'payment_date', vp.payment_date,
              'notes', vp.notes
            )
          )
          FROM vendor_payments vp
          WHERE vp.po_id = po.id
        ), '[]') AS payments,
        (
          SELECT json_agg(
            json_build_object(
              'id',                gr.id,
              'grn_number',        gr.grn_number,
              'has_discrepancy',   gr.has_discrepancy,
              'total_landed_cost', gr.total_landed_cost,
              'created_at',        gr.created_at,
              'grn_items', (
                SELECT json_agg(
                  json_build_object(
                    'id',               gi.id,
                    'product_id',       gi.product_id,
                    'ordered_qty',      gi.ordered_qty,
                    'received_qty',     gi.received_qty,
                    'landed_unit_cost', gi.landed_unit_cost,
                    'freight_value',    gi.landed_unit_cost * gi.received_qty
                  )
                )
                FROM grn_items gi
                WHERE gi.grn_id = gr.id
              )
            )
          )
          FROM grn_receipts gr
          WHERE gr.po_id = po.id
        ) AS grns
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN branches b ON po.branch_id = b.id
      LEFT JOIN po_items pi ON pi.po_id = po.id
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN hsn_codes h ON h.hsn_code = p.hsn_code
      LEFT JOIN discrepancies d ON d.po_id = po.id
      LEFT JOIN vendor_bills vb ON vb.po_id = po.id
      GROUP BY po.id, v.id, b.id
      ORDER BY po.created_at DESC
    `);

    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[];
    const data = Array.isArray(result) ? result : (result as { rows?: Record<string, unknown>[] }).rows || [];
    return NextResponse.json(data);
  } catch (error) {
    console.error('PO API ERROR:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasCapability("procurement", "edit", session))) {
      return NextResponse.json(
        { error: 'Insufficient permission' },
        { status: 403 }
      );
    }

    const payload = await request.json();
    const {
      vendor_id,
      branch_id,
      items,
      expected_delivery,
      is_partial_billing,
      status,
      terms_content,
      payment_terms,
    } = payload;

    if (!vendor_id || !branch_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: vendor_id, branch_id, items' },
        { status: 400 }
      );
    }

    const poAllowed = await branchFilterFor(session, "procurement", "edit");
    if (poAllowed !== null && !poAllowed.includes(branch_id)) {
      return NextResponse.json(
        { error: "You don't have access to this branch" },
        { status: 403 }
      );
    }

    // Generate PO number
    const year = new Date().getFullYear();
    const poCounterRes = await db.execute(sql`
      INSERT INTO sequential_counters (prefix, year, current_value)
      VALUES ('PO', ${year}, 1)
      ON CONFLICT (prefix, year) DO UPDATE
        SET current_value = sequential_counters.current_value + 1
      RETURNING current_value
    `);
    const poCounterRows = (
      (poCounterRes as unknown as { rows?: { current_value: number }[] }).rows ??
      (poCounterRes as unknown as { current_value: number }[])
    );
    const poCounterValue = poCounterRows[0]?.current_value;
    const poNumber = `PO/${year}/${poCounterValue}`;

    // Calculate totals — total_amount stored inc-GST (vendor-payable amount)
    const subtotalAmount = items.reduce(
      (sum: number, item: POItemPayload) =>
        sum + item.quantity * item.unit_price,
      0
    );
    const totalAmount = items.reduce(
      (sum: number, item: POItemPayload) => {
        const base = item.quantity * item.unit_price
        const gst  = base * ((item.tax_rate ?? 0) / 100)
        return sum + base + gst
      },
      0
    );
    const totalGSTAmount = totalAmount - subtotalAmount;

    // Insert PO
    const inserted = await db
      .insert(purchase_orders)
      .values({
        po_number: poNumber,
        status: status || 'pending_approval',
        vendor_id,
        branch_id,
        created_by: session.user.id,
        total_amount: String(totalAmount),
        expected_delivery_date: expected_delivery || null,
        is_partial_billing: is_partial_billing || false,
        terms_content,
        payment_terms,
      } as Record<string, unknown>)
      .returning();

    const poRecord = inserted[0];
    if (!poRecord) {
      return NextResponse.json(
        { error: 'Failed to create purchase order' },
        { status: 500 }
      );
    }

    // Insert PO items
    if (items && items.length > 0) {
      await db.insert(po_items).values(
        items.map((item: POItemPayload) => ({
          po_id: poRecord.id,
          product_id: item.product_id,
          ordered_qty: item.quantity,
          unit_cost: String(item.unit_price),
        }))
      );
    }

    // Fetch and return complete PO
    const res = await db.execute(sql`
      SELECT
        po.*,
        row_to_json(v.*) AS vendor,
        row_to_json(b.*) AS branch,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id',                pi.id,
            'po_id',             pi.po_id,
            'product_id',        pi.product_id,
            'quantity',          pi.ordered_qty,
            'unit_price',        pi.unit_cost,
            'tax_rate',          COALESCE(h.gst_rate, p.gst_rate, 0),
            'total_item_cost',   pi.ordered_qty * pi.unit_cost * (1 + COALESCE(h.gst_rate, p.gst_rate, 0) / 100),
            'received_quantity', COALESCE(pi.received_qty, 0),
            'product', jsonb_build_object(
              'id',           p.id,
              'model_name',   p.model_name,
              'product_code', p.product_code,
              'hsn_code',     p.hsn_code,
              'brand',        p.brand
            )
          )) FILTER (WHERE pi.id IS NOT NULL), '[]'
        ) AS items,
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
        ) AS vendor_bills,
        (
          SELECT json_agg(
            json_build_object(
              'id',                gr.id,
              'grn_number',        gr.grn_number,
              'has_discrepancy',   gr.has_discrepancy,
              'total_landed_cost', gr.total_landed_cost,
              'created_at',        gr.created_at,
              'grn_items', (
                SELECT json_agg(
                  json_build_object(
                    'id',               gi.id,
                    'product_id',       gi.product_id,
                    'ordered_qty',      gi.ordered_qty,
                    'received_qty',     gi.received_qty,
                    'landed_unit_cost', gi.landed_unit_cost,
                    'freight_value',    gi.landed_unit_cost * gi.received_qty
                  )
                )
                FROM grn_items gi
                WHERE gi.grn_id = gr.id
              )
            )
          )
          FROM grn_receipts gr
          WHERE gr.po_id = po.id
        ) AS grns
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN branches b ON po.branch_id = b.id
      LEFT JOIN po_items pi ON pi.po_id = po.id
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN hsn_codes h ON h.hsn_code = p.hsn_code
      LEFT JOIN discrepancies d ON d.po_id = po.id
      LEFT JOIN vendor_bills vb ON vb.po_id = po.id
      WHERE po.id = ${poRecord.id}
      GROUP BY po.id, v.id, b.id
    `);

    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[];
    const data = Array.isArray(result) ? result[0] : (result as SqlRows).rows?.[0];
    return NextResponse.json(data);
  } catch (error) {
    console.error('PO creation error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasCapability("procurement", "edit", session))) {
      return NextResponse.json(
        { error: 'Insufficient permission' },
        { status: 403 }
      );
    }

    const payload = await request.json();
    const { id, status, items, ...rest } = payload;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    if (rest.branch_id) {
      const poAllowed = await branchFilterFor(session, "procurement", "edit");
      if (poAllowed !== null && !poAllowed.includes(rest.branch_id)) {
        return NextResponse.json(
          { error: "You don't have access to this branch" },
          { status: 403 }
        );
      }
    }

    // Check PO exists
    const existing = await db
      .select()
      .from(purchase_orders)
      .where(eq(purchase_orders.id, id))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Update PO
    const updateData: Record<string, unknown> = {
      ...rest,
      status: status || existing[0].status,
    };

    await db
      .update(purchase_orders)
      .set(updateData)
      .where(eq(purchase_orders.id, id));

    // If items provided, update po_items
    if (items && items.length > 0) {
      // Delete existing items
      await db.execute(
        sql`DELETE FROM po_items WHERE po_id = ${id}`
      );

      // Insert new items
      await db.insert(po_items).values(
        items.map((item: POItemPayload) => ({
          po_id: id,
          product_id: item.product_id,
          ordered_qty: item.quantity,
          unit_cost: String(item.unit_price),
        }))
      );
    }

    // Fetch and return complete PO
    const res = await db.execute(sql`
      SELECT
        po.*,
        row_to_json(v.*) AS vendor,
        row_to_json(b.*) AS branch,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id',                pi.id,
            'po_id',             pi.po_id,
            'product_id',        pi.product_id,
            'quantity',          pi.ordered_qty,
            'unit_price',        pi.unit_cost,
            'tax_rate',          COALESCE(h.gst_rate, p.gst_rate, 0),
            'total_item_cost',   pi.ordered_qty * pi.unit_cost * (1 + COALESCE(h.gst_rate, p.gst_rate, 0) / 100),
            'received_quantity', COALESCE(pi.received_qty, 0),
            'product', jsonb_build_object(
              'id',           p.id,
              'model_name',   p.model_name,
              'product_code', p.product_code,
              'hsn_code',     p.hsn_code,
              'brand',        p.brand
            )
          )) FILTER (WHERE pi.id IS NOT NULL), '[]'
        ) AS items,
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
        ) AS vendor_bills,
        (
          SELECT json_agg(
            json_build_object(
              'id',                gr.id,
              'grn_number',        gr.grn_number,
              'has_discrepancy',   gr.has_discrepancy,
              'total_landed_cost', gr.total_landed_cost,
              'created_at',        gr.created_at,
              'grn_items', (
                SELECT json_agg(
                  json_build_object(
                    'id',               gi.id,
                    'product_id',       gi.product_id,
                    'ordered_qty',      gi.ordered_qty,
                    'received_qty',     gi.received_qty,
                    'landed_unit_cost', gi.landed_unit_cost,
                    'freight_value',    gi.landed_unit_cost * gi.received_qty
                  )
                )
                FROM grn_items gi
                WHERE gi.grn_id = gr.id
              )
            )
          )
          FROM grn_receipts gr
          WHERE gr.po_id = po.id
        ) AS grns
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN branches b ON po.branch_id = b.id
      LEFT JOIN po_items pi ON pi.po_id = po.id
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN hsn_codes h ON h.hsn_code = p.hsn_code
      LEFT JOIN discrepancies d ON d.po_id = po.id
      LEFT JOIN vendor_bills vb ON vb.po_id = po.id
      WHERE po.id = ${id}
      GROUP BY po.id, v.id, b.id
    `);

    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[];
    const data = Array.isArray(result) ? result[0] : (result as SqlRows).rows?.[0];
    return NextResponse.json(data);
  } catch (error) {
    console.error('PO update error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
