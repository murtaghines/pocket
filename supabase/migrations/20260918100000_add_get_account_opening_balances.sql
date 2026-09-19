-- Per-account opening balances for a given month.
-- Used by the MyData transaction editor to group transactions by account
-- and show per-account running balances.

CREATE OR REPLACE FUNCTION public.get_account_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain,
  p_month   text  -- 'YYYY-MM' format
)
RETURNS TABLE(account_id uuid, opening_balance numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH first_tx AS (
    SELECT DISTINCT ON (t.account_id)
      t.account_id,
      t.running_balance,
      t.amount
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND to_char(t.date, 'YYYY-MM') = p_month
    ORDER BY t.account_id, t.date ASC, t.created_at ASC
  ),
  prior_totals AS (
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
      CASE
        WHEN ft.running_balance IS NOT NULL
          THEN (ft.running_balance - ft.amount) * COALESCE(a.split_percentage, 100) / 100.0
        ELSE (COALESCE(a.initial_balance, 0) + COALESCE(pt.total_before, 0))
             * COALESCE(a.split_percentage, 100) / 100.0
      END
    , 2) AS opening_balance
  FROM active aa
  JOIN accounts a ON a.id = aa.account_id
  LEFT JOIN first_tx ft ON ft.account_id = aa.account_id
  LEFT JOIN prior_totals pt ON pt.account_id = aa.account_id;
$$;
