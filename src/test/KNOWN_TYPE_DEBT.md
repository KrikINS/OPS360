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

### 5. GST Calculations in Procurement (RESOLVED 2026-06-01)
   - Location: src/actions/procurement.ts -> createPurchaseOrder
   - Resolution: GST calculation implemented. Vendor and branch state_code
     columns are compared to determine inter-state vs intra-state supply.
     HSN rates are fetched per line item via products.hsn_code = hsn_codes.hsn_code
     join. CGST+SGST applied for intra-state; IGST applied for inter-state.
     Totals persisted to purchase_orders.cgst_amount, sgst_amount, igst_amount
     (columns added to schema and both test + staging DBs).
     Both it.todo tests now pass. Suite: 79 passed | 4 todo | 0 failed.

### 6. GRN receipt flow (RESOLVED 2026-06-01)
File: src/actions/procurement.ts -> createGRN
Resolution: Full GRN receipt flow implemented.
- Added po_items, grn_receipts, grn_items tables to schema.
- Added product_id, po_item_id, ordered_qty, received_qty, shortfall
  columns to discrepancies table.
- createPurchaseOrder now inserts po_items rows and returns them with real IDs.
- createGRN generates a GRN number, calculates landed cost per unit,
  inserts grn_receipts header, grn_items per line, one inventory row
  per received unit (status=Available, landed_cost set), and a discrepancies
  row for any shortfall. Updates po_items.received_qty.
- Removed dead getGRNReceiptsAction call.
- All 3 GRN it.todo tests now pass. Suite: 82 passed | 1 todo | 0 failed.

### 7. createReturnToVendor not implemented (MEDIUM)
File: src/actions/procurement.ts -> createReturnToVendor
Tests: 1 test marked it.todo
Issue: Function is a stub. Returns success: true without writing to any table.
No inventory rows are updated.
Fix: Implement to update N inventory rows for the returned product+branch from
'Available' to 'Returned', then return { success: true }.
Use same pattern as adjustStock.