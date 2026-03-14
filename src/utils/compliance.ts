/**
 * Utility functions for Indian Compliance and Financial Calculation Contexts.
 * Specifically optimized for Kerala-based operations (State Code: 32).
 */

export const COMPANY_STATE = 'Kerala';
export const COMPANY_STATE_CODE = '32';

/**
 * Resolves the GST slab (12%, 18%, or 28%) based on the HSN Code.
 */
export function getGstRateFromHsn(hsnCode: string): number {
  if (hsnCode.startsWith('8415') || hsnCode.startsWith('8418')) return 0.28;
  if (hsnCode.startsWith('8450')) return 0.18;
  if (hsnCode.startsWith('8509') || hsnCode.startsWith('8414')) return 0.12;
  return 0.18;
}

/**
 * Determines if a transaction is Intra-state (Local) or Inter-state.
 */
export function getGstType(vendorState: string): 'LOCAL' | 'INTERSTATE' {
  if (!vendorState) return 'LOCAL'; // Default to local for safety
  return vendorState.toLowerCase() === COMPANY_STATE.toLowerCase() ? 'LOCAL' : 'INTERSTATE';
}

/**
 * Calculates landed cost for GRN/PO: Base Price + Freight + specific GST applied.
 * Automatically handles CGST/SGST/IGST split based on vendor location.
 */
export function calculateLandedCost(
  basePrice: number, 
  freight: number, 
  hsnCode: string, 
  vendorState: string = COMPANY_STATE
) {
  const gstRate = getGstRateFromHsn(hsnCode);
  const gstType = getGstType(vendorState);
  const totalGstAmount = basePrice * gstRate;

  if (gstType === 'LOCAL') {
    return {
      basePrice,
      freight,
      gstRate: gstRate * 100,
      cgstRate: (gstRate / 2) * 100,
      sgstRate: (gstRate / 2) * 100,
      cgstAmount: totalGstAmount / 2,
      sgstAmount: totalGstAmount / 2,
      igstAmount: 0,
      totalGstAmount,
      totalLandedCost: basePrice + freight + totalGstAmount,
      gstType
    };
  }

  return {
    basePrice,
    freight,
    gstRate: gstRate * 100,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: totalGstAmount,
    totalGstAmount,
    totalLandedCost: basePrice + freight + totalGstAmount,
    gstType
  };
}

/**
 * Computes Indian Payroll logic based on recent codes.
 */
export function calculatePayroll(ctc: number, overtimeHours: number, standardWorkingHoursPerMonth = 160) {
  const basicPayOrig = ctc * 0.50;
  const basicPay = Math.max(basicPayOrig, 15000); 
  const allowances = ctc - basicPay;
  const hourlyRate = basicPay / standardWorkingHoursPerMonth;
  const overtimeRate = hourlyRate * 2; 
  const overtimePay = overtimeHours * overtimeRate;

  return {
    ctc,
    basicPay,
    allowances,
    overtimeHours,
    overtimeRate,
    overtimePay,
    grossSalary: basicPay + allowances + overtimePay
  }
}
