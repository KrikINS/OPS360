import { db } from '@/db/client'
import { branches } from '@/db/schema'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { asc } from 'drizzle-orm'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ data: [] }, { status: 401 })
  }
  try {
    const rows = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .orderBy(asc(branches.name))
    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error('Branches API error:', error)
    return NextResponse.json({ data: [] })
  }
}

export async function POST() {
  return NextResponse.json({ data: [] })
}
