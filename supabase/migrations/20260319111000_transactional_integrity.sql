-- Transactional Integrity Procedures and Triggers

BEGIN;

-- 1. Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply Updated At to Products
DROP TRIGGER IF EXISTS tr_products_updated_at ON public.products;
CREATE TRIGGER tr_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Enhanced PO Approval Functionality (Example of a new atomic procedure)
-- This logic could be used by the backend to approve a PO and lock it.
CREATE OR REPLACE FUNCTION public.approve_purchase_order(p_po_id uuid, p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_current_status text;
BEGIN
    SELECT status INTO v_current_status FROM public.purchase_orders WHERE id = p_po_id FOR UPDATE;
    
    IF v_current_status != 'draft' AND v_current_status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only draft or pending POs can be approved');
    END IF;

    UPDATE public.purchase_orders
    SET status = 'approved', approved_by = p_user_id, updated_at = now()
    WHERE id = p_po_id;

    RETURN jsonb_build_object('success', true, 'message', 'PO approved successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMIT;
