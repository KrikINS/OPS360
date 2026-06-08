-- ── Migration 0007: Add Equity Accounts (Owner Capital & Retained Earnings) ─
-- These are required for the Balance Sheet equation (A = L + E) and for
-- opening balance journal entries (DR 1040 Inventory / CR 3010 Retained Earnings).
--
-- Idempotent: ON CONFLICT (code) DO UPDATE ensures safe re-runs.

INSERT INTO accounts (code, name, type, is_system, is_active)
VALUES
  ('3000', 'Owner Capital',     'Equity', true, true),
  ('3010', 'Retained Earnings', 'Equity', true, true)
ON CONFLICT (code) DO UPDATE
  SET name      = EXCLUDED.name,
      type      = EXCLUDED.type,
      is_system = true,
      is_active = true;
