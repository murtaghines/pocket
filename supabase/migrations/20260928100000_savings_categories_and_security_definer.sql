-- Add to_savings / from_savings transfer categories, recategorize neobank
-- savings pocket transactions, extend sent_to_invest to include savings,
-- and fix SECURITY DEFINER regression on refresh_dashboard_views.

------------------------------------------------------------------------
-- 1. Insert new savings category rows
------------------------------------------------------------------------
INSERT INTO public.categories (domain, movement_type, slug, name, color, icon) VALUES
  ('CASHFLOW', 'TRANSFER', 'to_savings',   'To Savings',   'hsl(160, 55%, 40%)', 'piggy-bank'),
  ('CASHFLOW', 'TRANSFER', 'from_savings', 'From Savings', 'hsl(160, 45%, 52%)', 'piggy-bank')
ON CONFLICT DO NOTHING;

------------------------------------------------------------------------
-- 2. Recategorize existing savings-pocket transactions
--    (previously lumped into own_transfer by 20260921110000)
------------------------------------------------------------------------
-- Outgoing savings (negative amount) → to_savings
UPDATE transactions
SET category = 'to_savings',
    category_id = (SELECT id FROM categories WHERE slug = 'to_savings' AND domain = 'CASHFLOW' LIMIT 1)
WHERE movement = 'TRANSFER'
  AND category = 'own_transfer'
  AND amount < 0
  AND (
    description ILIKE '%Instant Access Savings%'
    OR description ILIKE '%Savings Challenge%'
    OR description ILIKE '%Savings Vault%'
    OR description ILIKE '%Savings Pot%'
    OR description ILIKE '%N26 Spaces%'
    OR description ILIKE '%Cuenta Remunerada%'
    OR description ILIKE '%Cuenta Ahorro Plus%'
    OR description ILIKE '%To Savings Account%'
    OR description ILIKE '%To Savings Pot%'
    OR description ILIKE '%Revolut Savings%'
    OR description ILIKE '%Monzo Savings%'
    OR description ILIKE '%Monzo Pot%'
    OR description ILIKE '%Starling Savings%'
  )
  AND description NOT ILIKE '%INTEREST%'
  AND description NOT ILIKE '%PAID%';

-- Incoming savings (positive amount) → from_savings
UPDATE transactions
SET category = 'from_savings',
    category_id = (SELECT id FROM categories WHERE slug = 'from_savings' AND domain = 'CASHFLOW' LIMIT 1)
WHERE movement = 'TRANSFER'
  AND category = 'own_transfer'
  AND amount > 0
  AND (
    description ILIKE '%Instant Access Savings%'
    OR description ILIKE '%Savings Challenge%'
    OR description ILIKE '%Savings Vault%'
    OR description ILIKE '%Savings Pot%'
    OR description ILIKE '%N26 Spaces%'
    OR description ILIKE '%Cuenta Remunerada%'
    OR description ILIKE '%Cuenta Ahorro Plus%'
    OR description ILIKE '%From Savings%'
    OR description ILIKE '%Revolut Savings%'
    OR description ILIKE '%Monzo Savings%'
    OR description ILIKE '%Monzo Pot%'
    OR description ILIKE '%Starling Savings%'
  )
  AND description NOT ILIKE '%INTEREST%'
  AND description NOT ILIKE '%PAID%';

-- Backfill category_id for any transactions already tagged with the new slugs
UPDATE transactions t
SET category_id = c.id
FROM categories c
WHERE t.category = c.slug
  AND c.domain = 'CASHFLOW'
  AND t.category_id IS NULL
  AND c.slug IN ('to_savings', 'from_savings');

------------------------------------------------------------------------
-- 3. Recreate mv_daily_totals — extend sent_to_invest to include savings
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
              AND t.category IN ('to_investment', 'from_investment',
                                 'to_savings', 'from_savings')), 0),
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
-- 4. Fix refresh_dashboard_views — restore SECURITY DEFINER
--    (regressed to INVOKER in 20260921100000 by CASCADE + recreate)
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
-- 6. Refresh views to pick up all changes
------------------------------------------------------------------------
SELECT refresh_dashboard_views();
