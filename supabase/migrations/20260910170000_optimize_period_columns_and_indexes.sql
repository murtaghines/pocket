-- Fix index collision + optimize queries to use pre-computed period columns.
--
-- Problems found during audit:
--   1. idx_transactions_user_month name collision — (user_id, month) was never created
--   2. New indexes lack `domain`, but all RPCs filter by (user_id, domain, ...)
--   3. get_dashboard_aggregates still uses date BETWEEN instead of period columns
--   4. get_period_series uses to_char() per-row instead of pre-computed columns
--   5. mv_daily_totals lacks period columns

------------------------------------------------------------------------
-- 1. Fix indexes: drop the three period indexes and recreate with
--    domain + proper names that don't collide.
------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_transactions_user_year;
DROP INDEX IF EXISTS idx_transactions_user_week;
-- idx_transactions_user_month stays — it's the useful (user_id, domain, date) partial index

CREATE INDEX IF NOT EXISTS idx_transactions_period_year
  ON transactions (user_id, domain, year)
  WHERE is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_transactions_period_month
  ON transactions (user_id, domain, month)
  WHERE is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_transactions_period_week
  ON transactions (user_id, domain, week)
  WHERE is_hidden = false;

------------------------------------------------------------------------
-- 2. Add period columns to mv_daily_totals so get_period_series can
--    GROUP BY them instead of recomputing to_char() per row.
------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_daily_totals CASCADE;

CREATE MATERIALIZED VIEW mv_daily_totals AS
SELECT
  user_id,
  domain,
  date AS day,
  EXTRACT(YEAR FROM date)::smallint AS year,
  TO_CHAR(date, 'YYYY-MM') AS month,
  TO_CHAR(date, 'IYYY') || '-W' || LPAD(EXTRACT(WEEK FROM date)::text, 2, '0') AS week,
  COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'INCOME'), 0) AS income,
  COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'EXPENSE'), 0) AS expenses,
  COALESCE(SUM(ABS(amount)) FILTER (
    WHERE movement = 'TRANSFER' AND category = 'to_investment'
  ), 0) AS sent_to_invest,
  COUNT(*) AS tx_count
FROM transactions
WHERE is_hidden = false
GROUP BY user_id, domain, date;

CREATE UNIQUE INDEX mv_daily_totals_pk
  ON mv_daily_totals (user_id, domain, day);

------------------------------------------------------------------------
-- 3. Recreate refresh_dashboard_views (CASCADE dropped it)
------------------------------------------------------------------------
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

------------------------------------------------------------------------
-- 4. Rewrite get_period_series to GROUP BY pre-computed columns
------------------------------------------------------------------------
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
      WHEN 'year' THEN d.year::text
      ELSE d.month
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
      WHEN 'year' THEN d.year::text
      ELSE d.month
    END
  ORDER BY period ASC;
$$;

------------------------------------------------------------------------
-- 5. Rewrite get_monthly_series to use month column
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_series(
  p_user_id    uuid,
  p_domain     public.app_domain,
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
    d.month,
    ROUND(SUM(d.income), 2)   AS income,
    ROUND(SUM(d.expenses), 2) AS expenses,
    ROUND(SUM(d.income) - SUM(d.expenses), 2) AS balance,
    ROUND(SUM(d.sent_to_invest), 2) AS sent_to_invest
  FROM mv_daily_totals d
  WHERE d.user_id = p_user_id
    AND d.domain  = p_domain
    AND (p_start_month IS NULL OR d.month >= p_start_month)
    AND (p_end_month IS NULL OR d.month <= p_end_month)
  GROUP BY d.month
  ORDER BY d.month ASC;
$$;

------------------------------------------------------------------------
-- 6. Rewrite get_dashboard_aggregates to use period columns when the
--    caller's range aligns to a full month/week/year.
--    Accepts optional p_month/p_week/p_year — when set, filters by
--    equality on the indexed column instead of date BETWEEN.
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_aggregates(
  p_user_id    uuid,
  p_domain     public.app_domain,
  p_start_date date,
  p_end_date   date,
  p_prev_start date DEFAULT NULL,
  p_prev_end   date DEFAULT NULL,
  p_month      text DEFAULT NULL,
  p_week       text DEFAULT NULL,
  p_year       smallint DEFAULT NULL
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
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
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
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
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
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
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
          COALESCE(t.description, t.description_norm) AS description,
          t.date,
          ABS(t.amount) AS amount,
          t.category
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
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
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'EXPENSE'
        GROUP BY t.category
      ) es
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
