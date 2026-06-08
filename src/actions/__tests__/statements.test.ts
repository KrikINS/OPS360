import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { getServerSession } from 'next-auth'
import {
  setupTestDb, cleanupTestDb, teardownTestDb,
  seedBranch, seedCoa,
} from '@/test/db'
import {
  createJournalEntry,
  postSalesJournal,
  getProfitAndLoss,
  getBalanceSheet,
} from '@/actions/finance'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any
beforeAll(async () => { db = await setupTestDb() })
afterEach(async () => { await cleanupTestDb(db) })
afterAll(async () => { await teardownTestDb() })

const ADMIN_ID = '00000000-0000-0000-0000-000000000001'

// Helper: mock admin session for read operations
function mockAdminSession() {
  vi.mocked(getServerSession).mockResolvedValueOnce({
    user: { id: ADMIN_ID, role: 'admin', branchId: null },
  })
}

// ── P&L Tests ───────────────────────────────────────

describe('getProfitAndLoss — sign convention', () => {
  it('revenue is positive, expenses are negative, netProfit = revenue + expenses', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    // Post a sale: DR 1010 Cash 5000, CR 4000 Revenue 5000
    await postSalesJournal({
      invoiceId: 'inv-pl-001',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      saleTotal: 5000,
      subtotal: 5000,
      cgst: 0, sgst: 0, igst: 0,
      cogs: 0,
    })

    // Post an expense: DR 5030 Utilities 2000, CR 1010 Cash 2000
    await createJournalEntry({
      description: 'Utility bill payment',
      referenceSource: 'EXPENSE',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      lines: [
        { accountCode: '5030', debit: 2000, description: 'Electric bill' },
        { accountCode: '1010', credit: 2000, description: 'Cash payment' },
      ],
    })

    mockAdminSession()
    const result = await getProfitAndLoss({
      branchId: branch.id,
      fromDate: '2020-01-01',
      toDate: '2030-12-31',
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    // Revenue should be positive (credit - debit for Revenue type)
    expect(result.totalRevenue).toBe(5000)

    // Expenses should be negative (credit - debit for Expense type)
    expect(result.totalExpenses).toBe(-2000)

    // Net Profit = revenue + expenses = 5000 + (-2000) = 3000
    expect(result.netProfit).toBe(3000)

    // Individual accounts
    const rev4000 = result.revenue.find(r => r.code === '4000')
    expect(rev4000).toBeDefined()
    expect(Number(rev4000!.net)).toBe(5000)

    const exp5030 = result.expenses.find(e => e.code === '5030')
    expect(exp5030).toBeDefined()
    expect(Number(exp5030!.net)).toBe(-2000)
  })

  it('returns zero when no journal entries exist', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    mockAdminSession()
    const result = await getProfitAndLoss({
      branchId: branch.id,
      fromDate: '2020-01-01',
      toDate: '2030-12-31',
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.totalRevenue).toBe(0)
    expect(result.totalExpenses).toBe(0)
    expect(result.netProfit).toBe(0)
  })

  it('loss scenario: expenses exceed revenue', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    // Small sale
    await postSalesJournal({
      invoiceId: 'inv-pl-loss',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      saleTotal: 1000,
      subtotal: 1000,
      cgst: 0, sgst: 0, igst: 0,
      cogs: 0,
    })

    // Large expense
    await createJournalEntry({
      description: 'Big expense',
      referenceSource: 'EXPENSE',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      lines: [
        { accountCode: '5030', debit: 5000 },
        { accountCode: '1010', credit: 5000 },
      ],
    })

    mockAdminSession()
    const result = await getProfitAndLoss({
      branchId: branch.id,
      fromDate: '2020-01-01',
      toDate: '2030-12-31',
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.totalRevenue).toBe(1000)
    expect(result.totalExpenses).toBe(-5000)
    expect(result.netProfit).toBe(-4000) // loss
  })
})

// ── Balance Sheet Tests ─────────────────────────────

describe('getBalanceSheet — accounting equation', () => {
  it('Assets === |Liabilities| + |Equity| after sale + COGS', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    // 1. Opening stock: DR 1040 Inventory 10000, CR 3010 Retained Earnings 10000
    await createJournalEntry({
      description: 'Opening inventory',
      referenceSource: 'OPENING_BALANCE',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      lines: [
        { accountCode: '1040', debit: 10000 },
        { accountCode: '3010', credit: 10000 },
      ],
    })

    // 2. Sale: DR 1010 Cash 12000, CR 4000 Revenue 12000
    //    COGS: DR 5010 COGS 8000, CR 1040 Inventory 8000
    await postSalesJournal({
      invoiceId: 'inv-bs-001',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      saleTotal: 12000,
      subtotal: 12000,
      cgst: 0, sgst: 0, igst: 0,
      cogs: 8000,
    })

    mockAdminSession()
    const bs = await getBalanceSheet({
      branchId: branch.id,
      asOfDate: '2030-12-31',
    })

    expect(bs.success).toBe(true)
    if (!bs.success) return

    // Calculate totals
    const totalAssets = bs.assets.reduce(
      (s, a) => s + Number(a.balance), 0
    )
    const totalLiabilities = Math.abs(
      bs.liabilities.reduce((s, l) => s + Number(l.balance), 0)
    )
    const totalEquity = Math.abs(
      bs.equity.reduce((s, e) => s + Number(e.balance), 0)
    )

    // Strict accounting equation: A = L + E
    expect(totalAssets).toBeCloseTo(totalLiabilities + totalEquity, 2)

    // Net profit should be injected into equity
    expect(bs.netProfit).toBeDefined()
    // Net Profit = Revenue (12000) - COGS (8000) = 4000
    expect(bs.netProfit).toBe(4000)

    // 3010 should include the net profit
    const retainedEarnings = bs.equity.find(e => e.code === '3010')
    expect(retainedEarnings).toBeDefined()
    // Original 3010 balance: -10000 (credit from opening), minus netProfit 4000 = -14000
    expect(Number(retainedEarnings!.balance)).toBeCloseTo(-14000, 2)

    // Verify specific account balances:
    // Cash: +12000 (sale)
    const cash = bs.assets.find(a => a.code === '1010')
    expect(Number(cash?.balance)).toBe(12000)

    // Inventory: +10000 (opening) - 8000 (COGS) = +2000
    const inventory = bs.assets.find(a => a.code === '1040')
    expect(Number(inventory?.balance)).toBe(2000)
  })

  it('includes Tax accounts sorted by balance direction', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    // Sale with GST: DR 1010 Cash 11800, CR 4000 Revenue 10000,
    //                CR 2020 CGST Payable 900, CR 2030 SGST Payable 900
    await postSalesJournal({
      invoiceId: 'inv-bs-gst',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      saleTotal: 11800,
      subtotal: 10000,
      cgst: 900,
      sgst: 900,
      igst: 0,
      cogs: 0,
    })

    mockAdminSession()
    const bs = await getBalanceSheet({
      branchId: branch.id,
      asOfDate: '2030-12-31',
    })

    expect(bs.success).toBe(true)
    if (!bs.success) return

    // GST Payable (credit-heavy) should appear in liabilities
    const gstPayable = bs.liabilities.filter(l =>
      l.code === '2020' || l.code === '2030'
    )
    expect(gstPayable.length).toBe(2)

    // Verify equation still balances
    const totalAssets = bs.assets.reduce(
      (s, a) => s + Number(a.balance), 0
    )
    const totalLiabEquity = Math.abs(
      bs.liabilities.reduce((s, l) => s + Number(l.balance), 0)
    ) + Math.abs(
      bs.equity.reduce((s, e) => s + Number(e.balance), 0)
    )

    expect(totalAssets).toBeCloseTo(totalLiabEquity, 2)
  })

  it('equation holds when there are no transactions', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    mockAdminSession()
    const bs = await getBalanceSheet({
      branchId: branch.id,
      asOfDate: '2030-12-31',
    })

    expect(bs.success).toBe(true)
    if (!bs.success) return

    const totalAssets = bs.assets.reduce(
      (s, a) => s + Number(a.balance), 0
    )
    const totalLiabEquity = Math.abs(
      bs.liabilities.reduce((s, l) => s + Number(l.balance), 0)
    ) + Math.abs(
      bs.equity.reduce((s, e) => s + Number(e.balance), 0)
    )

    // Both should be 0
    expect(totalAssets).toBe(0)
    expect(totalLiabEquity).toBe(0)
  })

  it('vendor payment reduces cash and AP, equation still holds', async () => {
    const branch = await seedBranch(db)
    await seedCoa(db)

    // Opening cash: DR 1010 Cash 50000, CR 3000 Owner Capital 50000
    await createJournalEntry({
      description: 'Owner capital injection',
      referenceSource: 'OPENING_BALANCE',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      lines: [
        { accountCode: '1010', debit: 50000 },
        { accountCode: '3000', credit: 50000 },
      ],
    })

    // Record AP: DR 1040 Inventory 20000, CR 2010 AP 20000
    await createJournalEntry({
      description: 'GRN inventory purchase',
      referenceSource: 'GRN',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      lines: [
        { accountCode: '1040', debit: 20000 },
        { accountCode: '2010', credit: 20000 },
      ],
    })

    // Pay vendor: DR 2010 AP 20000, CR 1010 Cash 20000
    await createJournalEntry({
      description: 'Vendor payment',
      referenceSource: 'PAYMENT',
      branchId: branch.id,
      createdBy: ADMIN_ID,
      lines: [
        { accountCode: '2010', debit: 20000 },
        { accountCode: '1010', credit: 20000 },
      ],
    })

    mockAdminSession()
    const bs = await getBalanceSheet({
      branchId: branch.id,
      asOfDate: '2030-12-31',
    })

    expect(bs.success).toBe(true)
    if (!bs.success) return

    // Cash: 50000 - 20000 = 30000
    const cash = bs.assets.find(a => a.code === '1010')
    expect(Number(cash?.balance)).toBe(30000)

    // Inventory: 20000
    const inv = bs.assets.find(a => a.code === '1040')
    expect(Number(inv?.balance)).toBe(20000)

    // AP: -20000 + 20000 = 0 (fully paid)
    const ap = bs.liabilities.find(l => l.code === '2010')
    expect(Number(ap?.balance ?? 0)).toBeCloseTo(0, 2)

    // Equation
    const totalAssets = bs.assets.reduce(
      (s, a) => s + Number(a.balance), 0
    )
    const totalLiabEquity = Math.abs(
      bs.liabilities.reduce((s, l) => s + Number(l.balance), 0)
    ) + Math.abs(
      bs.equity.reduce((s, e) => s + Number(e.balance), 0)
    )

    // Assets = 30000 + 20000 = 50000
    // L+E = 0 + 50000 (Owner Capital) = 50000
    expect(totalAssets).toBeCloseTo(totalLiabEquity, 2)
  })
})
