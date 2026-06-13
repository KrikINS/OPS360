import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDb, teardownTestDb, cleanupTestDb, type TestDb } from '@/test/db'
import { splitGST } from '@/lib/gst'

let db: TestDb

beforeAll(async () => { db = await setupTestDb() })
afterAll(async () => { await teardownTestDb() })
beforeEach(async () => { await cleanupTestDb(db) })

describe('GST: inclusive price extraction (the process_pos_sale formula)', () => {
  it('correctly extracts taxable base from 18% inclusive price', () => {
    // The POS processes MRP as tax-inclusive
    // Formula used in process_pos_sale:
    //   v_line_taxable = ROUND(v_line_inclusive / (1 + v_item_gst_rate/100.0), 2)
    //   v_line_tax = ROUND(v_line_inclusive - v_line_taxable, 2)
    const mrp = 8000
    const gstRate = 18
    const taxable = Math.round((mrp / (1 + gstRate / 100)) * 100) / 100
    const tax = Math.round((mrp - taxable) * 100) / 100

    expect(taxable).toBe(6779.66)
    expect(tax).toBe(1220.34)
    expect(taxable + tax).toBe(mrp)
  })

  it('correctly extracts taxable base from 28% inclusive price', () => {
    const mrp = 12800
    const gstRate = 28
    const taxable = Math.round((mrp / (1 + gstRate / 100)) * 100) / 100
    const tax = Math.round((mrp - taxable) * 100) / 100

    expect(taxable).toBe(10000)
    expect(tax).toBe(2800)
    expect(taxable + tax).toBe(mrp)
  })

  it('intra-state: CGST + SGST = total GST', () => {
    const mrp = 8000
    const gstRate = 18
    const taxable = Math.round((mrp / (1 + gstRate / 100)) * 100) / 100
    const totalGST = Math.round((mrp - taxable) * 100) / 100
    const { cgst, sgst, igst } = splitGST({ gstAmount: totalGST, gstRate, interstate: false })

    expect(cgst + sgst).toBeCloseTo(totalGST, 2)
    expect(igst).toBe(0)
    expect(cgst).toBe(610.17)
    expect(sgst).toBe(610.17)
  })

  it('inter-state: full amount goes to IGST', () => {
    const mrp = 8000
    const gstRate = 18
    const taxable = Math.round((mrp / (1 + gstRate / 100)) * 100) / 100
    const totalGST = Math.round((mrp - taxable) * 100) / 100
    const { cgst, sgst, igst } = splitGST({ gstAmount: totalGST, gstRate, interstate: true })

    expect(igst).toBeCloseTo(totalGST, 2)
    expect(cgst).toBe(0)
    expect(sgst).toBe(0)
  })

  it('journal balance: Cash DR = Revenue CR + GST CR (the accounting identity for a sale)', () => {
    const mrp = 8000
    const gstRate = 18
    const taxable = Math.round((mrp / (1 + gstRate / 100)) * 100) / 100
    const totalGST = mrp - taxable
    const { cgst, sgst } = splitGST({ gstAmount: totalGST, gstRate, interstate: false })

    const totalDebits  = mrp                        // Cash DR
    const totalCredits = taxable + cgst + sgst      // Revenue CR + CGST CR + SGST CR

    expect(totalDebits).toBeCloseTo(totalCredits, 2)
  })
})
