/**
 * Call setupTestDb() once per test file in beforeAll.
 * Requires the test database schema to already exist —
 * run `drizzle-kit push` against TEST_DATABASE_URL before
 * running integration tests.
 * cleanupTestDb() truncates all tables between tests.
 * teardownTestDb() closes the connection pool.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'
import { sql } from 'drizzle-orm'

export type TestDb = ReturnType<typeof drizzle<typeof schema>>

let pool: Pool | null = null

export async function setupTestDb(): Promise<TestDb> {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL is not set — integration tests require a real DB')

  pool = new Pool({ connectionString: url, max: 5 })
  const db = drizzle(pool, { schema })

  const proceduresSql = readFileSync(join(process.cwd(), 'src/test/procedures.sql'), 'utf-8')
  await db.execute(sql.raw(proceduresSql))

  return db
}

export async function cleanupTestDb(db: TestDb): Promise<void> {
  // Truncate in dependency order (children first) to avoid FK violations.
  // RESTART IDENTITY resets serial sequences so IDs are predictable across tests.
  await db.execute(sql`
    TRUNCATE TABLE
      attendance_corrections,
      attendance_records,
      grn_items,
      grn_receipts,
      discrepancies,
      po_items,
      stock_transfer_items,
      stock_transfers,
      stock_requests,
      inventory_transactions,
      inventory,
      serial_numbers,
      sequential_counters,
      purchase_orders,
      vendor_bills,
      sales_invoices,
      invoice_items,
      customers,
      vendors,
      products,
      categories,
      brands,
      hsn_codes,
      user_permissions,
      user_branch_access,
      profiles,
      users,
      branches
    RESTART IDENTITY CASCADE
  `)
}

export async function teardownTestDb(): Promise<void> {
  await pool?.end()
  pool = null
}

// ---------------------------------------------------------------------------
// Seed helpers — create minimal valid records for tests
// ---------------------------------------------------------------------------

type SeedBranchOpts = {
  name?: string
  gstin?: string
  state?: string
  stateCode?: string
}

export async function seedBranch(db: TestDb, opts: SeedBranchOpts = {}) {
  const stateCode = opts.stateCode ?? '27'
  const branch = {
    name: opts.name ?? 'Test Branch Mumbai',
    gstin: opts.gstin ?? `${stateCode}AAAAA0000A1Z5`,
    state: opts.state ?? 'Maharashtra',
    state_code: stateCode,
    full_address: '123 Test Street, Mumbai',
    phone: '9999999999',
    type: 'Store',
  }
  const [inserted] = await db.insert(schema.branches).values(branch).returning()
  return inserted
}

type SeedUserOpts = {
  branchId: string
  role?: 'admin' | 'manager' | 'staff'
  permissions?: string[]
}

export async function seedUser(db: TestDb, opts: SeedUserOpts) {
  const userData = {
    email: `test-${Math.random().toString(36).slice(2)}@ops360.com`,
    password_hash: '$2b$10$test', // bcrypt hash — not used in tests
    role: opts.role ?? 'staff',
  }
  const [user] = await db.insert(schema.users).values(userData).returning()

  if (opts.permissions?.length) {
    await db.insert(schema.user_permissions).values(
      opts.permissions.map((module) => ({
        user_id: user.id,
        module,
        enabled: true,
      }))
    )
  }

  return user
}

type SeedHsnOpts = {
  code?: string
  cgstRate?: number
  sgstRate?: number
  igstRate?: number
}

export async function seedHsn(db: TestDb, opts: SeedHsnOpts = {}) {
  const hsn = {
    hsn_code: opts.code ?? `8471${Math.floor(Math.random() * 10000)}`,
    description: 'Electronic goods',
    cgst_rate: String(opts.cgstRate ?? 9),
    sgst_rate: String(opts.sgstRate ?? 9),
    igst_rate: String(opts.igstRate ?? 18),
    gst_rate: String((opts.cgstRate ?? 9) + (opts.sgstRate ?? 9)),
  }
  const [inserted] = await db.insert(schema.hsn_codes).values(hsn).returning()
  return inserted
}

type SeedProductOpts = {
  branchId?: string
  price?: number
  hsnId?: string
  serialTracked?: boolean
  sku?: string
  cgstRate?: number
  sgstRate?: number
}

export async function seedProduct(db: TestDb, opts: SeedProductOpts = {}) {
  if (!opts.branchId) await seedBranch(db)

  // If a specific HSN record id is provided, look it up; otherwise create a fresh one
  let hsn: typeof schema.hsn_codes.$inferSelect
  if (opts.hsnId) {
    const [found] = await db
      .select()
      .from(schema.hsn_codes)
      .where(sql`${schema.hsn_codes.id} = ${opts.hsnId}`)
      .limit(1)
    if (!found) throw new Error(`seedProduct: hsn_codes row not found for id ${opts.hsnId}`)
    hsn = found
  } else {
    hsn = await seedHsn(db)
  }

  const productCode = opts.sku ?? `SKU-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  const productData = {
    product_code: productCode,
    model_name: 'Test Product',
    hsn_code: hsn.hsn_code,
    base_price: String(opts.price ?? 1000),
    min_stock_level: 2,
    tracking_type: opts.serialTracked ? 'Serial' : 'Batch',
    is_archived: false,
    gst_rate: String((opts.cgstRate ?? 9) + (opts.sgstRate ?? 9)),
  }
  const [product] = await db.insert(schema.products).values(productData).returning()
  return { ...product, hsn, sku: productCode }
}

type SeedVendorOpts = {
  gstin?: string
  state?: string
  stateCode?: string
}

export async function seedVendor(db: TestDb, opts: SeedVendorOpts = {}) {
  const stateCode = opts.stateCode ?? '29'
  const vendor = {
    name: 'Test Supplier Pvt Ltd',
    gstin: opts.gstin ?? `${stateCode}BBBBB0000B1Z3`,
    state: opts.state ?? 'Karnataka',
    state_code: stateCode,
    phone: '9888888888',
    email: 'vendor@test.com',
    status: 'Active',
  }
  const [inserted] = await db.insert(schema.vendors).values(vendor).returning()
  return inserted
}

export async function seedInventoryUnits(
  db: TestDb,
  opts: { productId: string; branchId: string; count: number; status?: string },
) {
  if (opts.count === 0) return []
  const units = Array.from({ length: opts.count }, () => ({
    id: crypto.randomUUID(),
    product_id: opts.productId,
    branch_id: opts.branchId,
    serial_number: null,
    status: opts.status ?? 'Available',
  }))
  await db.insert(schema.inventory).values(units)
  return units
}

export async function seedCounter(db: TestDb, branchId: string, type: string, value = 0) {
  await db.insert(schema.sequential_counters).values({
    prefix: type,
    year: new Date().getFullYear(),
    current_value: value,
  }).onConflictDoNothing()
}

export async function seedAttendanceRecord(
  db: TestDb,
  opts: {
    userId: string
    branchId: string
    date: string
    clockIn: Date
    clockOut?: Date
  }
) {
  const durationMinutes = opts.clockOut
    ? Math.round((opts.clockOut.getTime() - opts.clockIn.getTime()) / 60000)
    : null

  const [record] = await db
    .insert(schema.attendance_records)
    .values({
      user_id: opts.userId,
      branch_id: opts.branchId,
      date: opts.date,
      clock_in: opts.clockIn,
      clock_out: opts.clockOut ?? null,
      duration_minutes: durationMinutes,
    })
    .returning()

  return record
}
