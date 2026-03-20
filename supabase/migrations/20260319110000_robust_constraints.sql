-- Add missing Foreign Keys and Constraints for Ops360

BEGIN;

-- 1. Ensure all ID columns are Primary Keys (assuming typical structure, but adding guardrails)
-- (Information schema research showed 'id' as 'gen_random_uuid()'/PK for most)

-- 2. Add Missing Foreign Keys

-- Purchase Orders
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT fk_po_vendor FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_po_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_po_creator FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_po_approver FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Purchase Order Items
ALTER TABLE public.purchase_order_items
  ADD CONSTRAINT fk_poi_po FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

-- Inventory
ALTER TABLE public.inventory
  ADD CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_inv_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_inv_po FOREIGN KEY (source_po_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

-- GRNs
ALTER TABLE public.grns
  ADD CONSTRAINT fk_grn_po FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_grn_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_grn_originator FOREIGN KEY (originator_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- GRN Items
ALTER TABLE public.grn_items
  ADD CONSTRAINT fk_grni_grn FOREIGN KEY (grn_id) REFERENCES public.grns(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_grni_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

-- Debit Notes
ALTER TABLE public.debit_notes
  ADD CONSTRAINT fk_dn_po FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_dn_vendor FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_dn_creator FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add NOT NULL constraints and CHECK constraints

-- Ensure quantities and prices are positive
ALTER TABLE public.purchase_order_items 
  ADD CONSTRAINT check_poi_qty CHECK (quantity > 0),
  ADD CONSTRAINT check_poi_price CHECK (unit_price >= 0);

ALTER TABLE public.inventory
  ADD CONSTRAINT check_inv_price CHECK (price >= 0);

COMMIT;
