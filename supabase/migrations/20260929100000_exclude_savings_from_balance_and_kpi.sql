-- Exclude savings accounts from dashboard balance totals and fix the
-- "Invested & saved" KPI double-counting when both sides of a savings
-- transfer are uploaded (checking + savings account).
--
-- Problem 1 — KPI: mv_daily_totals.sent_to_invest sums ALL transactions
--   tagged to_savings/from_savings, including those on the savings account
--   itself.  When the user uploads both checking and savings statements the
--   opposite-sign entries cancel out, making the KPI read 0.  Fix: only
--   count savings-category transfers from non-SAVINGS accounts.
--
-- Problem 2 — Balance: mv_opening_balances, get_balance_at_date and the
--   frontend closing-balance query all include SAVINGS accounts.  The user
--   wants the dashboard totals to reflect *available* (operational) money
--   only.  Fix: exclude account_type = 'SAVINGS' from the MVs and
--   point-in-time RPC; the frontend mirrors this for closing balance.

------------------------------------------------------------------------
-- 1. Recreate mv_daily_totals — savings KPI excludes savings accounts
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
  GREATEST(
    -COALESCE(SUM(t.amount * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'TRANSFER'
              AND (
                t.category IN ('to_investment', 'from_investment')
                OR (t.category IN ('to_savings', 'from_savings')
                    AND a.account_type IS DISTINCT FROM 'SAVINGS')
              )), 0),
    0
  ) AS sent_to_invest,
  COUNT(*) AS tx_count
FROM transactions t
LEFT JOIN accounts a ON a.id = t.account_id
WHERE t.is_hidden = false
GROUP BY t.user_id, t.domain, t.date;

CREATE UNIQUE INDEX mv_daily_totals_pk
  ON mv_daily_totals (user_id, domain, day);

------------------------------------------------------------------------
-- 2. Recreate mv_opening_balances — exclude SAVINGS accounts
------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_opening_balances CASCADE;

CREATE MATERIALIZED VIEW mv_opening_balances AS
WITH first_tx AS (
  SELECT DISTINCT ON (t.user_id, t.domain, to_char(t.date, 'YYYY-MM'), t.account_id)
    t.user_id,
    t.domain,
    to_char(t.date, 'YYYY-MM') AS month,
    t.account_id,
    t.running_balance,
    t.amount
  FROM transactions t
  JOIN accounts acct ON acct.id = t.account_id
  WHERE t.is_hidden = false
    AND acct.account_type IS DISTINCT FROM 'SAVINGS'
  ORDER BY t.user_id, t.domain, to_char(t.date, 'YYYY-MM'), t.account_id,
           t.date ASC, t.created_at ASC
),
monthly_totals AS (
  SELECT
    t.user_id, t.domain,
    to_char(t.date, 'YYYY-MM') AS month,
    t.account_id,
    SUM(t.amount) AS month_total
  FROM transactions t
  JOIN accounts acct ON acct.id = t.account_id
  WHERE t.is_hidden = false
    AND acct.account_type IS DISTINCT FROM 'SAVINGS'
  GROUP BY t.user_id, t.domain, to_char(t.date, 'YYYY-MM'), t.account_id
),
cumulative AS (
  SELECT
    user_id, domain, month, account_id,
    COALESCE(SUM(month_total) OVER (
      PARTITION BY user_id, domain, account_id
      ORDER BY month
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS sum_before
  FROM monthly_totals
)
SELECT
  ft.user_id,
  ft.domain,
  ft.month,
  ROUND(SUM(
    CASE
      WHEN ft.running_balance IS NOT NULL
        THEN (ft.running_balance - ft.amount) * COALESCE(a.split_percentage, 100) / 100.0
      ELSE (COALESCE(a.initial_balance, 0) + c.sum_before)
           * COALESCE(a.split_percentage, 100) / 100.0
    END
  ), 2) AS opening_balance
FROM first_tx ft
JOIN accounts a ON a.id = ft.account_id
LEFT JOIN cumulative c
  ON  c.user_id    = ft.user_id
  AND c.domain     = ft.domain
  AND c.month      = ft.month
  AND c.account_id = ft.account_id
GROUP BY ft.user_id, ft.domain, ft.month;

CREATE UNIQUE INDEX mv_opening_balances_pk
  ON mv_opening_balances (user_id, domain, month);

------------------------------------------------------------------------
-- 3. Fix get_balance_at_date — exclude SAVINGS accounts
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_balance_at_date(
  p_user_id uuid,
  p_domain  public.app_domain,
  p_date    date
)
RETURNS numeric
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH prior AS (
    SELECT t.account_id, t.amount, t.running_balance, t.date, t.created_at
    FROM transactions t
    JOIN accounts acct ON acct.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND t.date < p_date
      AND acct.account_type IS DISTINCT FROM 'SAVINGS'
  ),
  latest_rb AS (
    SELECT DISTINCT ON (account_id)
      account_id, running_balance, date AS rb_date, created_at AS rb_created_at
    FROM prior
    WHERE running_balance IS NOT NULL
    ORDER BY account_id, date DESC, created_at DESC
  ),
  post_rb AS (
    SELECT p.account_id, SUM(p.amount) AS extra
    FROM prior p
    JOIN latest_rb lr ON lr.account_id = p.account_id
    WHERE p.running_balance IS NULL
      AND (p.date > lr.rb_date
           OR (p.date = lr.rb_date AND p.created_at > lr.rb_created_at))
    GROUP BY p.account_id
  ),
  sum_before AS (
    SELECT account_id, SUM(amount) AS total
    FROM prior
    GROUP BY account_id
  ),
  active AS (
    SELECT DISTINCT account_id FROM prior
  )
  SELECT COALESCE(ROUND(SUM(
    CASE
      WHEN lr.running_balance IS NOT NULL
        THEN (lr.running_balance + COALESCE(prb.extra, 0))
             * COALESCE(a.split_percentage, 100) / 100.0
      ELSE (COALESCE(a.initial_balance, 0) + COALESCE(sb.total, 0))
           * COALESCE(a.split_percentage, 100) / 100.0
    END
  ), 2), 0)
  FROM active aa
  JOIN accounts a ON a.id = aa.account_id
  LEFT JOIN latest_rb lr ON lr.account_id = aa.account_id
  LEFT JOIN post_rb prb ON prb.account_id = aa.account_id
  LEFT JOIN sum_before sb ON sb.account_id = aa.account_id;
$$;

------------------------------------------------------------------------
-- 4. Recreate refresh_dashboard_views — SECURITY DEFINER
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_totals;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_opening_balances;
END;
$$;

------------------------------------------------------------------------
-- 5. Recreate functions dropped by CASCADE on mv_daily_totals
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
-- 6. Recreate get_opening_balances (dropped by CASCADE on mv_opening_balances)
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain
)
RETURNS TABLE(month text, opening_balance numeric)
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
-- 7. Refresh views to pick up all changes
------------------------------------------------------------------------
SELECT refresh_dashboard_views();
