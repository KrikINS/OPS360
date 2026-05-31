/**
 * Unit tests for landed cost allocation.
 *
 * Landed cost = freight + customs + insurance + handling spread across GRN lines.
 * The allocation must be penny-exact: sum(allocated) === total_cost in every case.
 *
 * Pure function tests — no DB needed.
 */

import { describe, it, expect } from 'vitest'
import {
  allocateLandedCost,
  calculateLandedUnitCost,
  type LandedCostInput,
  type LandedCostLine,
} from '@/lib/landed-cost'

const makeLines = (values: number[]): LandedCostLine[] =>
  values.map((value, i) => ({ id: `line-${i + 1}`, lineValue: value, qty: 1 }))

// ---------------------------------------------------------------------------
// Proportional allocation
// ---------------------------------------------------------------------------

describe('allocateLandedCost — proportional by line value', () => {
  it('splits freight 60/40 between two lines', () => {
    const lines = makeLines([600, 400])
    const result = allocateLandedCost(lines, { freight: 100 })

    expect(result['line-1'].freight).toBe(60)
    expect(result['line-2'].freight).toBe(40)
  })

  it('allocates equally when all lines have the same value', () => {
    const lines = makeLines([500, 500, 500])
    const result = allocateLandedCost(lines, { freight: 300 })

    expect(result['line-1'].freight).toBe(100)
    expect(result['line-2'].freight).toBe(100)
    expect(result['line-3'].freight).toBe(100)
  })

  it('gives 100% to the only line', () => {
    const lines = makeLines([1000])
    const result = allocateLandedCost(lines, { freight: 250 })
    expect(result['line-1'].freight).toBe(250)
  })
})

// ---------------------------------------------------------------------------
// Multi-component costs
// ---------------------------------------------------------------------------

describe('allocateLandedCost — multiple cost components', () => {
  it('allocates each component independently', () => {
    const lines = makeLines([700, 300])
    const costs: LandedCostInput = { freight: 100, customs: 200, insurance: 50 }
    const result = allocateLandedCost(lines, costs)

    expect(result['line-1'].freight).toBe(70)
    expect(result['line-1'].customs).toBe(140)
    expect(result['line-1'].insurance).toBe(35)

    expect(result['line-2'].freight).toBe(30)
    expect(result['line-2'].customs).toBe(60)
    expect(result['line-2'].insurance).toBe(15)
  })

  it('computes totalLandedCost as sum of all components per line', () => {
    const lines = makeLines([700, 300])
    const result = allocateLandedCost(lines, { freight: 100, customs: 200 })

    expect(result['line-1'].totalLandedCost).toBe(210)  // 70 + 140
    expect(result['line-2'].totalLandedCost).toBe(90)   // 30 + 60
  })
})

// ---------------------------------------------------------------------------
// Penny-exact reconciliation — the critical invariant
// ---------------------------------------------------------------------------

describe('allocateLandedCost — penny reconciliation', () => {
  it('sum of allocated freight equals total freight exactly', () => {
    const lines = makeLines([333, 667])
    const result = allocateLandedCost(lines, { freight: 200 })
    const allocated = Object.values(result).reduce((s, r) => s + r.freight, 0)
    expect(allocated).toBe(200)
  })

  it('handles prime-number totals without losing paise', () => {
    // ₹997 freight across 3 lines of equal value → 332.33 + 332.33 + 332.34
    const lines = makeLines([1000, 1000, 1000])
    const result = allocateLandedCost(lines, { freight: 997 })
    const allocated = Object.values(result).reduce((s, r) => s + r.freight, 0)
    expect(allocated).toBe(997)
  })

  it('handles 7-line allocation with odd remainder', () => {
    const lines = makeLines([100, 200, 150, 300, 250, 180, 120])
    const result = allocateLandedCost(lines, { freight: 1001 })
    const allocated = Object.values(result).reduce((s, r) => s + r.freight, 0)
    expect(allocated).toBe(1001)
  })

  it('reconciles all components when multiple cost types are present', () => {
    const lines = makeLines([400, 350, 250])
    const costs: LandedCostInput = { freight: 300, customs: 150, insurance: 75, handling: 25 }
    const result = allocateLandedCost(lines, costs)

    const totalFreight   = Object.values(result).reduce((s, r) => s + r.freight,   0)
    const totalCustoms   = Object.values(result).reduce((s, r) => s + r.customs,   0)
    const totalInsurance = Object.values(result).reduce((s, r) => s + r.insurance, 0)
    const totalHandling  = Object.values(result).reduce((s, r) => s + r.handling,  0)

    expect(totalFreight).toBe(300)
    expect(totalCustoms).toBe(150)
    expect(totalInsurance).toBe(75)
    expect(totalHandling).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// Landed unit cost
// ---------------------------------------------------------------------------

describe('calculateLandedUnitCost', () => {
  it('adds landed cost per unit to base cost price', () => {
    // 10 units, base cost ₹500 each, ₹100 freight for this line
    const result = calculateLandedUnitCost({ qty: 10, baseCostPrice: 500, totalLandedCost: 100 })
    expect(result.landedCostPerUnit).toBe(10)
    expect(result.totalUnitCost).toBe(510)
  })

  it('returns base cost when landed cost is zero', () => {
    const result = calculateLandedUnitCost({ qty: 5, baseCostPrice: 200, totalLandedCost: 0 })
    expect(result.landedCostPerUnit).toBe(0)
    expect(result.totalUnitCost).toBe(200)
  })

  it('rounds landed cost per unit to 2dp', () => {
    // ₹100 freight across 3 units = ₹33.33/unit
    const result = calculateLandedUnitCost({ qty: 3, baseCostPrice: 100, totalLandedCost: 100 })
    expect(result.landedCostPerUnit).toBe(33.33)
    expect(result.totalUnitCost).toBe(133.33)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('allocateLandedCost — edge cases', () => {
  it('returns zero allocation for all lines when total cost is zero', () => {
    const lines = makeLines([500, 500])
    const result = allocateLandedCost(lines, { freight: 0 })
    expect(result['line-1'].freight).toBe(0)
    expect(result['line-2'].freight).toBe(0)
  })

  it('throws when lines array is empty', () => {
    expect(() => allocateLandedCost([], { freight: 100 })).toThrow(/no lines/)
  })

  it('throws when total line value is zero (prevents divide-by-zero)', () => {
    const lines = makeLines([0, 0])
    expect(() => allocateLandedCost(lines, { freight: 100 })).toThrow(/zero.*value/i)
  })
})
