-- ── Migration 0006: COA GST-ITC Split & Loyalty Discount Account ──────────────
-- Replaces the generic 1050 "GST ITC" with three tax-head-specific accounts and
-- adds 5080 "Loyalty Discount Expense" so loyalty redemptions no longer post to Rent.
--
-- Safety: 1050 is deactivated (is_active = false) rather than deleted so that any
-- existing journal_lines referencing it remain intact and auditable.

-- 1. Deactivate the old generic ITC account
UPDATE accounts
SET is_active = false
WHERE code = '1050';

-- 2. Insert the three split ITC accounts (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO accounts (code, name, type, is_system, is_active)
VALUES
  ('1051', 'CGST Input Tax Credit',  'Tax', true, true),
  ('1052', 'SGST Input Tax Credit',  'Tax', true, true),
  ('1053', 'IGST Input Tax Credit',  'Tax', true, true)
ON CONFLICT (code) DO UPDATE
  SET name      = EXCLUDED.name,
      is_active = true;

-- 3. Insert the loyalty discount expense account (idempotent)
INSERT INTO accounts (code, name, type, is_system, is_active)
VALUES
  ('5080', 'Loyalty Discount Expense', 'Expense', true, true)
ON CONFLICT (code) DO UPDATE
  SET name      = EXCLUDED.name,
      is_active = true;
