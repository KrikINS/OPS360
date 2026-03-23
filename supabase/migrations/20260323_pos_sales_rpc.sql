-- ==========================================
-- POS TRANSACTION ARCHITECTURE
-- Phase 3: Sales Commitment & Inventory Synchronization
-- ==========================================

BEGIN;

-- 1. ENSURE SALES TABLES EXIST
CREATE TABLE IF NOT EXISTS public.sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    branch_id UUID REFERENCES public.branches(id),
    net_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    staff_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ENABLE RLS
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES
DROP POLICY IF EXISTS "Staff can view their branch invoices" ON public.sales_invoices;
CREATE POLICY "Staff can view their branch invoices" ON public.sales_invoices
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin' OR 
        branch_id = (auth.jwt() ->> 'branch_id')::uuid
    );

-- 4. THE TRANSACTIONAL ATOMIC RPC
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_customer_id UUID,
    p_branch_id UUID,
    p_items JSONB,
    p_net_amount NUMERIC,
    p_tax_amount NUMERIC,
    p_total_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Essential for inventory updates bypassing staff RLS
AS $$
DECLARE
    v_invoice_id UUID;
    v_item JSONB;
    v_available_qty INTEGER;
    v_staff_role TEXT;
BEGIN
    -- A. AUTHENTICATION & ROLE CHECK
    SELECT role INTO v_staff_role FROM public.profiles WHERE id = auth.uid();
    
    IF v_staff_role NOT IN ('admin', 'sales') OR v_staff_role IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS';
    END IF;

    -- B. STOCK VALIDATION
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT available_quantity INTO v_available_qty 
        FROM public.inventory 
        WHERE product_id = (v_item->>'product_id')::uuid 
          AND branch_id = p_branch_id
        FOR UPDATE; -- Lock rows to prevent race conditions

        IF v_available_qty IS NULL OR v_available_qty < (v_item->>'qty')::integer THEN
            DECLARE
                v_product_name TEXT;
            BEGIN
                SELECT model_name INTO v_product_name FROM public.products WHERE id = (v_item->>'product_id')::uuid;
                RAISE EXCEPTION 'STOCK_ERROR: % is out of stock (Available: %)', v_product_name, COALESCE(v_available_qty, 0);
            END;
        END IF;
    END LOOP;

    -- C. INSERT INVOICE HEADER
    INSERT INTO public.sales_invoices (
        customer_id, 
        branch_id, 
        net_amount,
        tax_amount,
        total_amount, 
        staff_id
    ) VALUES (
        p_customer_id, 
        p_branch_id, 
        p_net_amount,
        p_tax_amount,
        p_total_amount, 
        auth.uid()
    ) RETURNING id INTO v_invoice_id;

    -- D. INSERT ITEMS & UPDATE INVENTORY
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Insert Line Item
        INSERT INTO public.invoice_items (
            invoice_id,
            product_id,
            quantity,
            unit_price,
            gst_amount
        ) VALUES (
            v_invoice_id,
            (v_item->>'product_id')::uuid,
            (v_item->>'qty')::integer,
            (v_item->>'unit_price')::numeric,
            (v_item->>'gst_amount')::numeric
        );

        -- Update Stock
        UPDATE public.inventory
        SET available_quantity = available_quantity - (v_item->>'qty')::integer
        WHERE product_id = (v_item->>'product_id')::uuid 
          AND branch_id = p_branch_id;
    END LOOP;

    -- E. RETURN INVOICE ID
    RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMIT;
