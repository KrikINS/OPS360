/**
 * Utility functions for Indian Compliance and Financial Calculation Contexts.
 */

/**
 * Resolves the GST slab (12%, 18%, or 28%) based on the HSN Code.
 * Simplified Indian GST mapping for home appliances.
 */
export function getGstRateFromHsn(hsnCode: string): number {
  // Example real-world HSN categorization:
  // Air Conditioners & Refrigerators are typically 28%
  if (hsnCode.startsWith('8415') || hsnCode.startsWith('8418')) return 0.28;
  
  // Washing machines are typically 18%
  if (hsnCode.startsWith('8450')) return 0.18;
  
  // Smaller appliances / electronics might be 12% or 18%
  if (hsnCode.startsWith('8509') || hsnCode.startsWith('8414')) return 0.12;

  // Default to 18% standard for most other electronic goods in India
  return 0.18;
}

/**
 * Calculates landed cost for GRN: Base Price + Freight + specific GST applied.
 */
export function calculateLandedCost(basePrice: number, freight: number, hsnCode: string) {
  const gstRate = getGstRateFromHsn(hsnCode);
  const gstAmount = basePrice * gstRate;
  
  return {
    basePrice,
    freight,
    gstRate: gstRate * 100, // Representing as percentage
    gstAmount,
    totalLandedCost: basePrice + freight + gstAmount
  }
}

/**
 * Computes Indian Payroll logic based on recent codes.
 * Basic Pay must be >= 50% of CTC.
 * Overtime is calculated at 2x standard rate based on Basic Pay.
 */
export function calculatePayroll(ctc: number, overtimeHours: number, standardWorkingHoursPerMonth = 160) {
  // Rule: Basic pay must be at least 50% of CTC compliance.
  const basicPayOrig = ctc * 0.50;
  
  // Consider minimum wage compliance floor. Let's assume ~15,000 INR.
  const basicPay = Math.max(basicPayOrig, 15000); 

  const allowances = ctc - basicPay;
  
  // Overtime rate computation. Base hourly rate on Basic Pay.
  const hourlyRate = basicPay / standardWorkingHoursPerMonth;
  const overtimeRate = hourlyRate * 2; // India Overtime is double rate
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
