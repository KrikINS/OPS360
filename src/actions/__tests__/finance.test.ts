import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import {
  setupTestDb, cleanupTestDb, teardownTestDb,
  seedBranch, seedCoa,
} from '@/test/db'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  createJournalEntry,
  postGRNJournal,
  postSalesJournal,
  createExpenseRecord,
  approveExpense,
  rejectExpense,
  getProfitAndLoss,
  getFinancialYear,
  settleVendorPayment,
} from '@/actions/finance'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any
beforeAll(async () => { db = await setupTestDb() })
afterEach(async () => { await cleanupTestDb(db) })
afterAll(async () => { await teardownTestDb() })

const ADMIN_ID   = '00000000-0000-0000-0000-000000000001'
const STAFF_ID   = '00000000-0000-0000-0000-000000000002'
const MANAGER_ID = '00000000-0000-0000-0000-000000000003'



describe('getFinancialYear', () => {
  it('April 2025 → 2025-26', async () => {
    expect(await getFinancialYear(new Date('2025-04-01'))).toBe('2025-26')
  })
  it('March 2026 → 2025-26', async () => {
    expect(await getFinancialYear(new Date('2026-03-31'))).toBe('2025-26')
  })
  it('January 2026 → 2025-26', async () => {
    expect(await getFinancialYear(new Date('2026-01-15'))).toBe('2025-26')
  })
  it('April 2026 → 2026-27', async () => {
    expect(await getFinancialYear(new Date('2026-04-01'))).toBe('2026-27')
  })
})

describe('createJournalEntry', () => {
  it('creates a balanced journal entry', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    const entry = await createJournalEntry({
      description: 'Test entry',
      referenceSource: 'MANUAL',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      lines: [
        { accountCode: '1040', debit: 1000 },
        { accountCode: '2010', credit: 1000 },
      ],
    })

    expect(entry.id).toBeDefined()
    expect(entry.status).toBe('posted')

    const lines = await db
      .select()
      .from(schema.journal_lines)
      .where(eq(schema.journal_lines.journal_entry_id, entry.id))

    expect(lines).toHaveLength(2)
    const totalDebit  = lines.reduce((s: number, l: typeof lines[0]) => s + Number(l.debit),  0)
    const totalCredit = lines.reduce((s: number, l: typeof lines[0]) => s + Number(l.credit), 0)
    expect(totalDebit).toBe(totalCredit)
    expect(totalDebit).toBe(1000)
  })

  it('throws on unbalanced entry', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    await expect(
      createJournalEntry({
        description: 'Unbalanced',
        referenceSource: 'MANUAL',
        branchId: branch.id,
        createdBy: ADMIN_ID,
        lines: [
          { accountCode: '1040', debit: 1000 },
          { accountCode: '2010', credit: 500 },
        ],
      })
    ).rejects.toThrow('unbalanced')
  })

  it('stores the correct financial year', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    const entry = await createJournalEntry({
      date: new Date('2025-04-01'),
      description: 'FY test',
      referenceSource: 'MANUAL',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      lines: [
        { accountCode: '1040', debit: 100 },
        { accountCode: '2010', credit: 100 },
      ],
    })
    expect(entry.financial_year).toBe('2025-26')
  })
})

describe('postGRNJournal', () => {
  it('creates correct GRN journal lines with balanced entry', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    await postGRNJournal({
      grnId: '00000000-0000-0000-0000-000000000099',
      poId:  '00000000-0000-0000-0000-000000000098',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      totalLandedCost: 50000,
      totalCGST: 4500,
      totalSGST: 4500,
      totalIGST: 0,
    })

    const entries = await db
      .select()
      .from(schema.journal_entries)
      .where(eq(schema.journal_entries.reference_source, 'GRN'))

    expect(entries).toHaveLength(1)
    expect(entries[0].auto_generated).toBe(true)

    const lines = await db
      .select()
      .from(schema.journal_lines)
      .where(eq(schema.journal_lines.journal_entry_id, entries[0].id))

    const debitTotal  = lines.reduce((s: number, l: typeof lines[0]) => s + Number(l.debit),  0)
    const creditTotal = lines.reduce((s: number, l: typeof lines[0]) => s + Number(l.credit), 0)
    expect(debitTotal).toBe(59000)
    expect(creditTotal).toBe(59000)
    expect(debitTotal).toBe(creditTotal)
  })
})

describe('postSalesJournal', () => {
  it('creates balanced sales journal with CGST + SGST split', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    await postSalesJournal({
      invoiceId: '00000000-0000-0000-0000-000000000097',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      saleTotal: 11800,
      subtotal: 10000,
      cgst: 900,
      sgst: 900,
      igst: 0,
      cogs: 0,
    })

    const entries = await db
      .select()
      .from(schema.journal_entries)
      .where(eq(schema.journal_entries.reference_source, 'SALES'))

    expect(entries).toHaveLength(1)

    const lines = await db
      .select()
      .from(schema.journal_lines)
      .where(eq(schema.journal_lines.journal_entry_id, entries[0].id))

    const debitTotal  = lines.reduce((s: number, l: typeof lines[0]) => s + Number(l.debit),  0)
    const creditTotal = lines.reduce((s: number, l: typeof lines[0]) => s + Number(l.credit), 0)
    expect(debitTotal).toBe(creditTotal)
    expect(debitTotal).toBe(11800)
  })
})

describe('createExpenseRecord + approveExpense', () => {
  it('creates pending expense and posts journal on approval', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: branch.id },
    })
    const result = await createExpenseRecord({
      amount: 5000,
      expenseAccount: '5030',
      description: 'Electricity bill',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.record.status).toBe('pending')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, role: 'manager', branchId: branch.id },
    })
    const approval = await approveExpense({ expenseId: result.record.id })

    expect(approval.success).toBe(true)

    const entries = await db
      .select()
      .from(schema.journal_entries)
      .where(eq(schema.journal_entries.reference_source, 'EXPENSE'))

    expect(entries).toHaveLength(1)
    expect(entries[0].auto_generated).toBe(false)
  })

  it('rejects approval by staff role', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: branch.id },
    })
    const result = await createExpenseRecord({
      amount: 1000,
      expenseAccount: '5030',
      description: 'Test',
    })
    expect(result.success).toBe(true)
    if (!result.success) return

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: branch.id },
    })
    const approval = await approveExpense({ expenseId: result.record.id })

    expect(approval.success).toBe(false)
    expect(approval.error).toMatch(/manager/i)
  })

  it('blocks double approval', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: branch.id },
    })
    const result = await createExpenseRecord({
      amount: 1000,
      expenseAccount: '5030',
      description: 'Test double',
    })
    expect(result.success).toBe(true)
    if (!result.success) return

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, role: 'manager', branchId: branch.id },
    })
    await approveExpense({ expenseId: result.record.id })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, role: 'manager', branchId: branch.id },
    })
    const second = await approveExpense({ expenseId: result.record.id })

    expect(second.success).toBe(false)
    expect(second.error).toMatch(/cannot approve/i)
  })

  it('rejectExpense blocks non-manager', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: branch.id },
    })
    const result = await createExpenseRecord({
      amount: 500,
      expenseAccount: '5030',
      description: 'Test reject',
    })
    expect(result.success).toBe(true)
    if (!result.success) return

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: branch.id },
    })
    const rejection = await rejectExpense({ expenseId: result.record.id })

    expect(rejection.success).toBe(false)
    expect(rejection.error).toMatch(/manager/i)
  })
})

describe('getProfitAndLoss', () => {
  it('returns correct net profit after posting sales', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    await postSalesJournal({
      invoiceId: '00000000-0000-0000-0000-000000000096',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      saleTotal: 10000,
      subtotal: 10000,
      cgst: 0, sgst: 0, igst: 0,
      cogs: 0,
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    const result = await getProfitAndLoss({
      branchId: branch.id,
      fromDate: '2020-01-01',
      toDate:   '2030-12-31',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.totalRevenue).toBe(10000)
    expect(result.netProfit).toBeGreaterThan(0)
  })
})

describe('Accounts Payable Settlement', () => {
  it('posts correct journal and saves payment record', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    // Insert dummy vendor & PO
    const [vendor] = await db.insert(schema.vendors).values({
      name: 'Test Vendor',
      status: 'Active'
    }).returning()

    const [po] = await db.insert(schema.purchase_orders).values({
      po_number: 'PO-TEST-100',
      branch_id: branch.id,
      vendor_id: vendor.id,
      status: 'received',
      total_amount: '5000',
      created_by: ADMIN_ID
    }).returning()

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })

    const res = await settleVendorPayment({
      poId: po.id,
      amount: 5000,
      paymentMethod: 'bank',
      referenceNumber: 'UTR123',
    })

    expect(res.success).toBe(true)
    if (!res.success) return

    expect(res.payment).toBeDefined()
    expect(Number(res.payment.amount)).toBe(5000)

    // Verify Journal Entry
    const lines = await db
      .select({
        debit: schema.journal_lines.debit,
        credit: schema.journal_lines.credit,
        account_code: schema.accounts.code
      })
      .from(schema.journal_lines)
      .innerJoin(schema.accounts, eq(schema.journal_lines.account_id, schema.accounts.id))
      .where(eq(schema.journal_lines.journal_entry_id, res.entry.id))

    expect(lines).toHaveLength(2)
    const dr = lines.find((l: typeof lines[0]) => Number(l.debit) > 0)
    const cr = lines.find((l: typeof lines[0]) => Number(l.credit) > 0)

    expect(dr.account_code).toBe('2010') // AP debited
    expect(cr.account_code).toBe('1020') // Bank credited
    expect(Number(dr.debit)).toBe(5000)
    expect(Number(cr.credit)).toBe(5000)
  })

  it('rejects payment if PO status is invalid', async () => {
    const branch = await seedBranch(db)
    
    const [vendor] = await db.insert(schema.vendors).values({
      name: 'Test Vendor', status: 'Active'
    }).returning()

    const [po] = await db.insert(schema.purchase_orders).values({
      po_number: 'PO-TEST-101',
      branch_id: branch.id,
      vendor_id: vendor.id,
      status: 'draft', // Cannot pay draft
      total_amount: '5000',
      created_by: ADMIN_ID
    }).returning()

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })

    const res = await settleVendorPayment({
      poId: po.id,
      amount: 5000,
      paymentMethod: 'bank',
    })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/status/)
  })

  it('restricts staff from settling payments', async () => {
    const res = await settleVendorPayment({
      poId: '123', amount: 100, paymentMethod: 'cash'
    })
    expect(res.success).toBe(false) // No session

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: null },
    })
    const res2 = await settleVendorPayment({
      poId: '123', amount: 100, paymentMethod: 'cash'
    })
    expect(res2.success).toBe(false)
    expect(res2.error).toMatch(/manager/i)
  })
})
