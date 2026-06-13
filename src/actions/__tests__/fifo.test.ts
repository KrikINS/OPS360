import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDb, teardownTestDb, cleanupTestDb, seedBranch, seedProduct, type TestDb } from '@/test/db'
import { inventory } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

let db: TestDb

beforeAll(async () => { db = await setupTestDb() })
afterAll(async () => { await teardownTestDb() })
beforeEach(async () => { await cleanupTestDb(db) })

describe('FIFO inventory costing', () => {
  it('FIFO selects oldest unit first (lowest landed cost in a rising-cost scenario)', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id, price: 10000 })

    // Insert units with different landed costs and explicit created_at to simulate FIFO order
    const now = new Date()
    const unit1 = { id: crypto.randomUUID(), product_id: product.id, branch_id: branch.id, status: 'Available', landed_cost: '4000', created_at: new Date(now.getTime() - 2000) }
    const unit2 = { id: crypto.randomUUID(), product_id: product.id, branch_id: branch.id, status: 'Available', landed_cost: '5000', created_at: new Date(now.getTime() - 1000) }
    const unit3 = { id: crypto.randomUUID(), product_id: product.id, branch_id: branch.id, status: 'Available', landed_cost: '6000', created_at: now }

    await db.insert(inventory).values([unit1, unit2, unit3])

    // Simulate FIFO selection: ORDER BY created_at ASC LIMIT 1
    const [fifoUnit] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.product_id, product.id), eq(inventory.status, 'Available')))
      .orderBy(inventory.created_at)
      .limit(1)

    expect(fifoUnit.id).toBe(unit1.id)
    expect(Number(fifoUnit.landed_cost)).toBe(4000)
  })

  it('FIFO average cost: multiple units of same product average correctly', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })

    const costs = [4000, 4500, 5000]
    const units = costs.map(cost => ({
      id: crypto.randomUUID(),
      product_id: product.id,
      branch_id: branch.id,
      status: 'Available',
      landed_cost: String(cost),
    }))
    await db.insert(inventory).values(units)

    const allUnits = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.product_id, product.id), eq(inventory.status, 'Available')))

    const avgCost = allUnits.reduce((s, u) => s + Number(u.landed_cost), 0) / allUnits.length
    expect(avgCost).toBe(4500)
  })

  it('sold units reduce available stock correctly', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })

    const units = Array.from({ length: 5 }, () => ({
      id: crypto.randomUUID(),
      product_id: product.id,
      branch_id: branch.id,
      status: 'Available',
      landed_cost: '4000',
    }))
    await db.insert(inventory).values(units)

    // Mark first 2 as Sold
    await db.update(inventory)
      .set({ status: 'Sold' })
      .where(eq(inventory.id, units[0].id))
    await db.update(inventory)
      .set({ status: 'Sold' })
      .where(eq(inventory.id, units[1].id))

    const available = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.product_id, product.id), eq(inventory.status, 'Available')))

    expect(available).toHaveLength(3)
  })
})
