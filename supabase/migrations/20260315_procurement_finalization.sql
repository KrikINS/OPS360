-- Add terms_content to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS terms_content TEXT;

-- Create T&C templates table
CREATE TABLE IF NOT EXISTS po_terms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert a default template
INSERT INTO po_terms_templates (name, content, is_default)
VALUES (
  'Standard Corporate PO Terms',
  '1. Supply as per agreed specifications and delivery schedule.
2. Invoices must mention the PO Number and GSTIN of both parties.
3. All goods are subject to inspection and approval upon receipt.
4. Subject to Bengaluru Jurisdiction.',
  true
)
ON CONFLICT DO NOTHING;
