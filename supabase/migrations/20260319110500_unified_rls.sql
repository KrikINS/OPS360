-- Unified RLS Policies for Ops360

BEGIN;

-- 1. Enable RLS on all tables (if not already enabled)
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure a clean state (optional but safer for "Unified" migration)
-- Note: Replace with specific drops if you want to be more surgical.

-- 3. Define Helper Function for Branch/Role checks if needed, 
-- or use JWT claims directly (assumes metadata contains 'branch_id' and 'user_role')

-- 4. Unified Policies

-- Purchase Orders: Branch Isolation
CREATE POLICY "Users can view POs in their branch" ON public.purchase_orders
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    branch_id = (auth.jwt() ->> 'branch_id')::uuid
  );

CREATE POLICY "Managers can insert POs in their branch" ON public.purchase_orders
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'manager') AND
    branch_id = (auth.jwt() ->> 'branch_id')::uuid
  );

-- Inventory: Branch Isolation
-- (Replacing existing policy with a more robust one if needed)
DROP POLICY IF EXISTS "Users can access their branch inventory" ON public.inventory;
CREATE POLICY "Branch-level inventory access" ON public.inventory
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    branch_id = (auth.jwt() ->> 'branch_id')::uuid
  );

-- Vendors & Products: Global Read, Controlled Write
DROP POLICY IF EXISTS "Allow authenticated users to view vendors" ON public.vendors;
CREATE POLICY "Authenticated users can view vendors" ON public.vendors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and Managers can manage vendors" ON public.vendors
  FOR ALL USING (
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "Allow authenticated users to view products" ON public.products;
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

COMMIT;
