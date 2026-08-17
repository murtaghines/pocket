-- Phase 2: Generalized period series + historical analytics RPCs.
-- Extends Phase 1 aggregation to week/year granularity and adds
-- server-side weekday spending and category trend computations.

--------------------------------------------------------------------------------
-- 1. get_period_series
--    Generalizes get_monthly_series for week/month/year granularity.
--    Keeps get_monthly_series unchanged for backward compatibility.
--------------------------------------------------------------------------------
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
      WHEN 'week' THEN to_char(date_trunc('week', t.date), 'YYYY-MM-DD')
      WHEN 'year' THEN to_char(t.date, 'YYYY')
      ELSE to_char(t.date, 'YYYY-MM')
    END AS period,
    ROUND(COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'INCOME'), 0), 2)
      AS income,
    ROUND(COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'EXPENSE'), 0), 2)
      AS expenses,
    ROUND(
      COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'INCOME'), 0)
      - COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'EXPENSE'), 0), 2
    ) AS balance,
    ROUND(COALESCE(SUM(ABS(t.amount)) FILTER (
      WHERE t.movement = 'TRANSFER' AND t.category = 'to_investment'
    ), 0), 2) AS sent_to_invest
  FROM transactions t
  WHERE t.user_id   = p_user_id
    AND t.domain     = p_domain
    AND t.is_hidden  = false
  GROUP BY
    CASE p_granularity
      WHEN 'week' THEN to_char(date_trunc('week', t.date), 'YYYY-MM-DD')
      WHEN 'year' THEN to_char(t.date, 'YYYY')
      ELSE to_char(t.date, 'YYYY-MM')
    END
  ORDER BY period ASC;
$$;

--------------------------------------------------------------------------------
-- 2. get_weekday_spending
--    All-time expense pattern by weekday (0=Mon .. 6=Sun).
--    Computes avg_spend as total_spend / distinct_days per weekday.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekday_spending(
  p_user_id uuid,
  p_domain  public.app_domain
)
RETURNS TABLE(
  weekday     int,
  total_spend numeric,
  tx_count    bigint,
  avg_spend   numeric
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH daily_totals AS (
    SELECT
      t.date,
      (EXTRACT(isodow FROM t.date)::int - 1) AS weekday,
      SUM(ABS(t.amount)) AS day_total,
      COUNT(*) AS day_count
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND t.movement = 'EXPENSE'
    GROUP BY t.date
  )
  SELECT
    weekday,
    ROUND(SUM(day_total), 2) AS total_spend,
    SUM(day_count) AS tx_count,
    ROUND(SUM(day_total) / COUNT(DISTINCT date), 2) AS avg_spend
  FROM daily_totals
  GROUP BY weekday
  ORDER BY weekday;
$$;

--------------------------------------------------------------------------------
-- 3. get_category_trends
--    Top N expense categories over time at the given granularity.
--    Categories outside top N are collapsed into 'other_expense'.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_category_trends(
  p_user_id     uuid,
  p_domain      public.app_domain,
  p_granularity text DEFAULT 'month',
  p_top_n       int  DEFAULT 6
)
RETURNS TABLE(
  period text,
  slug   text,
  total  numeric
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH period_cat AS (
    SELECT
      CASE p_granularity
        WHEN 'week' THEN to_char(date_trunc('week', t.date), 'YYYY-MM-DD')
        WHEN 'year' THEN to_char(t.date, 'YYYY')
        ELSE to_char(t.date, 'YYYY-MM')
      END AS period,
      t.category AS slug,
      ROUND(SUM(ABS(t.amount)), 2) AS total
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND t.movement = 'EXPENSE'
    GROUP BY 1, t.category
  ),
  ranked AS (
    SELECT slug, SUM(total) AS grand_total,
           ROW_NUMBER() OVER (ORDER BY SUM(total) DESC) AS rn
    FROM period_cat
    GROUP BY slug
  ),
  top_slugs AS (
    SELECT slug FROM ranked WHERE rn <= p_top_n
  )
  SELECT
    pc.period,
    CASE WHEN ts.slug IS NOT NULL THEN pc.slug ELSE 'other_expense' END AS slug,
    SUM(pc.total) AS total
  FROM period_cat pc
  LEFT JOIN top_slugs ts ON ts.slug = pc.slug
  GROUP BY pc.period,
           CASE WHEN ts.slug IS NOT NULL THEN pc.slug ELSE 'other_expense' END
  ORDER BY period, slug;
$$;
