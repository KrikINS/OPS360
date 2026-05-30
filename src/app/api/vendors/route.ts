import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { vendors } from '@/db/schema';

export async function GET() {
  try {
    const data = await db.select().from(vendors);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
