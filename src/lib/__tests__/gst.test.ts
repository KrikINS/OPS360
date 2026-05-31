/**
 * Unit tests for GST calculation logic.
 *
 * These are pure-function tests — no DB, no network.
 * They run in ~10ms total and should be part of every CI step.
 *
 * Assumes your GST utilities live in src/lib/gst.ts.
 * Adjust the import path if yours differ.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateLineItemGST,
  splitGST,
  calculateInvoiceTotals,
  formatGSTIN,
  validateGSTIN,
  roundToTwoDecimals,
} from '@/lib/gst'

// ---------------------------------------------------------------------------
// Basic GST calculation
// ---------------------------------------------------------------------------

describe('calculateLineItemGST', () => {
  it('calculates 18% GST on a clean amount', () => {
    const result = calculateLineItemGST({ baseAmount: 1000, gstRate: 18 })
    expect(result.gstAmount).toBe(180)
    expect(result.totalAmount).toBe(1180)
  })

  it('calculates 5% GST (pharma/food rate)', () => {
    const result = calculateLineItemGST({ baseAmount: 2000, gstRate: 5 })
    expect(result.gstAmount).toBe(100)
    expect(result.totalAmount).toBe(2100)
  })

  it('calculates 28% GST (luxury rate)', () => {
    const result = calculateLineItemGST({ baseAmount: 5000, gstRate: 28 })
    expect(result.gstAmount).toBe(1400)
    expect(result.totalAmount).toBe(6400)
  })

  it('handles 0% GST (exempt items)', () => {
    const result = calculateLineItemGST({ baseAmount: 500, gstRate: 0 })
    expect(result.gstAmount).toBe(0)
    expect(result.totalAmount).toBe(500)
  })

  it('rounds to exactly 2 decimal places — no floating point leakage', () => {
    // ₹333 @ 18% = 59.94 — not 59.940000000001
    const result = calculateLineItemGST({ baseAmount: 333, gstRate: 18 })
    expect(result.gstAmount).toBe(59.94)
    expect(result.totalAmount).toBe(392.94)
    // Ensure it's actually 2 dp, not a string like "59.94000000001"
    expect(result.gstAmount.toString()).toBe('59.94')
  })

  it('handles quantity multiplier', () => {
    const result = calculateLineItemGST({ baseAmount: 500, gstRate: 18, qty: 4 })
    expect(result.gstAmount).toBe(360)   // 4 × 500 × 0.18
    expect(result.totalAmount).toBe(2360)
  })

  it('handles discount before GST is applied', () => {
    // ₹1000 with 10% discount = ₹900 base, then 18% GST
    const result = calculateLineItemGST({ baseAmount: 1000, gstRate: 18, discountPct: 10 })
    expect(result.discountAmount).toBe(100)
    expect(result.taxableAmount).toBe(900)
    expect(result.gstAmount).toBe(162)
    expect(result.totalAmount).toBe(1062)
  })
})

// ---------------------------------------------------------------------------
// CGST / SGST / IGST split
// ---------------------------------------------------------------------------

describe('splitGST', () => {
  it('splits intra-state GST equally into CGST and SGST', () => {
    const result = splitGST({ gstAmount: 180, gstRate: 18, interstate: false })
    expect(result.cgst).toBe(90)
    expect(result.sgst).toBe(90)
    expect(result.igst).toBe(0)
    expect(result.cgstRate).toBe(9)
    expect(result.sgstRate).toBe(9)
    expect(result.igstRate).toBe(0)
  })

  it('uses IGST only for inter-state supply', () => {
    const result = splitGST({ gstAmount: 180, gstRate: 18, interstate: true })
    expect(result.igst).toBe(180)
    expect(result.cgst).toBe(0)
    expect(result.sgst).toBe(0)
    expect(result.igstRate).toBe(18)
  })

  it('handles odd GST amounts without losing paise — rounding goes to SGST', () => {
    // ₹901 @ 18% = 162.18 → CGST 81.09, SGST 81.09
    const result = splitGST({ gstAmount: 162.18, gstRate: 18, interstate: false })
    expect(result.cgst + result.sgst).toBe(162.18)
    expect(result.cgst).toBe(81.09)
    expect(result.sgst).toBe(81.09)
  })

  it('handles 5% split correctly (2.5 + 2.5)', () => {
    const result = splitGST({ gstAmount: 100, gstRate: 5, interstate: false })
    expect(result.cgst).toBe(50)
    expect(result.sgst).toBe(50)
    expect(result.cgstRate).toBe(2.5)
    expect(result.sgstRate).toBe(2.5)
  })
})

// ---------------------------------------------------------------------------
// Full invoice totals
// ---------------------------------------------------------------------------

describe('calculateInvoiceTotals', () => {
  it('sums multi-line invoice correctly', () => {
    const lines = [
      { baseAmount: 1000, gstRate: 18, qty: 2 },
      { baseAmount: 500,  gstRate: 5,  qty: 1 },
    ]
    const totals = calculateInvoiceTotals(lines, { interstate: false })

    expect(totals.subtotal).toBe(2500)           // (1000×2) + 500
    expect(totals.totalGST).toBe(385)            // (360) + (25)
    expect(totals.grandTotal).toBe(2885)
    expect(totals.cgst).toBe(192.5)              // half of 385
    expect(totals.sgst).toBe(192.5)
    expect(totals.igst).toBe(0)
  })

  it('produces a grand total that reconciles: subtotal + totalGST = grandTotal', () => {
    const lines = [
      { baseAmount: 333, gstRate: 18, qty: 3 },
      { baseAmount: 777, gstRate: 12, qty: 1 },
    ]
    const totals = calculateInvoiceTotals(lines, { interstate: false })
    expect(totals.subtotal + totals.totalGST).toBe(totals.grandTotal)
  })

  it('round-trips correctly for zero-GST lines', () => {
    const lines = [
      { baseAmount: 1000, gstRate: 0,  qty: 1 },
      { baseAmount: 500,  gstRate: 18, qty: 1 },
    ]
    const totals = calculateInvoiceTotals(lines, { interstate: false })
    expect(totals.subtotal).toBe(1500)
    expect(totals.totalGST).toBe(90)
    expect(totals.grandTotal).toBe(1590)
  })
})

// ---------------------------------------------------------------------------
// GSTIN validation
// ---------------------------------------------------------------------------

describe('validateGSTIN', () => {
  const validGSTINs = [
    '27AAAAA0000A1Z5',  // Maharashtra
    '29BBBBB0000B1Z3',  // Karnataka
    '07CCCCC0000C1Z1',  // Delhi
    '09DDDDD0000D1Z9',  // Uttar Pradesh
  ]

  const invalidGSTINs = [
    '',
    'INVALID',
    '27AAAAA0000A1Z',    // too short (14 chars)
    '27AAAAA0000A1Z55',  // too long (16 chars)
    '00AAAAA0000A1Z5',   // invalid state code (00)
    '99AAAAA0000A1Z5',   // invalid state code (99)
    '27aaaaa0000a1z5',   // lowercase
  ]

  validGSTINs.forEach((gstin) => {
    it(`accepts valid GSTIN: ${gstin}`, () => {
      expect(validateGSTIN(gstin)).toBe(true)
    })
  })

  invalidGSTINs.forEach((gstin) => {
    it(`rejects invalid GSTIN: "${gstin}"`, () => {
      expect(validateGSTIN(gstin)).toBe(false)
    })
  })
})

describe('formatGSTIN', () => {
  it('formats GSTIN with state code prefix label', () => {
    expect(formatGSTIN('27AAAAA0000A1Z5')).toBe('27 — AAAAA0000A1Z5')
  })
})

// ---------------------------------------------------------------------------
// Rounding utility
// ---------------------------------------------------------------------------

describe('roundToTwoDecimals', () => {
  it('handles classic floating point traps', () => {
    expect(roundToTwoDecimals(0.1 + 0.2)).toBe(0.3)
    expect(roundToTwoDecimals(7 * 1.1)).toBe(7.7)
    expect(roundToTwoDecimals(1.005)).toBe(1.01)  // banker's rounding edge case
  })

  it('does not add decimals to whole numbers', () => {
    expect(roundToTwoDecimals(100)).toBe(100)
  })

  it('returns exactly 2dp for clean decimals', () => {
    expect(roundToTwoDecimals(59.94)).toBe(59.94)
  })
})
