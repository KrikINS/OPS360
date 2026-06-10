-- Migration 0013: payroll_runs and payslips tables
-- Run manually in Cloud Shell: psql $DATABASE_URL -f src/db/migrations/0013_payroll.sql

CREATE TABLE IF NOT EXISTS payroll_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        UUID NOT NULL REFERENCES branches(id),
  pay_period       TEXT NOT NULL,
  payment_date     DATE NOT NULL,
  payment_method   TEXT NOT NULL,
  gross_total      NUMERIC NOT NULL,
  tds_total        NUMERIC NOT NULL DEFAULT 0,
  net_total        NUMERIC NOT NULL,
  notes            TEXT,
  journal_entry_id UUID,
  created_by       UUID NOT NULL,
  created_at       TIMESTAMP DEFAULT now(),
  status           TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS payslips (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id),
  staff_name     TEXT NOT NULL,
  staff_id       UUID,
  gross          NUMERIC NOT NULL,
  tds            NUMERIC NOT NULL DEFAULT 0,
  net            NUMERIC NOT NULL,
  notes          TEXT
);

-- Account 2060: TDS Payable
INSERT INTO accounts (code, name, type, is_system, is_active, branch_id, created_at)
VALUES ('2060', 'TDS Payable', 'Liability', true, true, null, now())
ON CONFLICT (code) DO NOTHING;
