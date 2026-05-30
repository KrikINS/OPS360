import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { vendors } from '@/db/schema';
import { eq } from 'drizzle-orm';
export async function GET() {
  try {
    const data = await db.select().from(vendors);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    await db.insert(vendors).values({
      name: body.name,
      trade_name: body.trade_name,
      gstin: body.gstin,
      pan_number: body.pan_number,
      contact_person: body.contact_person,
      email: body.email,
      phone: body.phone,
      address: body.address,
      state_code: body.state_code,
      bank_details: body.bank_details,
      payment_terms: body.payment_terms,
      credit_limit: body.credit_limit ? body.credit_limit.toString() : null,
      category: body.category,
      brand_ids: body.brand_ids,
      category_ids: body.category_ids,
      status: 'Pending',
      compliance_status: 'Pending'
    });

    return NextResponse.json({ success: true, message: 'Vendor created' }, { status: 201 });
  } catch (error) {
    console.error('Failed to create vendor:', error);
    return NextResponse.json({ success: false, error: 'Database insertion failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Vendor ID is required' }, { status: 400 });
    }

    const [updatedVendor] = await db.update(vendors)
      .set(updateData)
      .where(eq(vendors.id, id))
      .returning();

    return NextResponse.json(updatedVendor, { status: 200 });
  } catch (error) {
    console.error('Failed to update vendor:', error);
    return NextResponse.json({ success: false, error: 'Database update failed' }, { status: 500 });
  }
}
