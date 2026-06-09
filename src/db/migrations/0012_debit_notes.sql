-- Migration 0012: debit_notes table for purchase returns / vendor debit notes
-- Run manually in Cloud Shell: psql $DATABASE_URL -f src/db/migrations/0012_debit_notes.sql

CREATE TABLE IF NOT EXISTS debit_notes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_number TEXT        NOT NULL,
  po_id             UUID        REFERENCES purchase_orders(id),
  branch_id         UUID        REFERENCES branches(id),
  vendor_id         UUID        REFERENCES vendors(id),
  reason            TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'Pending',
  serial_numbers    TEXT[]      NOT NULL DEFAULT '{}',
  item_names        TEXT[]      NOT NULL DEFAULT '{}',
  evidence_url      TEXT,
  metadata          JSONB,
  created_by        UUID,
  created_at        TIMESTAMP   DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS debit_notes_number_idx ON debit_notes (debit_note_number);

-- Sequential counter for DN prefix (shared sequential_counters table)
INSERT INTO sequential_counters (prefix, year, current_value)
VALUES ('DN', EXTRACT(YEAR FROM now())::int, 0)
ON CONFLICT (prefix, year) DO NOTHING;
