-- ==========================================
-- POS AUDIT COMPLIANCE & GCP READINESS
-- Phase 3: Discounts, Payment Methods & Serial Persistence
-- ==========================================

BEGIN;

-- 1. EXTEND TABLES FOR FINANCIAL COMPLIANCE
ALTER TABLE public.sales_invoices 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- 2. ENHANCED TRANSACTIONAL RPC
-- Redefines process_pos_sale to handle discounts and serials atomically
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_customer_id UUID,
    p_branch_id UUID,
    p_items JSONB,
    p_net_amount NUMERIC,
    p_tax_amount NUMERIC,
    p_total_amount NUMERIC,
    p_discount_amount NUMERIC DEFAULT 0,
    p_payment_method TEXT DEFAULT 'cash'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_num TEXT;
    v_item JSONB;
    v_staff_role TEXT;
    v_available_qty INTEGER;
BEGIN
    -- A. AUTHENTICATION & ROLE CHECK
    SELECT role INTO v_staff_role FROM public.profiles WHERE id = auth.uid();
    
    IF v_staff_role NOT IN ('admin', 'sales', 'staff') OR v_staff_role IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS';
    END IF;

    -- B. GENERATE INVOICE NUMBER (e.g., INV-2024-0001)
    -- Using the centralized sequential_counters table if exists, else timestamp
    -- Assuming a simple timestamp-based fallback for robustness
    v_invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD-HHMISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::text, 3, '0');

    -- C. INSERT INVOICE HEADER
    INSERT INTO public.sales_invoices (
        customer_id, 
        branch_id, 
        net_amount,
        tax_amount,
        total_amount, 
        discount_amount,
        payment_method,
        invoice_number,
        staff_id
    ) VALUES (
        p_customer_id, 
        p_branch_id, 
        p_net_amount,
        p_tax_amount,
        p_total_amount, 
        p_discount_amount,
        p_payment_method,
        v_invoice_num,
        auth.uid()
    ) RETURNING id INTO v_invoice_id;

    -- D. INSERT ITEMS & UPDATE INVENTORY
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Insert Line Item with Serial Tracking
        INSERT INTO public.invoice_items (
            invoice_id,
            product_id,
            quantity,
            unit_price,
            gst_amount,
            serial_number
        ) VALUES (
            v_invoice_id,
            (v_item->>'product_id')::uuid,
            (v_item->>'qty')::integer,
            (v_item->>'unit_price')::numeric,
            (v_item->>'gst_amount')::numeric,
            v_item->>'serial_number'
        );

        -- Update Stock (Deducting physical quantity)
        UPDATE public.inventory
        SET available_quantity = available_quantity - (v_item->>'qty')::integer
        WHERE product_id = (v_item->>'product_id')::uuid 
          AND branch_id = p_branch_id;
          
        -- If it's a specific serial, we could also mark the serial record as 'Sold'
        -- This logic depends on the specific detail of the inventory table schema.
    END LOOP;

    -- E. RETURN RESULTS
    RETURN JSONB_BUILD_OBJECT(
        'id', v_invoice_id,
        'invoice_number', v_invoice_num,
        'created_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TRANSACTION_FAILED: %', SQLERRM;
    RAISE;
END;
$$;

COMMIT;
