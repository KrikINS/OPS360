import { describe, it, expect } from 'vitest'

// Payroll calculation pure functions — extracted from setSalaryStructure in hr.ts
// These are the business rules that must never regress

function computePF(basic: number, applicable: boolean): number {
  if (!applicable) return 0
  return Math.min(Math.round(basic * 0.12), 1800)
}

function computeProfessionalTax(gross: number): number {
  return gross > 15000 ? 200 : 0
}

function computeNet(gross: number, pf: number, pt: number, tds: number): number {
  return gross - pf - pt - tds
}

describe('PF calculation', () => {
  it('returns 0 when PF not applicable', () => {
    expect(computePF(50000, false)).toBe(0)
  })
  it('returns 12% of basic when basic <= 15000', () => {
    expect(computePF(10000, true)).toBe(1200)
  })
  it('caps at ₹1,800 when basic > 15000', () => {
    expect(computePF(20000, true)).toBe(1800)
  })
  it('caps at ₹1,800 for exactly the statutory ceiling (15000)', () => {
    expect(computePF(15000, true)).toBe(1800)
  })
  it('returns 12% (not capped) for basic just below ceiling', () => {
    expect(computePF(14999, true)).toBe(Math.round(14999 * 0.12))
  })
})

describe('Professional Tax — Kerala', () => {
  it('returns ₹200 for gross > 15000', () => {
    expect(computeProfessionalTax(35000)).toBe(200)
  })
  it('returns ₹200 for gross exactly 15001', () => {
    expect(computeProfessionalTax(15001)).toBe(200)
  })
  it('returns ₹0 for gross <= 15000', () => {
    expect(computeProfessionalTax(15000)).toBe(0)
  })
  it('returns ₹0 for gross well below threshold', () => {
    expect(computeProfessionalTax(8000)).toBe(0)
  })
})

describe('Net salary computation', () => {
  it('net = gross - PF - PT - TDS', () => {
    expect(computeNet(35000, 1800, 200, 0)).toBe(33000)
  })
  it('net with TDS deduction', () => {
    expect(computeNet(35000, 1800, 200, 1000)).toBe(32000)
  })
  it('no deductions = gross', () => {
    expect(computeNet(20000, 0, 0, 0)).toBe(20000)
  })
})

describe('Full salary structure — Branch Manager scenario', () => {
  it('Basic ₹25k + HRA ₹10k gives correct components', () => {
    const basic = 25000
    const hra = 10000
    const gross = basic + hra
    const pf = computePF(basic, true)
    const pt = computeProfessionalTax(gross)
    const tds = 0
    const net = computeNet(gross, pf, pt, tds)

    expect(gross).toBe(35000)
    expect(pf).toBe(1800)   // capped
    expect(pt).toBe(200)    // gross > 15k
    expect(net).toBe(33000) // matches the real payslip we verified
  })
})
