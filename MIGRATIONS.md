# Manual Database Migrations

All SQL below was applied directly via Cloud Shell psql to `ops360_staging`.
These are NOT managed by Drizzle migrations — they must be applied manually to any new environment.

---

## 2026-06-11 — Sales Returns: Per-line serial linkage + disposition

```sql
-- Add invoice_item_id to inventory (links each sold unit to its specific invoice line)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS invoice_item_id uuid REFERENCES invoice_items(id);

-- Backfill unambiguous cases (product appears on exactly one line of its invoice)
UPDATE inventory inv
SET invoice_item_id = ii.id
FROM invoice_items ii
WHERE inv.invoice_id = ii.invoice_id
  AND inv.product_id = ii.product_id
  AND inv.status IN ('Sold','Returned')
  AND inv.invoice_item_id IS NULL
  AND (SELECT COUNT(*) FROM invoice_items ii2 WHERE ii2.invoice_id = inv.invoice_id AND ii2.product_id = inv.product_id) = 1;

-- Add disposition to sales_return_items
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS disposition text NOT NULL DEFAULT 'resellable';
```

---

## 2026-06-11 — Products: tracking_type data fix

```sql
-- Set tracking_type = 'Serial' for products that had correct serial inventory but blank tracking_type
UPDATE products SET tracking_type = 'Serial'
WHERE id IN (
  '61cbebdc-4c21-45c8-be78-fd304c96ebf9',
  '8ca87ac8-308f-42a9-8c59-9b3c2a89dccc',
  'e8f20c00-2617-4e3e-8982-3e8d51da9259',
  '6f2f3103-deb9-4433-aac4-db3a4444dee8'
);
```

---

## 2026-06-12 — Payroll module

```sql
-- Extend employees table
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS date_of_joining date,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

-- Create employee salary structures
CREATE TABLE IF NOT EXISTS employee_salary_structures (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       uuid NOT NULL REFERENCES employees(id),
  effective_from    date NOT NULL,
  basic             numeric NOT NULL,
  hra               numeric NOT NULL DEFAULT 0,
  gross             numeric NOT NULL,
  pf_applicable     boolean NOT NULL DEFAULT false,
  pf_employee       numeric NOT NULL DEFAULT 0,
  professional_tax  numeric NOT NULL DEFAULT 0,
  tds_monthly       numeric NOT NULL DEFAULT 0,
  net               numeric NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  created_by        uuid NOT NULL,
  created_at        timestamp DEFAULT now()
);

-- Extend payslips with component breakdown
ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS basic             numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hra               numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pf_employee       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS professional_tax  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary_structure_id uuid REFERENCES employee_salary_structures(id);

-- Add payroll liability accounts
INSERT INTO accounts (code, name, type, is_system, is_active)
VALUES
  ('2061', 'PF Payable — Employee', 'Liability', true, true),
  ('2062', 'Professional Tax Payable', 'Liability', true, true)
ON CONFLICT (code) DO NOTHING;

-- Seed employees from profiles
WITH inserted AS (
  INSERT INTO employees (first_name, last_name, email, status, branch_id)
  VALUES
    ('Anees',   'Ahad',      'anees.ahad1007@gmail.com', 'active', 'fd75205c-1475-4d60-960f-993d4399e8ef'),
    ('Branch',  'Manager 1', 'manger.1@myappterra.com',  'active', 'fd75205c-1475-4d60-960f-993d4399e8ef'),
    ('Sebin',   'Baby',      'sebinbaby2674@gmail.com',  'active', 'fd75205c-1475-4d60-960f-993d4399e8ef'),
    ('Staff',   '1',         'staff.1@myappterra.com',   'active', 'fd75205c-1475-4d60-960f-993d4399e8ef'),
    ('Staff',   '2',         'staff.2@myappterra.com',   'active', 'fd75205c-1475-4d60-960f-993d4399e8ef'),
    ('Staff',   '3',         'staff.3@myappterra.com',   'active', 'fd75205c-1475-4d60-960f-993d4399e8ef')
  RETURNING id, email
)
UPDATE profiles p SET employee_id = i.id FROM inserted i WHERE p.email = i.email;
```

---

## 2026-06-12 — Service Hub: Job Cards + Warranty

```sql
-- Extend service_jobs
ALTER TABLE service_jobs
  ADD COLUMN IF NOT EXISTS serial_number     text,
  ADD COLUMN IF NOT EXISTS invoice_id        uuid,
  ADD COLUMN IF NOT EXISTS warranty_status   text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS resolution_notes  text,
  ADD COLUMN IF NOT EXISTS completed_at      timestamp;

-- Create warranty_registrations
CREATE TABLE IF NOT EXISTS warranty_registrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number       text NOT NULL,
  product_id          uuid NOT NULL,
  customer_id         uuid,
  invoice_id          uuid,
  purchase_date       date NOT NULL,
  warranty_months     integer NOT NULL DEFAULT 12,
  warranty_expires_at date NOT NULL,
  notes               text,
  registered_by       uuid NOT NULL,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamp DEFAULT now()
);
```

---

## 2026-06-13 — Debit Notes (Purchase Returns fix)

```sql
-- Create debit_notes table (was missing — purchase returns were silently failing)
CREATE TABLE debit_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_number   text NOT NULL,
  po_id               uuid REFERENCES purchase_orders(id),
  branch_id           uuid REFERENCES branches(id),
  vendor_id           uuid REFERENCES vendors(id),
  reason              text,
  amount              numeric NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'Pending',
  serial_numbers      text[] DEFAULT '{}',
  item_names          text[] DEFAULT '{}',
  metadata            jsonb,
  journal_entry_id    uuid,
  journal_failed      boolean DEFAULT false,
  created_by          uuid NOT NULL,
  created_at          timestamp DEFAULT now()
);
```

---

## Notes

- `process_pos_sale` is a PostgreSQL function managed directly in the DB, not through Drizzle. Current version includes per-line `invoice_item_id` stamping and per-line cost calculation. If recreating the DB, re-apply the function from the last known good version in the codebase session history.
- All manually applied columns are also reflected in `src/db/schema.ts` to prevent drizzle-kit from dropping them.
- Main Branch ID (used in employee seed): `fd75205c-1475-4d60-960f-993d4399e8ef`
