-- Unified opening balance: integrate initial_balance fallback + point-in-time RPC.
--
-- Before this migration, mv_opening_balances only considered transactions with
-- running_balance IS NOT NULL, so accounts that lack running_balance (manual entries,
-- some bank formats) contributed nothing to the opening balance. Now:
--   1) Accounts WITH running_balance: first tx of month → running_balance - amount
--   2) Accounts WITHOUT running_balance: initial_balance + cumulative prior amounts
--
-- Also adds get_balance_at_date() for point-in-time queries (week view, custom ranges).

------------------------------------------------------------------------
-- 1. Recreate mv_opening_balances with initial_balance fallback
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
  WHERE t.is_hidden = false
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
  WHERE t.is_hidden = false
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
-- 2. Recreate refresh_dashboard_views (CASCADE dropped it)
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
-- 3. Recreate get_opening_balances (CASCADE dropped it)
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
-- 4. New: point-in-time balance for any date
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
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND t.date < p_date
  ),
  latest_rb AS (
    SELECT DISTINCT ON (account_id)
      account_id, running_balance
    FROM prior
    WHERE running_balance IS NOT NULL
    ORDER BY account_id, date DESC, created_at DESC
  ),
  sum_before AS (
    SELECT account_id, SUM(amount) AS total
    FROM prior
    GROUP BY account_id
  ),
  active AS (
    SELECT DISTINCT t.account_id
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
  )
  SELECT COALESCE(ROUND(SUM(
    CASE
      WHEN lr.running_balance IS NOT NULL
        THEN lr.running_balance * COALESCE(a.split_percentage, 100) / 100.0
      ELSE (COALESCE(a.initial_balance, 0) + COALESCE(sb.total, 0))
           * COALESCE(a.split_percentage, 100) / 100.0
    END
  ), 2), 0)
  FROM active aa
  JOIN accounts a ON a.id = aa.account_id
  LEFT JOIN latest_rb lr ON lr.account_id = aa.account_id
  LEFT JOIN sum_before sb ON sb.account_id = aa.account_id;
$$;

------------------------------------------------------------------------
-- 5. Refresh to pick up changes
------------------------------------------------------------------------
SELECT refresh_dashboard_views();
