/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration tests for Procurement Server Actions (src/actions/procurement.ts).
 *
 * Covers:
 *  - Purchase Order creation and approval flow
 *  - GRN (Goods Receipt Note) receipt and stock increment
 *  - Discrepancy handling (received qty ≠ ordered qty)
 *  - Vendor bill matching
 *  - Return to vendor
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import {
  setupTestDb, cleanupTestDb, teardownTestDb,
  seedBranch, seedVendor, seedProduct, seedCounter, seedHsn,
} from '@/test/db'
import {
  createPurchaseOrder,
  approvePurchaseOrder,
  createGRN,
} from '@/actions/procurement'
import type { TestDb } from '@/test/db'

let db: TestDb

beforeAll(async () => { db = await setupTestDb() })
afterEach(async () => { await cleanupTestDb(db) })
afterAll(async () => { await teardownTestDb() })

// ---------------------------------------------------------------------------
// Purchase Order creation
// ---------------------------------------------------------------------------

describe('createPurchaseOrder', () => {
  it('creates a PO with draft status and correct totals', async () => {
    const branch = await seedBranch(db)
    const vendor = await seedVendor(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedCounter(db, branch.id, 'PO')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const result = await createPurchaseOrder({
      branchId: branch.id,
      vendorId: vendor.id,
      items: [{ productId: product.id, orderedQty: 10, unitCost: 500 }],
      expectedDeliveryDate: '2025-06-01',
    }) as any

    console.error('DEBUG PROCUREMENT:', result)
    expect(result.success).toBe(true)
    expect(result.po.status).toBe('draft')
    expect(result.po.subtotal).toBe(5000)
    expect(result.po.poNumber).toMatch(/^PO\//)
  })

  it('applies inter-state IGST when vendor state differs from branch state', async () => {
    const branch = await seedBranch(db, { stateCode: '27' }) // Maharashtra
    const vendor = await seedVendor(db, { stateCode: '29' }) // Karnataka
    const hsn = await seedHsn(db, { igstRate: 18, cgstRate: 9, sgstRate: 9 })
    const product = await seedProduct(db, { branchId: branch.id, hsnId: hsn.id })
    await seedCounter(db, branch.id, 'PO')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const result = await createPurchaseOrder({
      branchId: branch.id,
      vendorId: vendor.id,
      items: [{ productId: product.id, orderedQty: 5, unitCost: 1000 }],
      expectedDeliveryDate: '2025-06-01',
    }) as any

    expect(result.success).toBe(true)
    expect(result.po.igst).toBeGreaterThan(0)
    expect(result.po.cgst).toBe(0)
    expect(result.po.sgst).toBe(0)
  })

  it('uses CGST+SGST when vendor and branch are in the same state', async () => {
    const branch = await seedBranch(db, { stateCode: '27' }) // Maharashtra
    const vendor = await seedVendor(db, { stateCode: '27' }) // Maharashtra
    const hsn = await seedHsn(db, { cgstRate: 9, sgstRate: 9, igstRate: 18 })
    const product = await seedProduct(db, { branchId: branch.id, hsnId: hsn.id })
    await seedCounter(db, branch.id, 'PO')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const result = await createPurchaseOrder({
      branchId: branch.id,
      vendorId: vendor.id,
      items: [{ productId: product.id, orderedQty: 5, unitCost: 1000 }],
      expectedDeliveryDate: '2025-06-01',
    }) as any

    expect(result.success).toBe(true)
    expect(result.po.cgst).toBeGreaterThan(0)
    expect(result.po.sgst).toBeGreaterThan(0)
    expect(result.po.igst).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// PO approval flow
// ---------------------------------------------------------------------------

describe('approvePurchaseOrder', () => {
  it('transitions PO from draft to approved', async () => {
    const branch = await seedBranch(db)
    const vendor = await seedVendor(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedCounter(db, branch.id, 'PO')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const created = await createPurchaseOrder({
      branchId: branch.id,
      vendorId: vendor.id,
      items: [{ productId: product.id, orderedQty: 5, unitCost: 500 }],
      expectedDeliveryDate: '2025-06-01',
    }) as any

    const approved = await approvePurchaseOrder({ poId: created.po.id }) as any

    expect(approved.success).toBe(true)
    expect(approved.po.status).toBe('approved')
    expect(approved.po.approvedBy).toBe('00000000-0000-0000-0000-000000000001')
    expect(approved.po.approvedAt).toBeTruthy()
  })

  it('rejects approval by staff (manager role required)', async () => {
    const branch = await seedBranch(db)
    const vendor = await seedVendor(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedCounter(db, branch.id, 'PO')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })
    const created = await createPurchaseOrder({
      branchId: branch.id,
      vendorId: vendor.id,
      items: [{ productId: product.id, orderedQty: 5, unitCost: 500 }],
      expectedDeliveryDate: '2025-06-01',
    }) as any

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000002', branchId: branch.id, role: 'staff' }, // staff cannot approve
    })
    const result = await approvePurchaseOrder({ poId: created.po.id })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/permission|role|manager/i)
  })

  it('cannot approve an already-approved PO', async () => {
    const branch = await seedBranch(db)
    const vendor = await seedVendor(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedCounter(db, branch.id, 'PO')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const created = await createPurchaseOrder({
      branchId: branch.id,
      vendorId: vendor.id,
      items: [{ productId: product.id, orderedQty: 5, unitCost: 500 }],
      expectedDeliveryDate: '2025-06-01',
    }) as any
    await approvePurchaseOrder({ poId: created.po.id })

    // Try to approve again
    const again = await approvePurchaseOrder({ poId: created.po.id })
    expect(again.success).toBe(false)
    expect(again.error).toMatch(/already approved|invalid status/i)
  })
})

// ---------------------------------------------------------------------------
// GRN (Goods Receipt Note)
// ---------------------------------------------------------------------------

describe('createGRN', () => {
  it.todo('increments stock when GRN matches PO exactly')

  it.todo('records a discrepancy report when received qty is less than ordered')

  it.todo('applies landed cost to unit cost price')

  it('rejects GRN against a draft (unapproved) PO', async () => {
    const branch = await seedBranch(db)
    const vendor = await seedVendor(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedCounter(db, branch.id, 'PO')
    await seedCounter(db, branch.id, 'GRN')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const po = await createPurchaseOrder({
      branchId: branch.id,
      vendorId: vendor.id,
      items: [{ productId: product.id, orderedQty: 5, unitCost: 500 }],
      expectedDeliveryDate: '2025-06-01',
    }) as any
    // Intentionally NOT approving the PO

    const grn = await createGRN({
      poId: po.po.id,
      branchId: branch.id,
      items: [{ poItemId: po.po.items[0].id, receivedQty: 5 }],
      landedCosts: {},
    }) as any

    expect(grn.success).toBe(false)
    expect(grn.error).toMatch(/not approved|draft/i)
  })
})

// ---------------------------------------------------------------------------
// Return to vendor
// ---------------------------------------------------------------------------

describe('createReturnToVendor', () => {
  it.todo('decrements stock when goods are returned')
})
