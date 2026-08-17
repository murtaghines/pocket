-- Phase 5: Server-side period aggregate RPCs
-- Eliminates client-side O(n) transaction scans in dashboard sub-components.

-- 1. Daily totals — feeds DailyFlowChart + DailyHeatmapCard + sub-period breakdowns
CREATE OR REPLACE FUNCTION get_daily_totals(
  p_user_id uuid,
  p_domain app_domain,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(day date, income numeric, expenses numeric, tx_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    t.date AS day,
    COALESCE(SUM(CASE WHEN t.movement = 'INCOME' THEN ABS(t.amount) ELSE 0 END), 0) AS income,
    COALESCE(SUM(CASE WHEN t.movement = 'EXPENSE' THEN ABS(t.amount) ELSE 0 END), 0) AS expenses,
    COUNT(*) AS tx_count
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.domain = p_domain
    AND t.is_hidden = false
    AND t.date BETWEEN p_start_date AND p_end_date
  GROUP BY t.date
  ORDER BY t.date;
$$;

-- 2. Category breakdown for arbitrary date ranges (generalizes get_category_breakdown)
CREATE OR REPLACE FUNCTION get_category_breakdown_range(
  p_user_id uuid,
  p_domain app_domain,
  p_start_date date,
  p_end_date date,
  p_movement movement_type
)
RETURNS TABLE(category text, total numeric, tx_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    t.category,
    COALESCE(SUM(ABS(t.amount)), 0) AS total,
    COUNT(*) AS tx_count
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.domain = p_domain
    AND t.is_hidden = false
    AND t.date BETWEEN p_start_date AND p_end_date
    AND t.movement = p_movement
  GROUP BY t.category
  ORDER BY total DESC;
$$;

-- 3. Top N expenses in a date range
CREATE OR REPLACE FUNCTION get_top_expenses(
  p_user_id uuid,
  p_domain app_domain,
  p_start_date date,
  p_end_date date,
  p_limit int DEFAULT 5
)
RETURNS TABLE(id uuid, description text, description_norm text, date date, amount numeric, category text)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    t.id,
    t.description,
    t.description_norm,
    t.date,
    ABS(t.amount) AS amount,
    t.category
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.domain = p_domain
    AND t.is_hidden = false
    AND t.date BETWEEN p_start_date AND p_end_date
    AND t.movement = 'EXPENSE'
    AND t.category != 'to_investment'
  ORDER BY ABS(t.amount) DESC
  LIMIT p_limit;
$$;

-- 4. Essential vs discretionary split with per-category detail
CREATE OR REPLACE FUNCTION get_essential_split(
  p_user_id uuid,
  p_domain app_domain,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(category text, kind text, total numeric)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    t.category,
    CASE
      WHEN t.category IN ('housing', 'groceries', 'transport', 'health',
                           'subscriptions', 'education', 'sports', 'pets')
      THEN 'essential'
      ELSE 'discretionary'
    END AS kind,
    COALESCE(SUM(ABS(t.amount)), 0) AS total
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.domain = p_domain
    AND t.is_hidden = false
    AND t.date BETWEEN p_start_date AND p_end_date
    AND t.movement = 'EXPENSE'
  GROUP BY t.category
  ORDER BY total DESC;
$$;
