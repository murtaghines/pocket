-- Fix get_account_period_summary: closing balance was wrong for accounts
-- without running_balance (all manual transactions).
--
-- Before: fallback returned only the period's net flow (income - expenses),
--         missing initial_balance + prior months' cumulative amounts.
--         Also used ABS() on transfers, flipping outgoing transfers positive.
--
-- After:  fallback computes initial_balance + SUM(all amounts up to p_end),
--         using raw signed amounts so transfers keep their natural sign.
--         This gives the true account balance at the end of any period —
--         the same "foto" regardless of whether you view month, week or year.

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
  WITH active_accounts AS (
    -- Accounts with at least one visible transaction in the period
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
  latest_rb AS (
    -- Last running_balance within the period (from bank-imported statements)
    SELECT DISTINCT ON (t.account_id)
      t.account_id,
      t.running_balance
    FROM transactions t
    WHERE t.user_id   = p_user_id
      AND t.domain    = p_domain
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
      AND t.running_balance IS NOT NULL
    ORDER BY t.account_id, t.date DESC, t.created_at DESC
  ),
  cumulative AS (
    -- Sum of ALL signed amounts from the beginning up to p_end
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
      CASE
        WHEN lr.running_balance IS NOT NULL
          THEN lr.running_balance * COALESCE(a.split_percentage, 100) / 100.0
        ELSE (COALESCE(a.initial_balance, 0) + COALESCE(c.total, 0))
             * COALESCE(a.split_percentage, 100) / 100.0
      END
    , 2) AS latest_balance,
    (lr.running_balance IS NOT NULL) AS has_running_balance,
    pc.cnt AS tx_count
  FROM active_accounts aa
  JOIN accounts a ON a.id = aa.account_id
  LEFT JOIN latest_rb lr ON lr.account_id = aa.account_id
  LEFT JOIN cumulative c ON c.account_id = aa.account_id
  LEFT JOIN period_counts pc ON pc.account_id = aa.account_id;
$$;
