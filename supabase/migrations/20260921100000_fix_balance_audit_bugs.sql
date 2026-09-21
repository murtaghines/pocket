-- Fix balance calculation bugs found during audit:
--
-- Bug #1: get_account_period_summary and get_balance_at_date silently drop
--         manual transactions (running_balance IS NULL) dated after the last
--         bank-provided running_balance. Now: closing = last_rb + SUM(later
--         non-RB amounts), so manual entries always count.
--
-- Bug #5: get_balance_at_date's "active" CTE included accounts with no
--         transactions before p_date, leaking their initial_balance into
--         historical dates. Now filtered to accounts with prior activity.
--
-- Bug #6: mv_daily_totals.sent_to_invest regressed to SUM(ABS(amount)) on
--         to_investment only. Restored: GREATEST(-SUM(amount), 0) with both
--         to_investment and from_investment so paired transfers net out.

------------------------------------------------------------------------
-- 1. Fix get_account_period_summary — include post-RB manual transactions
------------------------------------------------------------------------
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
    SELECT DISTINCT ON (t.account_id)
      t.account_id,
      t.running_balance,
      t.date      AS rb_date,
      t.created_at AS rb_created_at
    FROM transactions t
    WHERE t.user_id   = p_user_id
      AND t.domain    = p_domain
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
      AND t.running_balance IS NOT NULL
    ORDER BY t.account_id, t.date DESC, t.created_at DESC
  ),
  post_rb AS (
    -- Manual transactions (no running_balance) AFTER the last bank-provided RB
    SELECT t.account_id, SUM(t.amount) AS extra
    FROM transactions t
    JOIN latest_rb lr ON lr.account_id = t.account_id
    WHERE t.user_id   = p_user_id
      AND t.domain    = p_domain
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
      AND t.running_balance IS NULL
      AND (t.date > lr.rb_date
           OR (t.date = lr.rb_date AND t.created_at > lr.rb_created_at))
    GROUP BY t.account_id
  ),
  cumulative AS (
    -- Fallback: sum ALL signed amounts from inception up to p_end
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
          THEN (lr.running_balance + COALESCE(prb.extra, 0))
               * COALESCE(a.split_percentage, 100) / 100.0
        ELSE (COALESCE(a.initial_balance, 0) + COALESCE(c.total, 0))
             * COALESCE(a.split_percentage, 100) / 100.0
      END
    , 2) AS latest_balance,
    (lr.running_balance IS NOT NULL) AS has_running_balance,
    pc.cnt AS tx_count
  FROM active_accounts aa
  JOIN accounts a ON a.id = aa.account_id
  LEFT JOIN latest_rb lr ON lr.account_id = aa.account_id
  LEFT JOIN post_rb prb ON prb.account_id = aa.account_id
  LEFT JOIN cumulative c ON c.account_id = aa.account_id
  LEFT JOIN period_counts pc ON pc.account_id = aa.account_id;
$$;

------------------------------------------------------------------------
-- 2. Fix get_balance_at_date — include post-RB manual transactions
--    and restrict active accounts to those with history before p_date
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
      account_id, running_balance, date AS rb_date, created_at AS rb_created_at
    FROM prior
    WHERE running_balance IS NOT NULL
    ORDER BY account_id, date DESC, created_at DESC
  ),
  post_rb AS (
    -- Manual transactions after the last bank-provided RB
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
    -- Only accounts that have transactions BEFORE p_date
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
-- 3. Fix mv_daily_totals — restore correct sent_to_invest formula
--    with split_percentage applied
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
              AND t.category IN ('to_investment', 'from_investment')), 0),
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
-- 4. Recreate functions dropped by CASCADE on mv_daily_totals
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
-- 5. Refresh MVs to pick up changes
------------------------------------------------------------------------
SELECT refresh_dashboard_views();
