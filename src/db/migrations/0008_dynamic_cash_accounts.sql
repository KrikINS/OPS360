-- 0008_dynamic_cash_accounts.sql
-- Creates per-branch "Cash in Hand" accounts dynamically from existing branches.
-- Idempotent: ON CONFLICT (code) DO NOTHING.
--
-- The global 1010 (Cash & Petty Cash) is kept active as a fallback.
-- Branch-scoped accounts use the pattern 1010-{branch_code}.
-- The application's getCashAccountCode() helper resolves the correct
-- account at runtime, falling back to 1010 if no branch-scoped row exists.

INSERT INTO accounts (id, code, name, type, branch_id, is_system, is_active)
SELECT
  gen_random_uuid(),
  '1010-' || COALESCE(NULLIF(TRIM(b.code), ''), LPAD(ROW_NUMBER() OVER (ORDER BY b.name)::text, 2, '0')),
  'Cash in Hand (' || b.name || ')',
  'Asset',
  b.id,
  true,
  true
FROM branches b
ON CONFLICT (code) DO NOTHING;
