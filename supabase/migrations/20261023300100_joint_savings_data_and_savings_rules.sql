-- Shared savings accounts become their own type. Only accounts that already carry a share (below 100%)
-- are moved; those were shared savings all along.
UPDATE public.accounts
   SET account_type = 'JOINT_SAVINGS'
 WHERE account_type = 'SAVINGS' AND split_percentage < 100;

-- Joint savings are savings for every analysis: same exclusions as savings.
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
  AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
  AND COALESCE(a.hidden_from_dashboard, false) = false
GROUP BY t.user_id, t.domain, t.date;

CREATE UNIQUE INDEX mv_daily_totals_pk
  ON mv_daily_totals (user_id, domain, day);

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
    AND acct.account_type::text NOT IN ('SAVINGS', 'JOINT_SAVINGS')
    AND acct.hidden_from_dashboard = false
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

CREATE OR REPLACE FUNCTION public.get_balance_at_date(p_user_id uuid, p_domain app_domain, p_date date)
RETURNS numeric
LANGUAGE sql
STABLE
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
      AND acct.account_type::text NOT IN ('SAVINGS', 'JOINT_SAVINGS')
      AND acct.hidden_from_dashboard = false
    GROUP BY t.account_id
  )
  SELECT COALESCE(ROUND(SUM(
    (COALESCE(a.initial_balance, 0) + COALESCE(sb.total, 0))
    * COALESCE(a.split_percentage, 100) / 100.0
  ), 2), 0)
  FROM sum_before sb
  JOIN accounts a ON a.id = sb.account_id;
$$;

SELECT refresh_dashboard_views();
