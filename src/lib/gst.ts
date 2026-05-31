export function roundToTwoDecimals(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function calculateLineItemGST({
  baseAmount,
  gstRate,
  qty = 1,
  discountPct = 0,
}: {
  baseAmount: number
  gstRate: number
  qty?: number
  discountPct?: number
}) {
  const discountAmount = roundToTwoDecimals(baseAmount * (discountPct / 100))
  const taxableAmount = roundToTwoDecimals((baseAmount - discountAmount) * qty)
  const gstAmount = roundToTwoDecimals(taxableAmount * (gstRate / 100))
  const totalAmount = roundToTwoDecimals(taxableAmount + gstAmount)
  return { discountAmount, taxableAmount, gstAmount, totalAmount }
}

export function splitGST({
  gstAmount,
  gstRate,
  interstate,
}: {
  gstAmount: number
  gstRate: number
  interstate: boolean
}) {
  if (interstate) {
    return { igst: gstAmount, cgst: 0, sgst: 0, igstRate: gstRate, cgstRate: 0, sgstRate: 0 }
  }
  const halfRate = roundToTwoDecimals(gstRate / 2)
  const cgst = roundToTwoDecimals(gstAmount / 2)
  const sgst = roundToTwoDecimals(gstAmount - cgst)
  return { cgst, sgst, igst: 0, cgstRate: halfRate, sgstRate: halfRate, igstRate: 0 }
}

export function calculateInvoiceTotals(
  lines: Array<{ baseAmount: number; gstRate: number; qty?: number; discountPct?: number }>,
  { interstate }: { interstate: boolean },
) {
  const lineResults = lines.map((l) => {
    const lineGST = calculateLineItemGST(l)
    const split = splitGST({ gstAmount: lineGST.gstAmount, gstRate: l.gstRate, interstate })
    return { ...lineGST, ...split }
  })

  const subtotal = roundToTwoDecimals(lineResults.reduce((s, l) => s + l.taxableAmount, 0))
  const totalGST = roundToTwoDecimals(lineResults.reduce((s, l) => s + l.gstAmount, 0))
  const grandTotal = roundToTwoDecimals(subtotal + totalGST)
  const cgst = roundToTwoDecimals(lineResults.reduce((s, l) => s + l.cgst, 0))
  const sgst = roundToTwoDecimals(lineResults.reduce((s, l) => s + l.sgst, 0))
  const igst = roundToTwoDecimals(lineResults.reduce((s, l) => s + l.igst, 0))

  return { subtotal, totalGST, grandTotal, cgst, sgst, igst }
}

// GSTIN format: 2-digit state code + 5 alpha + 4 digits + 1 alpha + 1 [1-9A-Z] + Z + 1 [0-9A-Z]
const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export function validateGSTIN(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false
  if (!GSTIN_RE.test(gstin)) return false
  const stateCode = parseInt(gstin.slice(0, 2), 10)
  return stateCode >= 1 && stateCode <= 38
}

export function formatGSTIN(gstin: string): string {
  return `${gstin.slice(0, 2)} — ${gstin.slice(2)}`
}
