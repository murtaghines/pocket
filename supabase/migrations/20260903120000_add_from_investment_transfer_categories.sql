-- Add from_investment and from_joint_account transfer categories.
-- These capture money flowing BACK from investments or joint accounts
-- (positive amounts on transfers to investment/joint platforms).
--
-- The sent_to_invest KPI now shows NET invested: to_investment - from_investment.
-- This prevents the dashboard from inflating investment numbers when a user
-- liquidates part of their portfolio.

--------------------------------------------------------------------------------
-- 1. Recreate mv_daily_totals with net sent_to_invest (to - from)
--------------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_daily_totals CASCADE;

CREATE MATERIALIZED VIEW mv_daily_totals AS
SELECT
  user_id,
  domain,
  date AS day,
  COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'INCOME'), 0) AS income,
  COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'EXPENSE'), 0) AS expenses,
  GREATEST(
    -COALESCE(SUM(amount) FILTER (
      WHERE movement = 'TRANSFER' AND category IN ('to_investment', 'from_investment')
    ), 0),
    0
  ) AS sent_to_invest,
  COUNT(*) AS tx_count
FROM transactions
WHERE is_hidden = false
GROUP BY user_id, domain, date;

CREATE UNIQUE INDEX mv_daily_totals_pk
  ON mv_daily_totals (user_id, domain, day);

--------------------------------------------------------------------------------
-- 2. Recreate RPCs that were dropped by CASCADE
--------------------------------------------------------------------------------

-- get_monthly_series
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

-- get_period_series
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

-- get_dashboard_aggregates
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

-- get_dashboard_summary
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
    COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'INCOME'), 0)
      AS income,
    COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'EXPENSE'), 0)
      AS expenses,
    COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'INCOME'), 0)
      - COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'EXPENSE'), 0)
      AS balance,
    GREATEST(
      -COALESCE(SUM(amount) FILTER (WHERE movement = 'TRANSFER' AND category IN ('to_investment', 'from_investment')), 0),
      0
    ) AS sent_to_invest,
    COUNT(*)
      AS tx_count
  FROM transactions
  WHERE user_id    = p_user_id
    AND domain     = p_domain
    AND is_hidden  = false
    AND to_char(date, 'YYYY-MM') = p_month_key;
$$;
