import { roundToTwoDecimals } from '@/lib/gst'

export type LandedCostLine = {
  id: string
  lineValue: number
  qty: number
}

export type LandedCostInput = {
  freight?: number
  customs?: number
  insurance?: number
  handling?: number
}

type LineAllocation = {
  freight: number
  customs: number
  insurance: number
  handling: number
  totalLandedCost: number
}

const COMPONENTS = ['freight', 'customs', 'insurance', 'handling'] as const

export function allocateLandedCost(
  lines: LandedCostLine[],
  costs: LandedCostInput,
): Record<string, LineAllocation> {
  if (lines.length === 0) throw new Error('no lines provided')

  const totalValue = lines.reduce((s, l) => s + l.lineValue, 0)
  if (totalValue === 0) throw new Error('zero total value — cannot allocate landed cost')

  const result: Record<string, LineAllocation> = {}
  for (const line of lines) {
    result[line.id] = { freight: 0, customs: 0, insurance: 0, handling: 0, totalLandedCost: 0 }
  }

  for (const component of COMPONENTS) {
    const total = costs[component] ?? 0
    if (total === 0) continue

    let remaining = total
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isLast = i === lines.length - 1
      const allocated = isLast
        ? roundToTwoDecimals(remaining)
        : roundToTwoDecimals(total * (line.lineValue / totalValue))
      result[line.id][component] = allocated
      remaining = roundToTwoDecimals(remaining - allocated)
    }
  }

  for (const line of lines) {
    const r = result[line.id]
    r.totalLandedCost = roundToTwoDecimals(
      r.freight + r.customs + r.insurance + r.handling,
    )
  }

  return result
}

export function calculateLandedUnitCost({
  qty,
  baseCostPrice,
  totalLandedCost,
}: {
  qty: number
  baseCostPrice: number
  totalLandedCost: number
}) {
  const landedCostPerUnit = roundToTwoDecimals(totalLandedCost / qty)
  const totalUnitCost = roundToTwoDecimals(baseCostPrice + landedCostPerUnit)
  return { landedCostPerUnit, totalUnitCost }
}
