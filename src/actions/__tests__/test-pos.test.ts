import { db } from '@/db/client'
import { sql } from 'drizzle-orm'
import { describe, it } from 'vitest'

describe('pos debug', () => {
  it('runs', async () => {
    const res1 = await db.execute(sql`SELECT id, full_name, loyalty_balance FROM customers WHERE loyalty_balance > 0;`)
    console.log('CUSTOMERS:', res1.rows)
    const res2 = await db.execute(sql`SELECT customer_id, type, points, created_at FROM loyalty_points ORDER BY id DESC LIMIT 15;`)
    console.log('LOYALTY_POINTS:', res2.rows)
  })
})
