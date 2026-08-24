-- Dashboard performance: materialized views + consolidated RPC.
-- Reduces per-tab RPCs from 7-8 to 2.

--------------------------------------------------------------------------------
-- 1. mv_daily_totals — pre-aggregated daily granularity
--    ~365 rows/user/year; replaces full table scans in get_monthly_series
--    and get_period_series.
--------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_totals AS
SELECT
  user_id,
  domain,
  date AS day,
  COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'INCOME'), 0) AS income,
  COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'EXPENSE'), 0) AS expenses,
  COALESCE(SUM(ABS(amount)) FILTER (
    WHERE movement = 'TRANSFER' AND category = 'to_investment'
  ), 0) AS sent_to_invest,
  COUNT(*) AS tx_count
FROM transactions
WHERE is_hidden = false
GROUP BY user_id, domain, date;

CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_totals_pk
  ON mv_daily_totals (user_id, domain, day);

--------------------------------------------------------------------------------
-- 2. mv_opening_balances — pre-computed monthly opening balances
--    Eliminates the expensive full-scan + window function.
--------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_opening_balances AS
WITH ranked AS (
  SELECT
    user_id,
    domain,
    to_char(date, 'YYYY-MM') AS month,
    account_id,
    running_balance,
    amount,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, domain, to_char(date, 'YYYY-MM'), account_id
      ORDER BY date ASC, created_at ASC
    ) AS rn
  FROM transactions
  WHERE is_hidden = false
    AND running_balance IS NOT NULL
)
SELECT
  user_id,
  domain,
  month,
  ROUND(SUM(running_balance - amount), 2) AS opening_balance
FROM ranked
WHERE rn = 1
GROUP BY user_id, domain, month;

CREATE UNIQUE INDEX IF NOT EXISTS mv_opening_balances_pk
  ON mv_opening_balances (user_id, domain, month);

--------------------------------------------------------------------------------
-- 3. refresh_dashboard_views — called after bulk data changes
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_totals;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_opening_balances;
END;
$$;

--------------------------------------------------------------------------------
-- 4. Rewrite get_monthly_series to read from mv_daily_totals
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_series(
  p_user_id     uuid,
  p_domain      public.app_domain,
  p_start_month text DEFAULT NULL,
  p_end_month   text DEFAULT NULL
)
RETURNS TABLE(
  month          text,
  income         numeric,
  expenses       numeric,
  balance        numeric,
  sent_to_invest numeric
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    to_char(d.day, 'YYYY-MM') AS month,
    ROUND(SUM(d.income), 2)   AS income,
    ROUND(SUM(d.expenses), 2) AS expenses,
    ROUND(SUM(d.income) - SUM(d.expenses), 2) AS balance,
    ROUND(SUM(d.sent_to_invest), 2) AS sent_to_invest
  FROM mv_daily_totals d
  WHERE d.user_id = p_user_id
    AND d.domain  = p_domain
    AND (p_start_month IS NULL OR to_char(d.day, 'YYYY-MM') >= p_start_month)
    AND (p_end_month   IS NULL OR to_char(d.day, 'YYYY-MM') <= p_end_month)
  GROUP BY to_char(d.day, 'YYYY-MM')
  ORDER BY month ASC;
$$;

--------------------------------------------------------------------------------
-- 5. Rewrite get_period_series to read from mv_daily_totals
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_period_series(
  p_user_id     uuid,
  p_domain      public.app_domain,
  p_granularity text DEFAULT 'month'
)
RETURNS TABLE(
  period         text,
  income         numeric,
  expenses       numeric,
  balance        numeric,
  sent_to_invest numeric
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE p_granularity
      WHEN 'week' THEN to_char(date_trunc('week', d.day), 'YYYY-MM-DD')
      WHEN 'year' THEN to_char(d.day, 'YYYY')
      ELSE to_char(d.day, 'YYYY-MM')
    END AS period,
    ROUND(SUM(d.income), 2)   AS income,
    ROUND(SUM(d.expenses), 2) AS expenses,
    ROUND(SUM(d.income) - SUM(d.expenses), 2) AS balance,
    ROUND(SUM(d.sent_to_invest), 2) AS sent_to_invest
  FROM mv_daily_totals d
  WHERE d.user_id = p_user_id
    AND d.domain  = p_domain
  GROUP BY
    CASE p_granularity
      WHEN 'week' THEN to_char(date_trunc('week', d.day), 'YYYY-MM-DD')
      WHEN 'year' THEN to_char(d.day, 'YYYY')
      ELSE to_char(d.day, 'YYYY-MM')
    END
  ORDER BY period ASC;
$$;

--------------------------------------------------------------------------------
-- 6. Rewrite get_opening_balances to read from mv_opening_balances
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain
)
RETURNS TABLE(
  month           text,
  opening_balance numeric
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ob.month,
    ob.opening_balance
  FROM mv_opening_balances ob
  WHERE ob.user_id = p_user_id
    AND ob.domain  = p_domain
  ORDER BY ob.month;
$$;

--------------------------------------------------------------------------------
-- 7. get_dashboard_aggregates — consolidated RPC
--    Replaces 5 separate RPCs with a single JSONB return.
--    One CTE-based scan of transactions for the date range.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_aggregates(
  p_user_id    uuid,
  p_domain     public.app_domain,
  p_start_date date,
  p_end_date   date,
  p_prev_start date DEFAULT NULL,
  p_prev_end   date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'daily_totals', COALESCE((
      SELECT jsonb_agg(row_to_json(dt) ORDER BY dt.day)
      FROM (
        SELECT
          t.date AS day,
          COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'INCOME'), 0) AS income,
          COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'EXPENSE'), 0) AS expenses,
          COUNT(*) AS tx_count
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND t.date BETWEEN p_start_date AND p_end_date
        GROUP BY t.date
      ) dt
    ), '[]'::jsonb),

    'expense_categories', COALESCE((
      SELECT jsonb_agg(row_to_json(ec) ORDER BY ec.total DESC)
      FROM (
        SELECT
          t.category,
          COALESCE(SUM(ABS(t.amount)), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND t.date BETWEEN p_start_date AND p_end_date
          AND t.movement = 'EXPENSE'
        GROUP BY t.category
      ) ec
    ), '[]'::jsonb),

    'income_categories', COALESCE((
      SELECT jsonb_agg(row_to_json(ic) ORDER BY ic.total DESC)
      FROM (
        SELECT
          t.category,
          COALESCE(SUM(ABS(t.amount)), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND t.date BETWEEN p_start_date AND p_end_date
          AND t.movement = 'INCOME'
        GROUP BY t.category
      ) ic
    ), '[]'::jsonb),

    'prev_expense_categories', CASE
      WHEN p_prev_start IS NOT NULL AND p_prev_end IS NOT NULL THEN
        COALESCE((
          SELECT jsonb_agg(row_to_json(pec) ORDER BY pec.total DESC)
          FROM (
            SELECT
              t.category,
              COALESCE(SUM(ABS(t.amount)), 0) AS total
            FROM transactions t
            WHERE t.user_id = p_user_id
              AND t.domain = p_domain
              AND t.is_hidden = false
              AND t.date BETWEEN p_prev_start AND p_prev_end
              AND t.movement = 'EXPENSE'
            GROUP BY t.category
          ) pec
        ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END,

    'top_expenses', COALESCE((
      SELECT jsonb_agg(row_to_json(te))
      FROM (
        SELECT
          t.id,
          COALESCE(t.description_norm, t.description) AS description,
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
        LIMIT 5
      ) te
    ), '[]'::jsonb),

    'essential_split', COALESCE((
      SELECT jsonb_agg(row_to_json(es) ORDER BY es.total DESC)
      FROM (
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
      ) es
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
