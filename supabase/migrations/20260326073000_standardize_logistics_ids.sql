-- Standardize Logistics ID Formats (SR-YYYY-0001, ST-YYYY-0001)

-- 1. Create a table to track sequential counters per prefix and year
CREATE TABLE IF NOT EXISTS public.sequential_counters (
    prefix TEXT NOT NULL,
    year INT NOT NULL,
    current_value INT DEFAULT 0,
    PRIMARY KEY (prefix, year)
);

-- 2. Create the generator function
CREATE OR REPLACE FUNCTION public.get_next_logistics_id(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_year INT;
    v_next_val INT;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    
    INSERT INTO public.sequential_counters (prefix, year, current_value)
    VALUES (p_prefix, v_year, 1)
    ON CONFLICT (prefix, year) 
    DO UPDATE SET current_value = sequential_counters.current_value + 1
    RETURNING current_value INTO v_next_val;
    
    RETURN p_prefix || '-' || v_year || '-' || LPAD(v_next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Update Stock Request Trigger function
CREATE OR REPLACE FUNCTION public.set_stock_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := public.get_next_logistics_id('SR');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update fulfill_stock_request RPC
CREATE OR REPLACE FUNCTION public.fulfill_stock_request(p_request_id uuid, p_inventory_ids uuid[], p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_source_branch_id UUID;
    v_dest_branch_id UUID;
    v_transfer_id UUID;
    v_inv_id UUID;
    v_product_id UUID;
    v_serial TEXT;
    v_current_status TEXT;
    v_transfer_number TEXT;
BEGIN
    -- 1. Fetch and Lock Request
    SELECT source_branch_id, requesting_branch_id 
    INTO v_source_branch_id, v_dest_branch_id
    FROM public.stock_requests 
    WHERE id = p_request_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'REQUEST_NOT_FOUND: id %', p_request_id;
    END IF;

    -- 2. Create Transfer Header linked to Request
    -- USE NEW STANDARDIZED FORMAT
    v_transfer_number := public.get_next_logistics_id('ST');

    INSERT INTO public.stock_transfers (
        transfer_number, source_branch_id, destination_branch_id, originator_id, condition_notes, stock_request_id, status
    ) VALUES (
        v_transfer_number, v_source_branch_id, v_dest_branch_id, auth.uid(), p_notes, p_request_id, 'Pending'
    ) RETURNING id INTO v_transfer_id;

    -- 3. Process Selected Serials
    FOREACH v_inv_id IN ARRAY p_inventory_ids
    LOOP
        -- Lock and Validate Unit
        SELECT status::text, product_id, serial_number INTO v_current_status, v_product_id, v_serial 
        FROM public.inventory WHERE id = v_inv_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'UNIT_NOT_FOUND: id %', v_inv_id;
        END IF;

        IF v_current_status != 'Available' THEN
            RAISE EXCEPTION 'CANNOT_TRANSFER: Serial % must be Available (Current: %)', v_serial, v_current_status;
        END IF;

        -- Create item manifest
        INSERT INTO public.stock_transfer_items (transfer_id, product_id, inventory_id, serial_number)
        VALUES (v_transfer_id, v_product_id, v_inv_id, v_serial);

        -- Audit Log: Outward flow
        INSERT INTO public.inventory_transactions (
            product_id, branch_id, transaction_type, quantity, reference_id, created_by, inventory_id, serial_number
        ) VALUES (
            v_product_id, v_source_branch_id, 'INTERNAL_TRANSFER', -1, v_transfer_id, auth.uid(), v_inv_id, v_serial
        );

        -- Logically move units to In-Transit
        UPDATE public.inventory 
        SET status = 'In-Transit'::inventory_status, 
            updated_at = now() 
        WHERE id = v_inv_id;
    END LOOP;

    -- 4. Update Request Status to In-Transit
    UPDATE public.stock_requests 
    SET status = 'In-Transit'::request_status,
        updated_at = now()
    WHERE id = p_request_id;

    RETURN v_transfer_id;
END;
$function$;

-- 5. Update process_stock_transfer_send RPC
CREATE OR REPLACE FUNCTION public.process_stock_transfer_send(p_source_branch_id uuid, p_destination_branch_id uuid, p_inventory_ids uuid[], p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_transfer_id UUID;
    v_transfer_number TEXT;
    v_inv_id UUID;
    v_product_id UUID;
    v_serial TEXT;
    v_current_status TEXT;
BEGIN
    -- 1. Create Header
    -- USE NEW STANDARDIZED FORMAT
    v_transfer_number := public.get_next_logistics_id('ST');

    INSERT INTO public.stock_transfers (
        transfer_number, source_branch_id, destination_branch_id, originator_id, condition_notes
    ) VALUES (
        v_transfer_number, p_source_branch_id, p_destination_branch_id, auth.uid(), p_notes
    ) RETURNING id INTO v_transfer_id;

    -- 2. Process Items
    FOREACH v_inv_id IN ARRAY p_inventory_ids
    LOOP
        -- Lock and Validate Unit
        SELECT status, product_id, serial_number INTO v_current_status, v_product_id, v_serial 
        FROM public.inventory WHERE id = v_inv_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'UNIT_NOT_FOUND: id %', v_inv_id;
        END IF;

        IF v_current_status IN ('Sold', 'Reserved') THEN
            RAISE EXCEPTION 'CANNOT_TRANSFER: Serial % is currently in % status', v_serial, v_current_status;
        END IF;

        IF v_current_status != 'Available' THEN
            RAISE EXCEPTION 'CANNOT_TRANSFER: Serial % must be Available to transfer', v_serial;
        END IF;

        -- Create item manifest
        INSERT INTO public.stock_transfer_items (transfer_id, product_id, inventory_id, serial_number)
        VALUES (v_transfer_id, v_product_id, v_inv_id, v_serial);

        -- Audit Log: Outward flow (INTERNAL_TRANSFER)
        INSERT INTO public.inventory_transactions (
            product_id, branch_id, transaction_type, quantity, reference_id, created_by, inventory_id, serial_number
        ) VALUES (
            v_product_id, p_source_branch_id, 'INTERNAL_TRANSFER', -1, v_transfer_id, auth.uid(), v_inv_id, v_serial
        );

        -- Logically move units to Destination Branch and change status
        UPDATE public.inventory 
        SET status = 'In-Transit'::inventory_status, 
            branch_id = p_destination_branch_id, 
            updated_at = now() 
        WHERE id = v_inv_id;

    END LOOP;

    RETURN v_transfer_id;
END;
$function$;

-- 6. Migrate existing data
DO $$
DECLARE
    r RECORD;
    v_prefix TEXT;
    v_year INT;
    v_val INT;
BEGIN
    -- Migrate Stock Requests
    FOR r IN (SELECT id, created_at FROM public.stock_requests ORDER BY created_at) LOOP
        v_year := EXTRACT(YEAR FROM r.created_at)::INT;
        
        INSERT INTO public.sequential_counters (prefix, year, current_value)
        VALUES ('SR', v_year, 1)
        ON CONFLICT (prefix, year) DO UPDATE SET current_value = sequential_counters.current_value + 1
        RETURNING current_value INTO v_val;
        
        UPDATE public.stock_requests 
        SET request_number = 'SR-' || v_year || '-' || LPAD(v_val::TEXT, 4, '0')
        WHERE id = r.id;
    END LOOP;

    -- Migrate Stock Transfers
    FOR r IN (SELECT id, created_at FROM public.stock_transfers ORDER BY created_at) LOOP
        v_year := EXTRACT(YEAR FROM r.created_at)::INT;
        
        INSERT INTO public.sequential_counters (prefix, year, current_value)
        VALUES ('ST', v_year, 1)
        ON CONFLICT (prefix, year) DO UPDATE SET current_value = sequential_counters.current_value + 1
        RETURNING current_value INTO v_val;
        
        UPDATE public.stock_transfers 
        SET transfer_number = 'ST-' || v_year || '-' || LPAD(v_val::TEXT, 4, '0')
        WHERE id = r.id;
    END LOOP;
END;
$$;
