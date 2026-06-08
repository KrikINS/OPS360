# Finance Statements Codebase Audit

> **Generated**: 2026-06-08  
> **Scope**: P&L, Balance Sheet, Dashboard, Opening Balances, and the root cause of the Balance Sheet variance  
> **Key Files Audited**:
> - [`src/actions/finance.ts`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/actions/finance.ts)
> - [`src/app/(dashboard)/accounting/client.tsx`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/app/(dashboard)/accounting/client.tsx)
> - [`src/app/(dashboard)/accounting/page.tsx`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/app/(dashboard)/accounting/page.tsx)
> - [`src/app/api/inventory/import/route.ts`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/app/api/inventory/import/route.ts)
> - [`src/db/schema.ts`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/db/schema.ts) (lines 273–306)
> - [`src/db/seed-coa.ts`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/db/seed-coa.ts)

---

## 1. Exported Finance Functions — Complete Inventory

| # | Function | Line | Purpose |
|---|----------|------|---------|
| 1 | `getFinancialYear` | 15 | Derives Indian FY string (e.g., `2025-26`) from a date |
| 2 | `createJournalEntry` | 34 | Double-entry journal posting with balance validation |
| 3 | `postGRNJournal` | 91 | Auto-posts GRN receipt: DR Inventory, DR ITC, CR AP |
| 4 | `postSalesJournal` | 175 | Auto-posts POS sale: DR Cash, CR Revenue, CR GST, DR COGS, CR Inventory |
| 5 | `createExpenseRecord` | 241 | Creates a pending expense (no journal until approved) |
| 6 | `approveExpense` | 281 | Manager approves → posts journal: DR Expense, CR Cash/Bank |
| 7 | `settleVendorPayment` | 322 | DR Accounts Payable, CR Cash/Bank |
| 8 | `getVendorPayments` | 468 | Lists payments for a PO or branch |
| 9 | `rejectExpense` | 517 | Marks expense as rejected (no journal) |
| 10 | **`getProfitAndLoss`** | 535 | Aggregates Revenue vs Expense accounts for a date range |
| 11 | **`getBalanceSheet`** | 572 | Aggregates Asset, Liability, Equity balances up to a date |
| 12 | `getGSTSummary` | 604 | Aggregates Tax-type accounts (collected vs paid) |
| 13 | `getJournalEntries` | 638 | Paginated journal listing with cursor support |
| 14 | `exportJournalLedger` | 717 | Line-level CSV export for audit |
| 15 | `getJournalLines` | 772 | Drill-down lines for a single journal entry |
| 16 | `getExpenses` | 809 | Lists expense records |
| 17 | `getMarginReport` | 826 | Product-level margin analysis from `invoice_items` |

---

## 2. Profit & Loss (P&L) — Current Logic

### Backend: [`getProfitAndLoss`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/actions/finance.ts#L535-L569)

```sql
SELECT a.code, a.name, a.type,
  COALESCE(SUM(jl.credit - jl.debit), 0) AS net
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
  AND je.status = 'posted'
  AND je.date >= $fromDate   -- ✅ date-filtered
  AND je.date <= $toDate     -- ✅ date-filtered
WHERE a.type IN ('Revenue', 'Expense')
GROUP BY a.code, a.name, a.type
ORDER BY a.code
```

**Sign Convention**: `credit - debit`
- Revenue accounts (CR-natural): positive `net` = income earned
- Expense accounts (DR-natural): negative `net` = expense incurred
- `netProfit = totalRevenue - totalExpenses`

> [!NOTE]
> Because `netProfit = totalRevenue - totalExpenses` and expenses are already negative (credit - debit), the formula effectively double-subtracts expenses. If expenses are ₹1000 (debited), `net = 0 - 1000 = -1000`, and `netProfit = revenue - (-1000) = revenue + 1000`. **This is a sign convention bug** — revenue is overstated by the absolute value of expenses.

### Frontend: Dashboard Tab (Lines 660–996)

| Card | Source | Renders |
|------|--------|---------|
| Total Revenue | `pl?.totalRevenue` | `fmtINR(...)` |
| Total Expenses | `pl?.totalExpenses` | `fmtINR(...)` |
| Net Profit/Loss | `pl?.netProfit` | Color-coded ≥0 green, <0 orange |
| GST Position | `gst.gst[]` | Table: collected, paid, net payable |
| Revenue Breakdown | `pl?.revenue[]` | Per-account list |
| Expense Breakdown | `pl?.expenses[]` | Per-account list |

---

## 3. Balance Sheet — Current Logic

### Backend: [`getBalanceSheet`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/actions/finance.ts#L572-L601)

```sql
SELECT a.code, a.name, a.type,
  COALESCE(SUM(jl.debit - jl.credit), 0) AS balance
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
  AND je.status = 'posted'
  AND je.date <= $asOfDate
WHERE a.type IN ('Asset', 'Liability', 'Equity')   -- ⚠️ No 'Tax'
GROUP BY a.code, a.name, a.type
ORDER BY a.code
```

**Sign Convention**: `debit - credit`
- Asset accounts (DR-natural): positive = asset held
- Liability accounts (CR-natural): negative = owed (but UI shows absolute)
- Equity accounts (CR-natural): negative = owner's equity

> [!WARNING]
> **Tax accounts are excluded** from the Balance Sheet query (`WHERE a.type IN ('Asset', 'Liability', 'Equity')`). GST ITC (1051–1053) is typed as `Tax` in the COA, not `Asset`. GST Payable (2020–2040) is also typed `Tax`, not `Liability`. This means **GST balances appear on neither the P&L nor the Balance Sheet** — they are only visible in the GST Summary tab.

### Frontend: Balance Sheet Tab (Lines 998–1244)

| Element | Calculation | Location |
|---------|-------------|----------|
| **Accounting Equation Banner** | `Total Assets = Total Liabilities + Total Equity` | Lines 1004–1049 |
| Total Assets | `bs.assets.reduce(sum + balance)` | Line 1013 |
| Total Liabilities | `bs.liabilities.reduce(sum + balance)` | Line 1027 |
| Total Equity | `bs.equity.reduce(sum + balance)` | Line 1041 |
| **Variance Check** | `diff = abs(totalAssets - (totalLiabilities + totalEquity))` | Lines 1212–1244 |

If `diff > 1` (₹1 threshold), a warning card appears:

```
⚠️ Balance sheet is out of balance by ₹XX,XX,XXX.XX.
This may indicate missing opening balance entries.
```

---

## 4. The ₹17,23,600 Balance Sheet Discrepancy — Root Cause Analysis

### 4.1 Staging DB Current State

Querying the staging database directly reveals:

| Code | Name | Type | Balance |
|------|------|------|---------|
| 1010 | Cash & Petty Cash | Asset | **-₹2,26,500** |
| 1020 | Bank Accounts | Asset | **-₹6,40,000** |
| 1040 | Inventory Asset | Asset | ₹4,700 |
| 2010 | Accounts Payable | Liability | ₹8,61,800 |
| 3000 | Owner Capital | Equity | ₹0 |
| 3010 | Retained Earnings | Equity | ₹0 |

**Total Assets** = -226,500 + -640,000 + 4,700 = **-₹8,61,800**  
**Total Liabilities + Equity** = ₹8,61,800 + ₹0 = **₹8,61,800**  
**Variance** = |-861,800 - 861,800| = **₹17,23,600** ← The exact discrepancy

### 4.2 Root Causes

> [!CAUTION]
> **Root Cause #1: Liabilities show as positive (debit - credit), but are CR-natural**
>
> The Balance Sheet query uses `SUM(jl.debit - jl.credit) AS balance` uniformly for all types. For Liabilities and Equity (which are credit-normal), this produces **negative values** for actual balances. However, the UI's equation check (`totalAssets - totalLiabEquity`) uses the raw values. If AP has been credited ₹8,61,800 and debited ₹0, the query returns `-861800`. The UI sums liabilities and gets `-861800`. Assets are `-861800`. So `diff = |-861800 - (-861800)| = 0`. **Equation check works on staging because the signs happen to cancel out.**
>
> **But if Cash (Asset) goes negative via vendor payments while no offsetting Equity entry exists, the equation appears to break from the user's perspective because the banner shows negative numbers.**

> [!CAUTION]
> **Root Cause #2: Opening Balance journal entries silently fail → no Equity entry**
>
> The [inventory import route](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/app/api/inventory/import/route.ts#L311-L338) posts opening stock journals with:
> - DR `1040` Inventory Asset
> - CR `3010` Retained Earnings
>
> **But `3010` is not in the COA seed file** ([seed-coa.ts](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/db/seed-coa.ts)). In production, the account was manually created, but if `getAccountId('3010')` fails (because the account doesn't exist), the journal entry silently fails (wrapped in try/catch), and the **Inventory Asset debit has no offsetting Equity credit** — creating the variance.

> [!WARNING]
> **Root Cause #3: Tax accounts are invisible in the Balance Sheet**
>
> GST ITC (1051/1052/1053) should appear as current assets on the Balance Sheet. GST Payable (2020/2030/2040) should appear as current liabilities. Currently they are typed `Tax` and the BS query filters them out with `WHERE a.type IN ('Asset', 'Liability', 'Equity')`.
>
> Any GST balances that accumulate (ITC debits from GRN, GST credits from sales) will **never appear** on the Balance Sheet, contributing to the imbalance. The `getGSTSummary` function shows these separately, but they don't feed into the accounting equation.

---

## 5. Opening Balance — Current State

### 5.1 Schema

The `accounts` table ([schema.ts:273](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/db/schema.ts#L273-L283)) has **no `opening_balance` column**. All balances are purely derived from journal line aggregations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Auto-generated |
| `code` | TEXT UNIQUE | e.g., `1010`, `2010` |
| `name` | TEXT | Display name |
| `type` | TEXT | `Asset`, `Liability`, `Equity`, `Revenue`, `Expense`, `Tax` |
| `parent_id` | UUID | Unused (no hierarchy implemented) |
| `branch_id` | UUID | Unused (accounts are global) |
| `is_system` | BOOLEAN | Protected from deletion |
| `is_active` | BOOLEAN | Soft-delete flag |
| `created_at` | TIMESTAMP | |

### 5.2 Seed Data

The [seed-coa.ts](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/db/seed-coa.ts) file contains **18 accounts**:

| Range | Type | Accounts |
|-------|------|----------|
| 1010–1040 | Asset | Cash, Bank, Inventory |
| 1050–1053 | Tax | GST ITC (legacy + split) |
| 2010 | Liability | Accounts Payable |
| 2020–2040 | Tax | GST Payable |
| 4000 | Revenue | Sales Revenue |
| 5010–5080 | Expense | COGS, Freight, Utilities, Rent, Salaries, Marketing, Misc, Loyalty |

> [!IMPORTANT]
> **Missing from seed**: `3000 Owner Capital` and `3010 Retained Earnings` (both Equity type). These exist in the staging DB but were manually inserted — they are not in `seed-coa.ts`, the CI test COA, or the migration SQL.

### 5.3 Opening Balance Server Actions

**No dedicated opening balance server action exists.** The only mechanism is:

1. **Inventory Import** ([route.ts:311–338](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/app/api/inventory/import/route.ts#L311-L338)): Posts `DR 1040 / CR 3010` per branch on XLSX upload. Silently catches journal errors.

2. **No cash/bank opening balance**: There is no way to record initial cash-in-hand or bank balances. Any cash appears only as a side-effect of POS sales (DR 1010).

3. **No manual journal entry UI**: The system has `createJournalEntry` but no frontend form to create manual/adjusting entries.

---

## 6. P&L Sign Convention Bug — Detailed Analysis

The [`getProfitAndLoss`](file:///c:/Users/Anees%20Ahad/Desktop/Desktop%20PVT/OPS360/src/actions/finance.ts#L547) query uses `SUM(jl.credit - jl.debit) AS net`:

| Account Type | Natural Side | Typical Posting | Query Result |
|---|---|---|---|
| Revenue (4000) | Credit | CR ₹1000 (sale) | `net = +1000` ✅ |
| Expense (5010) | Debit | DR ₹500 (COGS) | `net = -500` |

The JS calculation:
```js
totalRevenue  = revenue.reduce(sum + net)     // e.g., +1000
totalExpenses = expenses.reduce(sum + net)     // e.g., -500
netProfit     = totalRevenue - totalExpenses   // 1000 - (-500) = 1500 ← WRONG
```

**Expected**: Net Profit = Revenue - |Expenses| = 1000 - 500 = **₹500**  
**Actual**: Net Profit = 1000 - (-500) = **₹1,500**

> [!WARNING]
> The P&L overstates net profit by double-counting expenses. Fix: either use `SUM(jl.debit - jl.credit)` for expenses (making them positive), or change the formula to `netProfit = totalRevenue + totalExpenses` (since expenses are already negative).

---

## 7. Summary of Issues Found

| # | Issue | Severity | Location | Impact |
|---|-------|----------|----------|--------|
| **S1** | **P&L sign convention double-subtraction** | 🔴 Critical | `finance.ts:565` | Net profit is overstated |
| **S2** | **Missing Equity accounts in COA seed** (3000, 3010) | 🔴 Critical | `seed-coa.ts` | Opening balance journals fail silently |
| **S3** | **Tax accounts excluded from Balance Sheet** | 🟡 Major | `finance.ts:586` | GST balances invisible in equation |
| **S4** | **Liability sign display** — raw `debit-credit` shown, not absolute | 🟡 Major | `client.tsx:1027` | Banner shows negative liabilities |
| **S5** | **Opening balance journal silently fails** (fire-and-forget catch) | 🟡 Major | `import/route.ts:334` | Inventory booked, no equity offset |
| **S6** | **No manual journal entry UI** | 🟠 Medium | `client.tsx` | Cannot post adjusting/correcting entries |
| **S7** | **No cash/bank opening balance mechanism** | 🟠 Medium | — | Cash starts at ₹0, goes negative after vendor payments |
| **S8** | **Loyalty discount posts to 5040 (Rent)** instead of 5080 | 🟡 Major | `finance.ts:215` | Expense mis-categorized |

---

## 8. Recommended Fixes

### Phase A: Data Integrity (Immediate)
1. Add `3000` and `3010` to `seed-coa.ts` and the test `seedCoa()` helper
2. Create migration `0007_add_equity_accounts.sql` to insert them into production/staging
3. Fix the `postSalesJournal` loyalty discount routing: `5040` → `5080`

### Phase B: P&L Accuracy
4. Fix the sign convention in `getProfitAndLoss`:
   ```js
   netProfit = totalRevenue + totalExpenses  // expenses are already negative
   ```
   OR change the query to use `SUM(jl.debit - jl.credit)` for Expense and negate in JS.

### Phase C: Balance Sheet Completeness
5. Include `Tax` accounts in the Balance Sheet (ITC as sub-assets, GST Payable as sub-liabilities), OR reclassify them to Asset/Liability type
6. Fix the liability sign in the UI banner (show absolute values for L+E side)

### Phase D: Opening Balances
7. Add an "Opening Balance" page or modal in the admin area
8. Propagate journal errors from inventory import (don't silently catch)
9. Create a cash/bank opening balance mechanism
