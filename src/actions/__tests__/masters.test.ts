import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { branches, sequential_counters } from '@/db/schema'
import { addBranchAction } from '@/app/actions/masters'
import { sql } from 'drizzle-orm'

describe('Branch Actions', () => {
  beforeAll(async () => {
    // Cleanup before tests
    await db.delete(branches)
    await db.delete(sequential_counters).where(sql`prefix = 'BR'`)
  })

  afterAll(async () => {
    // Cleanup after tests
    await db.delete(branches)
    await db.delete(sequential_counters).where(sql`prefix = 'BR'`)
  })

  it('should generate sequential 3-digit branch codes (BR001, BR002) correctly', async () => {
    const branch1 = await addBranchAction({ name: 'Test Branch 1', city: 'Kochi', state: 'Kerala' })
    expect(branch1.data?.code).toBe('BR001')

    const branch2 = await addBranchAction({ name: 'Test Branch 2', city: 'Kochi', state: 'Kerala' })
    expect(branch2.data?.code).toBe('BR002')
  })
})
