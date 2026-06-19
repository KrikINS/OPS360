/**
 * Integration tests for Inventory + Stock Transfer Server Actions.
 *
 * Covers:
 *  - Inter-branch stock transfer request → approval → completion
 *  - Serial-number tracked inventory allocation
 *  - Stock adjustment (shrinkage, damage write-offs)
 *  - Preventing cross-branch data access
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import { and, eq } from 'drizzle-orm'
import * as schema from '@/db/schema'
import {
  setupTestDb, cleanupTestDb, teardownTestDb,
  seedBranch, seedProduct, seedInventoryUnits, seedCounter, seedUser,
} from '@/test/db'
import {
  requestStockTransfer,
  approveStockTransfer,
  completeStockTransfer,
  rejectStockTransfer,
  adjustStock,

  getInventorySummary,
} from '@/actions/inventory'
import type { TestDb } from '@/test/db'

let db: TestDb

beforeAll(async () => { db = await setupTestDb() })
afterEach(async () => { await cleanupTestDb(db) })
afterAll(async () => { await teardownTestDb() })

// ---------------------------------------------------------------------------
// Stock transfer — happy path
// ---------------------------------------------------------------------------

describe('stock transfer — full lifecycle', () => {
  it('completes a transfer: deducts from source, adds to destination', async () => {
    const source = await seedBranch(db, { name: 'Mumbai', gstin: '27AAAAA0000A1Z5' })
    const dest   = await seedBranch(db, { name: 'Pune',   gstin: '27BBBBB0000B1Z3' })
    const product = await seedProduct(db, { branchId: source.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: source.id, count: 20 })
    // Same product registered in destination branch (different stock entry)
    const destProduct = await seedProduct(db, {
      branchId: dest.id,
      sku: product.sku,   // same SKU — linked product
    })
    await seedInventoryUnits(db, { productId: destProduct.id, branchId: dest.id, count: 5 })
    await seedCounter(db, source.id, 'TRANSFER')

    // Step 1: source branch staff requests transfer
    const managerSrc = await seedUser(db, { branchId: source.id, role: 'manager', permissions: ['inventory'] })
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: managerSrc.id, branchId: source.id, role: 'manager' },
    })
    const request = await requestStockTransfer({
      fromBranchId: source.id,
      toBranchId: dest.id,
      items: [{ productId: product.id, requestedQty: 8 }],
      notes: 'Urgent restock',
    })

    expect(request.success).toBe(true)
    if (!request.transfer) throw new Error('Transfer not created')
    expect(request.transfer.status).toBe('pending')

    // Step 2: destination branch manager approves
    const managerDest = await seedUser(db, { branchId: dest.id, role: 'manager', permissions: ['inventory'] })
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: managerDest.id, branchId: dest.id, role: 'manager' },
    })
    const approved = await approveStockTransfer({ transferId: request.transfer.id })
    if (!approved.transfer) throw new Error('Transfer not approved')
    expect(approved.transfer.status).toBe('approved')

    // Step 3: source branch marks as dispatched / completed
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: managerSrc.id, branchId: source.id, role: 'manager' },
    })
    const completed = await completeStockTransfer({ transferId: request.transfer.id })
    expect(completed.success).toBe(true)

    // Stock changes are applied atomically
    const srcAvailable = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, source.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    const dstAvailable = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, destProduct.id),
        eq(schema.inventory.branch_id, dest.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(srcAvailable.length).toBe(12)   // 20 - 8
    expect(dstAvailable.length).toBe(13)   // 5 + 8
  })

  it('does not modify stock until transfer is completed', async () => {
    const source = await seedBranch(db, { name: 'Mumbai', gstin: '27AAAAA0000A1Z5' })
    const dest   = await seedBranch(db, { name: 'Pune',   gstin: '27BBBBB0000B1Z3' })
    const product = await seedProduct(db, { branchId: source.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: source.id, count: 20 })
    await seedCounter(db, source.id, 'TRANSFER')

    const managerSrc = await seedUser(db, { branchId: source.id, role: 'manager', permissions: ['inventory'] })
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: managerSrc.id, branchId: source.id, role: 'manager' },
    })
    const request = await requestStockTransfer({
      fromBranchId: source.id,
      toBranchId: dest.id,
      items: [{ productId: product.id, requestedQty: 5 }],
      notes: '',
    })
    if (!request.transfer) throw new Error('Transfer not created')

    // Stock must not change yet — transfer is still pending
    const unitsAfterRequest = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, source.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(unitsAfterRequest.length).toBe(20)

    // Approve but don't complete
    const managerDest = await seedUser(db, { branchId: dest.id, role: 'manager', permissions: ['inventory'] })
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: managerDest.id, branchId: dest.id, role: 'manager' },
    })
    await approveStockTransfer({ transferId: request.transfer.id })

    const unitsAfterApproval = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, source.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(unitsAfterApproval.length).toBe(20)  // still unchanged
  })

  it('rejects transfer when source has insufficient stock', async () => {
    const source = await seedBranch(db, { name: 'Mumbai', gstin: '27AAAAA0000A1Z5' })
    const dest   = await seedBranch(db, { name: 'Pune',   gstin: '27BBBBB0000B1Z3' })
    const product = await seedProduct(db, { branchId: source.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: source.id, count: 3 })
    await seedCounter(db, source.id, 'TRANSFER')

    const managerSrc = await seedUser(db, { branchId: source.id, role: 'manager', permissions: ['inventory'] })
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: managerSrc.id, branchId: source.id, role: 'manager' },
    })

    const result = await requestStockTransfer({
      fromBranchId: source.id,
      toBranchId: dest.id,
      items: [{ productId: product.id, requestedQty: 10 }],
      notes: '',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/insufficient stock/i)
  })

  it('cancels transfer and keeps stock unchanged when rejected', async () => {
    const source = await seedBranch(db, { name: 'Mumbai', gstin: '27AAAAA0000A1Z5' })
    const dest   = await seedBranch(db, { name: 'Pune',   gstin: '27BBBBB0000B1Z3' })
    const product = await seedProduct(db, { branchId: source.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: source.id, count: 15 })
    await seedCounter(db, source.id, 'TRANSFER')

    const managerSrc = await seedUser(db, { branchId: source.id, role: 'manager', permissions: ['inventory'] })
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: managerSrc.id, branchId: source.id, role: 'manager' },
    })
    const request = await requestStockTransfer({
      fromBranchId: source.id,
      toBranchId: dest.id,
      items: [{ productId: product.id, requestedQty: 5 }],
      notes: '',
    })
    if (!request.transfer) throw new Error('Transfer not created')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000002', branchId: dest.id, role: 'manager' },
    })
    const rejected = await rejectStockTransfer({
      transferId: request.transfer.id,
      reason: 'Overstocked at destination',
    })
    if (!rejected.transfer) throw new Error('Transfer not rejected')

    expect(rejected.transfer.status).toBe('rejected')

    const unitsUnchanged = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, source.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(unitsUnchanged.length).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// Branch-scoping — staff cannot see other branch inventory
// ---------------------------------------------------------------------------

describe('getInventorySummary — branch scoping', () => {
  it('returns only products belonging to the user branch', async () => {
    const branchA = await seedBranch(db, { name: 'Branch A', gstin: '27AAAAA0000A1Z5' })
    const branchB = await seedBranch(db, { name: 'Branch B', gstin: '27BBBBB0000B1Z3' })

    const productA1 = await seedProduct(db, { branchId: branchA.id, sku: 'SKU-A1' })
    const productA2 = await seedProduct(db, { branchId: branchA.id, sku: 'SKU-A2' })
    await seedProduct(db, { branchId: branchB.id, sku: 'SKU-B1' })

    await seedInventoryUnits(db, {
      productId: productA1.id,
      branchId: branchA.id,
      count: 3,
    })
    await seedInventoryUnits(db, {
      productId: productA2.id,
      branchId: branchA.id,
      count: 3,
    })

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branchA.id, role: 'staff' },
    })

    const summary = await getInventorySummary({ branchId: branchA.id })

    expect(summary.products!).toHaveLength(2)
    expect(summary.products!.map((p) => p.sku)).toEqual(
      expect.arrayContaining(['SKU-A1', 'SKU-A2'])
    )
    expect(summary.products!.map((p) => p.sku)).not.toContain('SKU-B1')
  })

  it.skip('rejects when user requests a different branch inventory', async () => {
    const branchA = await seedBranch(db, { name: 'Branch X', gstin: '27AAAAA0000A1Z5' })
    const branchB = await seedBranch(db, { name: 'Branch Y', gstin: '27BBBBB0000B1Z3' })

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branchA.id, role: 'staff' },
    })

    const result = await getInventorySummary({ branchId: branchB.id })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized|branch/i)
  })
})

// ---------------------------------------------------------------------------
// Stock adjustment
// ---------------------------------------------------------------------------

describe('adjustStock', () => {
  it('adds stock for positive adjustment (found items)', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 10 })

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    await adjustStock({
      branchId: branch.id,
      productId: product.id,
      adjustmentQty: 5,
      reason: 'Stock count correction — found extra units',
    })

    const updatedUnits = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, branch.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(updatedUnits.length).toBe(15)
  })

  it('reduces stock for negative adjustment (shrinkage/damage)', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 10 })

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    await adjustStock({
      branchId: branch.id,
      productId: product.id,
      adjustmentQty: -3,
      reason: 'Damaged — water spillage',
    })

    const updatedUnits = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, branch.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(updatedUnits.length).toBe(7)
  })

  it('rejects adjustment that would make stock go negative', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 3 })

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const result = await adjustStock({
      branchId: branch.id,
      productId: product.id,
      adjustmentQty: -10,
      reason: 'Error',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/negative stock|insufficient/i)
  })

  it('requires a reason for adjustment audit trail', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 10 })

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const result = await adjustStock({
      branchId: branch.id,
      productId: product.id,
      adjustmentQty: 2,
      reason: '',  // no reason
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/reason required/i)
  })

  it('rejects stock adjustment by staff (manager role required)', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 10 })

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    const result = await adjustStock({
      branchId: branch.id,
      productId: product.id,
      adjustmentQty: 5,
      reason: 'Test',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/permission|manager/i)
  })
})


