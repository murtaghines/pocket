-- Consolidated dashboard KPI fix. Supersedes 20261002100000, 20261003100000 and 20261004100000,
-- which were never applied to production and contradicted each other: 20261004100000 rebuilt
-- mv_daily_totals from the pre-fix definition and so reintroduced the per-day GREATEST(0) clamp
-- that 20261002100000 removed.
--
-- Final intent (both goals kept):
--   * mv_daily_totals excludes SAVINGS accounts entirely (20261004100000)
--   * mv_daily_totals stores the raw signed net per day for sent_to_invest; the GREATEST(0)
--     clamp happens at period level in get_monthly_series / get_period_series (20261002100000)
--   * get_account_period_summary computes balances deterministically (20261003100000)
-- mv_opening_balances is left untouched: production already has the cumulative fix.

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
  -COALESCE(SUM(t.amount * COALESCE(a.split_percentage, 100) / 100.0)
    FILTER (WHERE t.movement = 'TRANSFER'
            AND t.category IN ('to_investment', 'from_investment',
                               'to_savings', 'from_savings')), 0) AS sent_to_invest,
  COUNT(*) AS tx_count
FROM transactions t
LEFT JOIN accounts a ON a.id = t.account_id
WHERE t.is_hidden = false
  AND a.account_type IS DISTINCT FROM 'SAVINGS'
GROUP BY t.user_id, t.domain, t.date;

CREATE UNIQUE INDEX mv_daily_totals_pk
  ON mv_daily_totals (user_id, domain, day);

----
-- 4. Recreate get_monthly_series — GREATEST at period level
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
    ROUND(GREATEST(SUM(d.sent_to_invest), 0), 2) AS sent_to_invest
  FROM mv_daily_totals d
  WHERE d.user_id = p_user_id
    AND d.domain  = p_domain
    AND (p_start_month IS NULL OR d.month >= p_start_month)
    AND (p_end_month IS NULL OR d.month <= p_end_month)
  GROUP BY d.month
  ORDER BY d.month ASC;
$$;

------------------------------------------------------------------------
-- 5. Recreate get_period_series — GREATEST at period level
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
    ROUND(GREATEST(SUM(d.sent_to_invest), 0), 2) AS sent_to_invest
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

--------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_account_period_summary(uuid, date, date, public.app_domain);

CREATE OR REPLACE FUNCTION public.get_account_period_summary(
  p_user_id uuid,
  p_start   date,
  p_end     date,
  p_domain  app_domain DEFAULT 'CASHFLOW'
)
RETURNS TABLE(
  account_id          uuid,
  latest_balance      numeric,
  has_running_balance boolean,
  tx_count            bigint
)
LANGUAGE sql STABLE
SET search_path = 'public'
AS $function$
  WITH active_accounts AS (
    SELECT DISTINCT t.account_id
    FROM transactions t
    WHERE t.user_id   = p_user_id
      AND t.domain    = p_domain
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
  ),
  period_counts AS (
    SELECT t.account_id, COUNT(*) AS cnt
    FROM transactions t
    WHERE t.user_id   = p_user_id
      AND t.domain    = p_domain
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
    GROUP BY t.account_id
  ),
  has_rb AS (
    SELECT DISTINCT t.account_id
    FROM transactions t
    WHERE t.user_id   = p_user_id
      AND t.domain    = p_domain
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
      AND t.running_balance IS NOT NULL
  ),
  cumulative AS (
    SELECT t.account_id, SUM(t.amount) AS total
    FROM transactions t
    WHERE t.user_id   = p_user_id
      AND t.domain    = p_domain
      AND t.is_hidden = false
      AND t.date     <= p_end
      AND t.account_id IN (SELECT account_id FROM active_accounts)
    GROUP BY t.account_id
  )
  SELECT
    aa.account_id,
    ROUND(
      (COALESCE(a.initial_balance, 0) + COALESCE(c.total, 0))
      * COALESCE(a.split_percentage, 100) / 100.0
    , 2) AS latest_balance,
    (hr.account_id IS NOT NULL) AS has_running_balance,
    pc.cnt AS tx_count
  FROM active_accounts aa
  JOIN accounts a ON a.id = aa.account_id
  LEFT JOIN has_rb hr ON hr.account_id = aa.account_id
  LEFT JOIN cumulative c ON c.account_id = aa.account_id
  LEFT JOIN period_counts pc ON pc.account_id = aa.account_id;
$function$;


SELECT refresh_dashboard_views();
