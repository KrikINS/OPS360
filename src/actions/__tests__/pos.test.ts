/**
 * Integration tests for the POS Server Action (src/actions/pos.ts).
 *
 * These tests hit a real PostgreSQL database — set TEST_DATABASE_URL before running:
 *   TEST_DATABASE_URL=postgresql://localhost:5432/ops360_test npx vitest --project integration
 *
 * Each test starts with a clean DB (cleanupTestDb runs after every test).
 * The session mock in vitest.setup.ts provides a default logged-in staff user.
 * Override it per-test with vi.mocked(getServerSession).mockResolvedValueOnce(...)
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import { and, eq } from 'drizzle-orm'
import * as schema from '@/db/schema'
import {
  setupTestDb, cleanupTestDb, teardownTestDb,
  seedBranch, seedProduct, seedInventoryUnits, seedCounter,
} from '@/test/db'
import { createTransaction, voidTransaction, getTransactionById } from '@/actions/pos'
import { validateDiscount } from '@/actions/pricing'
import type { TestDb } from '@/test/db'

let db: TestDb

beforeAll(async () => { db = await setupTestDb() })
afterEach(async () => { await cleanupTestDb(db) })
afterAll(async () => { await teardownTestDb() })

describe('pos debug', () => {
  it('debug: confirm inventory rows exist after seeding', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, {
      productId: product.id,
      branchId: branch.id,
      count: 5,
    })
    const rows = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.product_id, product.id))
    console.log('INVENTORY ROWS:', rows)
    expect(rows.length).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('createTransaction — happy path', () => {
  it('creates a transaction with correct totals and GST breakdown', async () => {
    const branch = await seedBranch(db, { state: 'Maharashtra' })  // intra-state
    const product = await seedProduct(db, { branchId: branch.id, price: 1000 })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 20 })
    await seedCounter(db, branch.id, 'INV')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    const result = await createTransaction({
      branchId: branch.id,
      items: [{ productId: product.id, qty: 2, unitPrice: 1000 }],
      paymentMode: 'cash',
      customerId: null,
    })

    if (!result.success) {
      console.log('POS ERROR:', result.error)
    }
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.transaction.subtotal).toBe(1694.92)
    expect(result.transaction.cgst).toBe(152.54)
    expect(result.transaction.sgst).toBe(152.54)
    expect(result.transaction.igst).toBe(0)
    expect(result.transaction.grandTotal).toBe(2000)
  })

  it('assigns a sequential invoice number', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 5 })
    await seedCounter(db, branch.id, 'INV')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    const result = await createTransaction({
      branchId: branch.id,
      items: [{ productId: product.id, qty: 1, unitPrice: 500 }],
      paymentMode: 'upi',
      customerId: null,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.transaction.invoiceNumber).toMatch(/^INV\/\d{4}-\d{2}\/\d+$/)
  })

  it('decrements product stock after checkout', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 10 })
    await seedCounter(db, branch.id, 'INV')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    await createTransaction({
      branchId: branch.id,
      items: [{ productId: product.id, qty: 3, unitPrice: 500 }],
      paymentMode: 'cash',
      customerId: null,
    })

    const availableAfterCheckout = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, branch.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(availableAfterCheckout.length).toBe(7)
  })

  it('handles multi-product cart and records each line item', async () => {
    const branch = await seedBranch(db)
    const p1 = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: p1.id, branchId: branch.id, count: 5 })
    const p2 = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: p2.id, branchId: branch.id, count: 5 })
    await seedCounter(db, branch.id, 'INV')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    const result = await createTransaction({
      branchId: branch.id,
      items: [
        { productId: p1.id, qty: 2, unitPrice: 500 },
        { productId: p2.id, qty: 1, unitPrice: 800 },
      ],
      paymentMode: 'card',
      customerId: null,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.transaction.items).toHaveLength(2)
    expect(result.transaction.subtotal).toBe(1525.43)
  })
})

// ---------------------------------------------------------------------------
// Stock validation
// ---------------------------------------------------------------------------

describe('createTransaction — stock validation', () => {
  it('rejects when requested qty exceeds available stock', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 2 })
    await seedCounter(db, branch.id, 'INV')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    const result = await createTransaction({
      branchId: branch.id,
      items: [{ productId: product.id, qty: 5, unitPrice: 500 }],
      paymentMode: 'cash',
      customerId: null,
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/insufficient stock/i)
  })

  it('does not modify stock when transaction fails', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 2 })
    await seedCounter(db, branch.id, 'INV')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    await createTransaction({
      branchId: branch.id,
      items: [{ productId: product.id, qty: 99, unitPrice: 500 }],
      paymentMode: 'cash',
      customerId: null,
    })

    // Stock must be unchanged
    const unchangedUnits = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, branch.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(unchangedUnits.length).toBe(2)
  })

  it('rejects a product that belongs to a different branch', async () => {
    const branch1 = await seedBranch(db)
    const branch2 = await seedBranch(db, { name: 'Branch 2', gstin: '29BBBBB0000B1Z3' })
    const product = await seedProduct(db, { branchId: branch2.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch2.id, count: 10 })
    await seedCounter(db, branch1.id, 'INVOICE')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch1.id, role: 'staff' },
    })

    const result = await createTransaction({
      branchId: branch1.id,
      items: [{ productId: product.id, qty: 1, unitPrice: 500 }],
      paymentMode: 'cash',
      customerId: null,
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/product not found|branch/i)
  })
})

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe('createTransaction — authorization', () => {
  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const result = await createTransaction({
      branchId: 'any-branch',
      items: [],
      paymentMode: 'cash',
      customerId: null,
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized|not authenticated/i)
  })

  it('rejects when user branch does not match transaction branch', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: 'different-branch', role: 'staff' },
    })

    const result = await createTransaction({
      branchId: branch.id,
      items: [],
      paymentMode: 'cash',
      customerId: null,
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized|branch/i)
  })
})

// ---------------------------------------------------------------------------
// Sequential invoice counter concurrency
// ---------------------------------------------------------------------------

describe('createTransaction — invoice numbering', () => {
  it('generates unique invoice numbers under concurrent load', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 100 })
    await seedCounter(db, branch.id, 'INV')

    // Simulate 15 concurrent checkouts from the same branch
    const requests = Array.from({ length: 15 }, () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
      })
      return createTransaction({
        branchId: branch.id,
        items: [{ productId: product.id, qty: 1, unitPrice: 100 }],
        paymentMode: 'cash',
        customerId: null,
      })
    })

    const results = await Promise.all(requests)
    const successful = results.filter((r) => r.success)
    const invoiceNumbers = successful.map((r) => r.success ? (r.transaction as Record<string, unknown>).invoiceNumber : null)
    const unique = new Set(invoiceNumbers)

    // All 15 should have succeeded with unique invoice numbers
    expect(successful).toHaveLength(15)
    expect(unique.size).toBe(15)
  })

  it('counter increments correctly after successful transaction', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 50 })
    await seedCounter(db, branch.id, 'INV', 5)  // start at 5

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    const result = await createTransaction({
      branchId: branch.id,
      items: [{ productId: product.id, qty: 1, unitPrice: 100 }],
      paymentMode: 'cash',
      customerId: null,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    // Invoice number should reflect counter value 6 (5 + 1)
    expect(result.transaction.invoiceNumber).toMatch(/6$/)
  })
})

// ---------------------------------------------------------------------------
// Void transaction
// ---------------------------------------------------------------------------

describe('voidTransaction', () => {
  it('marks transaction as voided and restores stock', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 10 })
    await seedCounter(db, branch.id, 'INV')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'manager' },
    })

    const created = await createTransaction({
      branchId: branch.id,
      items: [{ productId: product.id, qty: 3, unitPrice: 500 }],
      paymentMode: 'cash',
      customerId: null,
    })
    expect(created.success).toBe(true)
    if (!created.success) return

    const voided = await voidTransaction({
      transactionId: String(created.transaction.id),
      reason: 'Customer changed mind',
    })

    if (!voided.success) {
      console.log('VOID TX ERROR:', voided.error)
    }

    expect(voided.success).toBe(true)

    // Stock should be restored
    const restoredUnits = await db.select().from(schema.inventory).where(
      and(
        eq(schema.inventory.product_id, product.id),
        eq(schema.inventory.branch_id, branch.id),
        eq(schema.inventory.status, 'Available'),
      )
    )
    expect(restoredUnits.length).toBe(10)

    // Transaction should be marked voided
    const tx = await getTransactionById(String(created.transaction.id))
    expect(tx?.status).toBe('voided')
  })

  it('rejects void by staff (requires manager role)', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id })
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 5 })
    await seedCounter(db, branch.id, 'INV')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })
    const created = await createTransaction({
      branchId: branch.id,
      items: [{ productId: product.id, qty: 1, unitPrice: 500 }],
      paymentMode: 'cash',
      customerId: null,
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000002', branchId: branch.id, role: 'staff' }, // staff, not manager
    })
    expect(created.success).toBe(true)
    if (!created.success) return
    const voided = await voidTransaction({
      transactionId: String(created.transaction.id),
      reason: 'Test',
    })

    if (!voided.success) {
      console.log('VOID ERROR:', voided.error)
    }

    expect(voided.success).toBe(false)
    expect(voided.error).toMatch(/permission|role|manager/i)
  })
})

// ---------------------------------------------------------------------------
// POS Discount Approval (verifyManagerPin)
// ---------------------------------------------------------------------------

describe('validateDiscount — POS Manager PIN verification', () => {
  it('matches manager PIN case-insensitively for capitalized roles', async () => {
    const branch = await seedBranch(db)
    const product = await seedProduct(db, { branchId: branch.id, price: 1000, maxDiscountPct: 10 })
    
    // Create a manager user and profile with a capitalized role
    const userId = '00000000-0000-0000-0000-000000000009'
    await db.insert(schema.users).values({ 
      id: userId, 
      email: 'manager@test.com', 
      password_hash: 'hash' 
    })

    const [manager] = await db.insert(schema.profiles).values({
      id: '00000000-0000-0000-0000-000000000009',
      full_name: 'Test Manager',
      email: 'manager@test.com',
      role: 'Admin/Owner', // Capitalized role
      pos_pin: '9449',
      created_at: new Date()
    }).returning()

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '00000000-0000-0000-0000-000000000001', branchId: branch.id, role: 'staff' },
    })

    // Request a 20% discount (exceeds 10% auto-approval limit)
    const result = await validateDiscount({
      productId: product.id,
      discountPct: 20,
      managerPin: '9449',
    })

    expect(result.valid).toBe(true)
    expect(result.needsApproval).toBe(false)
    expect(result.approvedBy).toBe(manager.id)
  })
})
