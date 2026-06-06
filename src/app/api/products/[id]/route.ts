import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const params = await context.params;
    const productId = params.id;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    
    if (body.hsn_code !== undefined) updateData.hsn_code = body.hsn_code;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.product_code !== undefined) updateData.product_code = body.product_code;
    if (body.model_name !== undefined) updateData.model_name = body.model_name;
    if (body.base_price !== undefined) updateData.base_price = body.base_price === null ? null : body.base_price.toString();
    if (body.mrp !== undefined) updateData.mrp = body.mrp === null ? null : body.mrp.toString();
    if (body.dealer_price !== undefined) updateData.dealer_price = body.dealer_price === null ? null : body.dealer_price.toString();
    if (body.min_sell_price !== undefined) updateData.min_sell_price = body.min_sell_price === null ? null : body.min_sell_price.toString();
    if (body.margin_pct !== undefined) updateData.margin_pct = body.margin_pct?.toString();
    if (body.max_discount_pct !== undefined) updateData.max_discount_pct = body.max_discount_pct?.toString();
    if (body.gst_rate !== undefined) updateData.gst_rate = body.gst_rate?.toString();
    if (body.min_stock_level !== undefined) updateData.min_stock_level = parseInt(body.min_stock_level);
    if (body.warranty_months !== undefined) updateData.warranty_months = parseInt(body.warranty_months);
    if (body.description !== undefined) updateData.description = body.description;

    await db.update(products)
      .set(updateData)
      .where(eq(products.id, productId));

    return NextResponse.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ success: false, error: 'Database update failed' }, { status: 500 });
  }
}
