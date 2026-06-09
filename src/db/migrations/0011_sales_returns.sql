-- 0011_sales_returns.sql
-- Creates sales_returns and sales_return_items tables for credit note / return processing.
-- Run manually via Cloud Shell — never auto-applied.
--
-- sales_returns:      one row per return event (header)
-- sales_return_items: line-level detail of what was returned

CREATE TABLE IF NOT EXISTS sales_returns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES sales_invoices(id),
  branch_id        UUID NOT NULL REFERENCES branches(id),
  created_by       UUID NOT NULL,
  reason           TEXT NOT NULL,
  refund_method    TEXT NOT NULL,  -- 'cash' | 'bank' | 'loyalty_points'
  refund_amount    NUMERIC NOT NULL,
  journal_entry_id UUID,           -- linked after journal post
  created_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id        UUID NOT NULL REFERENCES sales_returns(id),
  invoice_item_id  UUID NOT NULL,  -- original invoice_items.id
  product_id       UUID NOT NULL REFERENCES products(id),
  inventory_id     UUID,           -- specific unit if serialised
  qty              INTEGER NOT NULL,
  unit_price       NUMERIC NOT NULL,
  cost_price       NUMERIC,
  cgst             NUMERIC NOT NULL DEFAULT 0,
  sgst             NUMERIC NOT NULL DEFAULT 0,
  igst             NUMERIC NOT NULL DEFAULT 0
);
