-- Fix get_category_trends and get_weekday_spending:
-- 1. Apply split_percentage (joint account users saw inflated amounts)
-- 2. Exclude SAVINGS/JOINT_SAVINGS accounts (consistent with mv_daily_totals)

CREATE OR REPLACE FUNCTION public.get_category_trends(p_user_id uuid, p_domain app_domain, p_granularity text DEFAULT 'month'::text, p_top_n integer DEFAULT 6)
 RETURNS TABLE(period text, slug text, total numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH period_cat AS (
    SELECT
      CASE p_granularity
        WHEN 'week' THEN to_char(date_trunc('week', t.date), 'YYYY-MM-DD')
        WHEN 'year' THEN to_char(t.date, 'YYYY')
        ELSE to_char(t.date, 'YYYY-MM')
      END AS period,
      t.category AS slug,
      ROUND(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 2) AS total
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND COALESCE(a.hidden_from_dashboard, false) = false
      AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
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
$function$;

CREATE OR REPLACE FUNCTION public.get_weekday_spending(p_user_id uuid, p_domain app_domain)
 RETURNS TABLE(weekday integer, total_spend numeric, tx_count bigint, avg_spend numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH daily_totals AS (
    SELECT
      t.date,
      (EXTRACT(isodow FROM t.date)::int - 1) AS weekday,
      SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0) AS day_total,
      COUNT(*) AS day_count
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND COALESCE(a.hidden_from_dashboard, false) = false
      AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
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
$function$;
