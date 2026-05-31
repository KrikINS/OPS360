# Test suite type debt — created 2026-05-31

## All items resolved

### 1. currentStock column (RESOLVED 2026-05-31 — Option B)
File: src/actions/__tests__/inventory.test.ts, pos.test.ts, procurement.test.ts
Resolution: Implemented Option B. All seven currentStock assertions and all
stock: N seed arguments were replaced across three test files.
- seedProduct no longer accepts a stock option
- New seedInventoryUnits helper inserts N rows into schema.inventory with
  status 'Available', matching the unit-based inventory model the app uses
- Assertions now count rows in schema.inventory filtered by product_id,
  branch_id, and status = 'Available'
- Zero as any remaining in inventory.test.ts
- ESLint disable header removed from inventory.test.ts and pos.test.ts
  (procurement.test.ts retains the header due to unrelated action-result casts)

### 2. serialNumbers schema casts (RESOLVED 2026-05-31)
File: src/actions/__tests__/inventory.test.ts
Resolution: serialNumbers table added to src/db/schema.ts. Casts removed.
Both access sites now use typed schema.serialNumbers and db.query.serialNumbers.

### 3. ESLint disable header (RESOLVED 2026-05-31)
File: src/actions/__tests__/inventory.test.ts and pos.test.ts
Resolution: Headers removed from both files after all as any usage was
eliminated. procurement.test.ts retains its header — the remaining as any
casts there are on action return values (createPurchaseOrder, createGRN, etc.)
which need proper return-type annotations on the action functions themselves.
That cleanup is tracked separately in the procurement action files.

## Definition of done
- Zero as any in inventory.test.ts ✓
- Zero as any in pos.test.ts ✓
- Zero eslint-disable in inventory.test.ts and pos.test.ts ✓
- All 44 unit tests pass ✓
- npm run test:integration passes with real DB (pending DB setup)

5. **GST Calculations in Procurement**
   - Location: \src/actions/procurement.ts\ -> \createPurchaseOrder\
   - Problem: The GST calculation logic is missing. The action currently hardcodes \cgst: 0, sgst: 0, igst: 0\ and does not look up vendor/branch states or HSN GST rates. The integration tests have been marked as \it.todo\ pending actual implementation.


### 6. GRN table missing from schema (HIGH � procurement gap)
File: \src/actions/procurement.ts\ � \createGRN\
Tests: 3 tests marked it.todo
Issue: \createGRN\ calls \getGRNReceiptsAction\ which queries \grn_receipts\ table that does not exist in \src/db/schema.ts\. The entire GRN receipt flow is unimplemented at the DB layer.
Fix: Add \grn_receipts\ (or \goods_receipt_notes\) table to schema, run \drizzle-kit push\, implement \createGRN\ logic against real table.


### 7. createReturnToVendor not implemented (MEDIUM)
File: \src/actions/procurement.ts\ � \createReturnToVendor\
Tests: 1 test marked it.todo
Issue: Function is a stub. Returns success: true without writing to any table. No inventory rows are updated.
Fix: Implement to update N inventory rows for the returned product+branch from 'Available' to 'Returned', then return { success: true }. Use same pattern as adjustStock.

