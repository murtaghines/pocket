-- Fix opening balance to always use cumulative method
--
-- Problem: mv_opening_balances and get_account_opening_balances use the
-- bank's running_balance when available (running_balance - amount), but
-- get_account_period_summary (closing) always uses the cumulative method
-- (initial_balance + SUM(amounts)).  When the bank's running_balance
-- diverges from our cumulative computation, opening + net_flow ≠ closing.
--
-- Fix: remove the running_balance branch from both the materialized view
-- and the per-account RPC, so opening and closing use the same method.
-- This guarantees opening + SUM(period tx * split%) = closing.

------------------------------------------------------------------------
-- 1. Recreate mv_opening_balances — cumulative only
------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_opening_balances CASCADE;

CREATE MATERIALIZED VIEW mv_opening_balances AS
WITH monthly_totals AS (
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
  c.user_id,
  c.domain,
  c.month,
  ROUND(SUM(
    (COALESCE(a.initial_balance, 0) + c.sum_before)
    * COALESCE(a.split_percentage, 100) / 100.0
  ), 2) AS opening_balance
FROM cumulative c
JOIN accounts a ON a.id = c.account_id
GROUP BY c.user_id, c.domain, c.month;

CREATE UNIQUE INDEX mv_opening_balances_pk
  ON mv_opening_balances (user_id, domain, month);

------------------------------------------------------------------------
-- 2. Fix get_account_opening_balances — cumulative only
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_account_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain DEFAULT 'CASHFLOW',
  p_month   text DEFAULT NULL
)
RETURNS TABLE(account_id uuid, opening_balance numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH prior_totals AS (
    SELECT
      t.account_id,
      SUM(t.amount) AS total_before
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND to_char(t.date, 'YYYY-MM') < p_month
    GROUP BY t.account_id
  ),
  active AS (
    SELECT DISTINCT t.account_id
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND to_char(t.date, 'YYYY-MM') = p_month
  )
  SELECT
    aa.account_id,
    ROUND(
      (COALESCE(a.initial_balance, 0) + COALESCE(pt.total_before, 0))
      * COALESCE(a.split_percentage, 100) / 100.0
    , 2) AS opening_balance
  FROM active aa
  JOIN accounts a ON a.id = aa.account_id
  LEFT JOIN prior_totals pt ON pt.account_id = aa.account_id;
$$;

------------------------------------------------------------------------
-- 3. Fix get_balance_at_date — cumulative only
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
  WITH sum_before AS (
    SELECT t.account_id, SUM(t.amount) AS total
    FROM transactions t
    JOIN accounts acct ON acct.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND t.date < p_date
      AND acct.account_type IS DISTINCT FROM 'SAVINGS'
    GROUP BY t.account_id
  )
  SELECT COALESCE(ROUND(SUM(
    (COALESCE(a.initial_balance, 0) + COALESCE(sb.total, 0))
    * COALESCE(a.split_percentage, 100) / 100.0
  ), 2), 0)
  FROM sum_before sb
  JOIN accounts a ON a.id = sb.account_id;
$$;

------------------------------------------------------------------------
-- 4. Refresh materialized views
------------------------------------------------------------------------
SELECT refresh_dashboard_views();
