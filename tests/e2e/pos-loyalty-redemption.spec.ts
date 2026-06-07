// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('POS Loyalty Redemption - Cash-Basis Option B', () => {
  // Use STAGING_API_URL if defined, fallback to staging domain
  const baseURL = process.env.STAGING_API_URL || 'https://ops360-dev.myappterra.com';

  test.beforeEach(async ({ page }) => {
    // Authenticate as a retail POS cashier
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', 'cashier@ops360.com');
    await page.fill('input[name="password"]', 'cashierpass123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('**/pos');
  });

  test('should record correct ledger matrix when redeeming loyalty points', async ({ page, request }) => {
    // 1. Mock scanning an item worth ₹8,000 (Gross)
    // Assume a data-testid or placeholder for POS item entry exists
    await page.fill('input[placeholder="Search product..."]', 'High-End Product (8000 INR)');
    await page.click('button[data-testid="add-to-cart"]');
    
    // Validate that the cart total shows 8000
    await expect(page.locator('.cart-total')).toHaveText(/8,000/);

    // 2. Apply a loyalty point redemption tender of ₹500
    await page.click('button[data-testid="redeem-points-btn"]');
    await page.fill('input[name="pointsToRedeem"]', '500'); // Assuming 1 point = 1 INR
    await page.click('button[data-testid="apply-points-btn"]');

    // Ensure net amount decreases to ₹7,500
    await expect(page.locator('.net-amount')).toHaveText(/7,500/);

    // 3. Submit the checkout payload
    // We capture the API response to retrieve the Invoice ID that was created
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/sales') || response.url().includes('checkout') && response.status() === 200
    );
    await page.click('button[data-testid="complete-checkout"]');
    
    const response = await responsePromise;
    const responseData = await response.json();
    const invoiceId = responseData.invoiceId || responseData.id;
    
    expect(invoiceId).toBeDefined();

    // 4. Validate the API response or database directly to assert the ledger matrix
    // Querying the staging DB through an internal test API endpoint or validating response payload
    const journalResponse = await request.get(`${baseURL}/api/test/journal/${invoiceId}`);
    
    // If testing strictly via response payload without a dedicated test API, 
    // the journal lines should be exposed in the checkout response JSON directly.
    const journalLines = journalResponse.ok() ? await journalResponse.json() : responseData.journalLines;

    expect(journalLines).toBeDefined();
    
    // Validate the Cash-Basis Accounting Ledger Matrix
    const debit1010 = journalLines.find((l: any) => l.account_code === '1010' && l.type === 'debit');
    const debit5040 = journalLines.find((l: any) => l.account_code === '5040' && l.type === 'debit');
    const credit4000 = journalLines.find((l: any) => l.account_code === '4000' && l.type === 'credit');
    const credit2050 = journalLines.find((l: any) => l.account_code === '2050' && l.type === 'credit'); // CGST
    const credit2055 = journalLines.find((l: any) => l.account_code === '2055' && l.type === 'credit'); // SGST

    // Assert Net Tender received
    expect(debit1010).toBeDefined();
    expect(debit1010.amount).toBe(7500);

    // Assert Loyalty Discount Expense
    expect(debit5040).toBeDefined();
    expect(debit5040.amount).toBe(500);

    // Assert Gross Sales Revenue
    expect(credit4000).toBeDefined();
    expect(credit4000.amount).toBeGreaterThan(0); // Equal to 8000 / (1 + Tax Rate)

    // Assert Output GST (CGST/SGST split)
    expect(credit2050).toBeDefined();
    expect(credit2055).toBeDefined();

    // Ensure the ledger perfectly balances
    const totalDebits = debit1010.amount + debit5040.amount;
    const totalCredits = credit4000.amount + credit2050.amount + credit2055.amount;
    
    // Account for minor floating point rounding
    expect(Math.abs(totalDebits - totalCredits)).toBeLessThan(0.01);
  });
});
