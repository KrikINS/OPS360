CREATE OR REPLACE FUNCTION public.get_user_pos_stats(
  p_user_id UUID,
  p_branch_id UUID
)
RETURNS TABLE(
  full_name        TEXT,
  today_sales_count BIGINT,
  today_revenue    NUMERIC
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.full_name::TEXT,
    COUNT(si.id)::BIGINT            AS today_sales_count,
    COALESCE(SUM(si.total_amount), 0)::NUMERIC AS today_revenue
  FROM profiles pr
  LEFT JOIN sales_invoices si
    ON  si.user_id     = p_user_id
    AND si.branch_id   = p_branch_id
    AND si.created_at >= CURRENT_DATE
    AND si.status      = 'active'
  WHERE pr.id = p_user_id
  GROUP BY pr.full_name;
END;
$$;
