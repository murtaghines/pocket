-- Fix get_account_period_summary: when multiple transactions share the same date
-- and created_at (bulk imports), DISTINCT ON picks an arbitrary running_balance,
-- sometimes an intermediate balance instead of the final end-of-day value.
--
-- Fix: always compute the balance from initial_balance + sum(all amounts up to
-- period end), which is deterministic and always correct. Keep running_balance
-- metadata for the has_running_balance flag only.

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
