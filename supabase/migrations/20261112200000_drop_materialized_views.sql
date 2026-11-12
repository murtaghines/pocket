-- Replace materialized-view-backed RPCs with direct queries.
--
-- mv_daily_totals and mv_opening_balances require refresh_dashboard_views()
-- after every mutation, adding complexity and risking stale data.  At the
-- current data scale (hundreds of transactions, not millions) the direct
-- queries are just as fast and always return fresh results.
--
-- After this migration:
--   • get_monthly_series   → queries transactions directly
--   • get_period_series    → queries transactions directly
--   • get_opening_balances → queries transactions directly
--   • set_import_archived  → no longer calls refresh_dashboard_views()
--   • mv_daily_totals, mv_opening_balances, refresh_dashboard_views() → dropped

-------------------------------------------------------------------------
-- 1. get_monthly_series — direct query
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_series(
  p_user_id    uuid,
  p_domain     public.app_domain,
  p_start_month text DEFAULT NULL,
  p_end_month   text DEFAULT NULL
)
RETURNS TABLE(month text, income numeric, expenses numeric, balance numeric, sent_to_invest numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    to_char(t.date, 'YYYY-MM') AS month,
    ROUND(COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'INCOME'), 0), 2) AS income,
    ROUND(COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'EXPENSE'), 0), 2) AS expenses,
    ROUND(
      COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
        FILTER (WHERE t.movement = 'INCOME'), 0)
    - COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
        FILTER (WHERE t.movement = 'EXPENSE'), 0)
    , 2) AS balance,
    ROUND(GREATEST(
      - COALESCE(SUM(t.amount * COALESCE(a.split_percentage, 100) / 100.0)
          FILTER (WHERE t.movement = 'TRANSFER'
            AND t.category IN ('to_investment','from_investment','to_savings','from_savings')), 0)
    , 0), 2) AS sent_to_invest
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id
    AND t.domain  = p_domain
    AND t.is_hidden = false
    AND COALESCE(a.hidden_from_dashboard, false) = false
    AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
    AND (p_start_month IS NULL OR to_char(t.date, 'YYYY-MM') >= p_start_month)
    AND (p_end_month   IS NULL OR to_char(t.date, 'YYYY-MM') <= p_end_month)
  GROUP BY to_char(t.date, 'YYYY-MM')
  ORDER BY month ASC;
$$;

-------------------------------------------------------------------------
-- 2. get_period_series — direct query
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_period_series(
  p_user_id     uuid,
  p_domain      public.app_domain,
  p_granularity text DEFAULT 'month'
)
RETURNS TABLE(period text, income numeric, expenses numeric, balance numeric, sent_to_invest numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE p_granularity
      WHEN 'week' THEN to_char(date_trunc('week', t.date), 'YYYY-MM-DD')
      WHEN 'year' THEN EXTRACT(year FROM t.date)::text
      ELSE to_char(t.date, 'YYYY-MM')
    END AS period,
    ROUND(COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'INCOME'), 0), 2) AS income,
    ROUND(COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'EXPENSE'), 0), 2) AS expenses,
    ROUND(
      COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
        FILTER (WHERE t.movement = 'INCOME'), 0)
    - COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
        FILTER (WHERE t.movement = 'EXPENSE'), 0)
    , 2) AS balance,
    ROUND(GREATEST(
      - COALESCE(SUM(t.amount * COALESCE(a.split_percentage, 100) / 100.0)
          FILTER (WHERE t.movement = 'TRANSFER'
            AND t.category IN ('to_investment','from_investment','to_savings','from_savings')), 0)
    , 0), 2) AS sent_to_invest
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id
    AND t.domain  = p_domain
    AND t.is_hidden = false
    AND COALESCE(a.hidden_from_dashboard, false) = false
    AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
  GROUP BY
    CASE p_granularity
      WHEN 'week' THEN to_char(date_trunc('week', t.date), 'YYYY-MM-DD')
      WHEN 'year' THEN EXTRACT(year FROM t.date)::text
      ELSE to_char(t.date, 'YYYY-MM')
    END
  ORDER BY period ASC;
$$;

-------------------------------------------------------------------------
-- 3. get_opening_balances — direct query
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain
)
RETURNS TABLE(month text, opening_balance numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH monthly_totals AS (
    SELECT
      t.account_id,
      to_char(t.date, 'YYYY-MM') AS month,
      SUM(t.amount) AS month_total
    FROM transactions t
    JOIN accounts acct ON acct.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.domain  = p_domain
      AND t.is_hidden = false
      AND acct.account_type::text NOT IN ('SAVINGS', 'JOINT_SAVINGS')
      AND acct.hidden_from_dashboard = false
    GROUP BY t.account_id, to_char(t.date, 'YYYY-MM')
  ),
  cumulative AS (
    SELECT
      mt.account_id,
      mt.month,
      COALESCE(
        SUM(mt.month_total) OVER (
          PARTITION BY mt.account_id
          ORDER BY mt.month
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0
      ) AS sum_before
    FROM monthly_totals mt
  )
  SELECT
    c.month,
    ROUND(SUM(
      (COALESCE(a.initial_balance, 0) + c.sum_before)
      * COALESCE(a.split_percentage, 100) / 100.0
    ), 2) AS opening_balance
  FROM cumulative c
  JOIN accounts a ON a.id = c.account_id
  GROUP BY c.month
  ORDER BY c.month;
$$;

-------------------------------------------------------------------------
-- 4. set_import_archived — remove refresh_dashboard_views() call
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_import_archived(p_import_id uuid, p_archived boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_archived THEN
    UPDATE transactions
       SET is_hidden = true, hidden_by_archive = p_import_id
     WHERE import_id = p_import_id AND is_hidden = false;
  ELSE
    UPDATE transactions
       SET is_hidden = false, hidden_by_archive = NULL
     WHERE hidden_by_archive = p_import_id;
  END IF;
  UPDATE imports SET archived = p_archived WHERE id = p_import_id;
END;
$$;

-------------------------------------------------------------------------
-- 5. Drop materialized views and the refresh function
-------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_daily_totals CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_opening_balances CASCADE;
DROP FUNCTION IF EXISTS refresh_dashboard_views();
