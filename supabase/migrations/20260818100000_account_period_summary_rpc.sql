-- get_account_period_summary: per-account balance + tx count for a date range.
-- Returns the latest running_balance (end-of-period balance) when available,
-- otherwise falls back to net flow. Used by AccountsStackCard to avoid
-- loading all transactions client-side.
CREATE OR REPLACE FUNCTION public.get_account_period_summary(
  p_user_id   uuid,
  p_start     date,
  p_end       date
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
    SELECT t.account_id, t.amount, t.movement, t.running_balance, t.date
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
  ),
  latest_rb AS (
    SELECT DISTINCT ON (account_id)
      account_id,
      running_balance
    FROM period_txs
    WHERE running_balance IS NOT NULL
    ORDER BY account_id, date DESC
  )
  SELECT
    pt.account_id,
    ROUND(COALESCE(
      lr.running_balance,
      SUM(CASE WHEN pt.movement = 'EXPENSE' THEN -ABS(pt.amount) ELSE ABS(pt.amount) END)
    ), 2) AS latest_balance,
    (lr.running_balance IS NOT NULL) AS has_running_balance,
    COUNT(*) AS tx_count
  FROM period_txs pt
  LEFT JOIN latest_rb lr ON lr.account_id = pt.account_id
  GROUP BY pt.account_id, lr.running_balance;
$$;
