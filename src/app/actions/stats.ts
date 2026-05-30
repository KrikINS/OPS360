"use server"

import { db } from "@/db/client"
import { products } from "@/db/schema"
import { sql } from "drizzle-orm"

export async function getLaunchpadStatsAction() {
  try {
    const res = await db.select({
      count: sql<number>`count(*)`
    }).from(products).where(sql`${products.min_stock_level} > 0`)
    
    return { data: { lowStockCount: Number(res[0]?.count || 0) } }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}
