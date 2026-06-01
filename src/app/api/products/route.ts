import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db.select().from(products).where(eq(products.is_archived, false));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    await db.insert(products).values({
      brand: body.brand,
      category: body.category,
      product_code: body.product_code,
      model_name: body.model_name,
      hsn_code: body.hsn_code,
      base_price: body.base_price?.toString() || body.unit_rate?.toString(),
      gst_rate: body.gst_rate?.toString() || body.tax_rate?.toString(),
      min_stock_level: body.min_stock_level ? parseInt(body.min_stock_level) : 0,
      warranty_months: body.warranty_months ? parseInt(body.warranty_months) : null,
      description: body.description
    });

    return NextResponse.json({ success: true, message: 'Product created' }, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ success: false, error: 'Database insertion failed' }, { status: 500 });
  }
}
