-- Retroactively infer initial_balance for every account that has at least one
-- transaction with a running_balance.  Formula:
--     initial_balance = earliest_tx.running_balance − earliest_tx.amount
-- This is the same logic the process-import edge function now runs on every
-- import, but existing accounts imported before that code was deployed were
-- left at 0.  After this migration, refresh_dashboard_views() is called so
-- the materialized views pick up the corrected balances immediately.

WITH earliest AS (
  SELECT DISTINCT ON (t.account_id)
    t.account_id,
    t.running_balance,
    t.amount
  FROM transactions t
  WHERE t.running_balance IS NOT NULL
  ORDER BY t.account_id, t.date ASC, t.amount ASC
),
inferred AS (
  SELECT
    e.account_id,
    ROUND(e.running_balance - e.amount, 2) AS new_initial
  FROM earliest e
  WHERE (e.running_balance - e.amount) IS NOT NULL
    AND isfinite((e.running_balance - e.amount)::double precision)
)
UPDATE accounts a
SET initial_balance = i.new_initial
FROM inferred i
WHERE a.id = i.account_id
  AND COALESCE(a.initial_balance, 0) <> i.new_initial;

-- Refresh materialized views so dashboards reflect the corrected balances
SELECT refresh_dashboard_views();
