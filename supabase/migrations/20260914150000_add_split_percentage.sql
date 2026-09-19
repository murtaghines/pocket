-- Add split_percentage to accounts for joint account support.
-- Default 100 means "100% mine" (no split). JOINT accounts typically use 50.
-- All dashboard aggregation RPCs and materialized views are updated to multiply
-- transaction amounts by (split_percentage / 100.0) so the user sees only their share.

------------------------------------------------------------------------
-- 1. Add the column
------------------------------------------------------------------------
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS split_percentage smallint NOT NULL DEFAULT 100;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_split_percentage_range
  CHECK (split_percentage > 0 AND split_percentage <= 100);

------------------------------------------------------------------------
-- 2. Recreate mv_daily_totals with split applied
------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_daily_totals CASCADE;

CREATE MATERIALIZED VIEW mv_daily_totals AS
SELECT
  t.user_id,
  t.domain,
  t.date AS day,
  EXTRACT(YEAR FROM t.date)::smallint AS year,
  TO_CHAR(t.date, 'YYYY-MM') AS month,
  TO_CHAR(t.date, 'IYYY') || '-W' || LPAD(EXTRACT(WEEK FROM t.date)::text, 2, '0') AS week,
  COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
    FILTER (WHERE t.movement = 'INCOME'), 0) AS income,
  COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
    FILTER (WHERE t.movement = 'EXPENSE'), 0) AS expenses,
  COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
    FILTER (WHERE t.movement = 'TRANSFER' AND t.category = 'to_investment'), 0) AS sent_to_invest,
  COUNT(*) AS tx_count
FROM transactions t
LEFT JOIN accounts a ON a.id = t.account_id
WHERE t.is_hidden = false
GROUP BY t.user_id, t.domain, t.date;

CREATE UNIQUE INDEX mv_daily_totals_pk
  ON mv_daily_totals (user_id, domain, day);

------------------------------------------------------------------------
-- 3. Recreate mv_opening_balances with split applied
------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_opening_balances CASCADE;

CREATE MATERIALIZED VIEW mv_opening_balances AS
WITH ranked AS (
  SELECT
    t.user_id,
    t.domain,
    to_char(t.date, 'YYYY-MM') AS month,
    t.account_id,
    t.running_balance,
    t.amount,
    COALESCE(a.split_percentage, 100) AS split_pct,
    ROW_NUMBER() OVER (
      PARTITION BY t.user_id, t.domain, to_char(t.date, 'YYYY-MM'), t.account_id
      ORDER BY t.date ASC, t.created_at ASC
    ) AS rn
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.is_hidden = false
    AND t.running_balance IS NOT NULL
)
SELECT
  user_id,
  domain,
  month,
  ROUND(SUM((running_balance - amount) * split_pct / 100.0), 2) AS opening_balance
FROM ranked
WHERE rn = 1
GROUP BY user_id, domain, month;

CREATE UNIQUE INDEX mv_opening_balances_pk
  ON mv_opening_balances (user_id, domain, month);

------------------------------------------------------------------------
-- 4. Recreate refresh_dashboard_views (CASCADE dropped it)
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
-- 5. Rewrite get_monthly_series (reads from mv_daily_totals — already split)
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
-- 6. Rewrite get_period_series (reads from mv_daily_totals — already split)
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
-- 7. Rewrite get_opening_balances (reads from mv_opening_balances — already split)
------------------------------------------------------------------------
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
  SELECT ob.month, ob.opening_balance
  FROM mv_opening_balances ob
  WHERE ob.user_id = p_user_id
    AND ob.domain  = p_domain
  ORDER BY ob.month;
$$;

------------------------------------------------------------------------
-- 8. Rewrite get_dashboard_aggregates with split (reads directly from transactions)
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
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
            FILTER (WHERE t.movement = 'INCOME'), 0) AS income,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
            FILTER (WHERE t.movement = 'EXPENSE'), 0) AS expenses,
          COUNT(*) AS tx_count
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
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
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
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
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
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
              COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total
            FROM transactions t
            LEFT JOIN accounts a ON a.id = t.account_id
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
          ROUND(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0, 2) AS amount,
          t.category
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
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
        ORDER BY ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0 DESC
        LIMIT 10
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
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
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

------------------------------------------------------------------------
-- 9. Rewrite get_dashboard_summary with split
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_user_id uuid,
  p_domain  public.app_domain,
  p_month_key text
)
RETURNS TABLE(
  income         numeric,
  expenses       numeric,
  balance        numeric,
  sent_to_invest numeric,
  tx_count       bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'INCOME'), 0) AS income,
    COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'EXPENSE'), 0) AS expenses,
    COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'INCOME'), 0)
    - COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'EXPENSE'), 0) AS balance,
    COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'TRANSFER' AND t.category = 'to_investment'), 0)
      AS sent_to_invest,
    COUNT(*) AS tx_count
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id   = p_user_id
    AND t.domain     = p_domain
    AND t.is_hidden  = false
    AND to_char(t.date, 'YYYY-MM') = p_month_key;
$$;

------------------------------------------------------------------------
-- 10. Rewrite get_category_breakdown with split
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_category_breakdown(
  p_user_id   uuid,
  p_domain    public.app_domain,
  p_month_key text,
  p_movement  public.movement_type
)
RETURNS TABLE(
  category text,
  total    numeric,
  tx_count bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    t.category,
    ROUND(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 2) AS total,
    COUNT(*) AS tx_count
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id   = p_user_id
    AND t.domain     = p_domain
    AND t.is_hidden  = false
    AND t.movement   = p_movement
    AND to_char(t.date, 'YYYY-MM') = p_month_key
  GROUP BY t.category
  ORDER BY total DESC;
$$;

------------------------------------------------------------------------
-- 11. Rewrite get_account_breakdown with split
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_account_breakdown(
  p_user_id   uuid,
  p_domain    public.app_domain,
  p_month_key text
)
RETURNS TABLE(
  account_id  uuid,
  account_name text,
  institution  text,
  total        numeric,
  tx_count     bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    a.id           AS account_id,
    a.name         AS account_name,
    a.institution,
    ROUND(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 2) AS total,
    COUNT(*)       AS tx_count
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id   = p_user_id
    AND t.domain     = p_domain
    AND t.is_hidden  = false
    AND t.movement   = 'EXPENSE'
    AND to_char(t.date, 'YYYY-MM') = p_month_key
  GROUP BY a.id, a.name, a.institution
  ORDER BY total DESC;
$$;

------------------------------------------------------------------------
-- 12. Rewrite get_account_period_summary with split
------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_account_period_summary(uuid, date, date, public.app_domain);

CREATE OR REPLACE FUNCTION public.get_account_period_summary(
  p_user_id   uuid,
  p_start     date,
  p_end       date,
  p_domain    public.app_domain DEFAULT 'CASHFLOW'
)
RETURNS TABLE(
  account_id          uuid,
  latest_balance      numeric,
  has_running_balance boolean,
  tx_count            bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH period_txs AS (
    SELECT t.account_id, t.amount, t.movement, t.running_balance, t.date,
           COALESCE(a.split_percentage, 100) AS split_pct
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
  ),
  latest_rb AS (
    SELECT DISTINCT ON (account_id)
      account_id,
      running_balance,
      split_pct
    FROM period_txs
    WHERE running_balance IS NOT NULL
    ORDER BY account_id, date DESC
  )
  SELECT
    pt.account_id,
    ROUND(COALESCE(
      lr.running_balance * lr.split_pct / 100.0,
      SUM(CASE WHEN pt.movement = 'EXPENSE' THEN -ABS(pt.amount) ELSE ABS(pt.amount) END
        * pt.split_pct / 100.0)
    ), 2) AS latest_balance,
    (lr.running_balance IS NOT NULL) AS has_running_balance,
    COUNT(*) AS tx_count
  FROM period_txs pt
  LEFT JOIN latest_rb lr ON lr.account_id = pt.account_id
  GROUP BY pt.account_id, lr.running_balance, lr.split_pct;
$$;

------------------------------------------------------------------------
-- 13. Refresh materialized views to pick up the new column
------------------------------------------------------------------------
SELECT refresh_dashboard_views();
