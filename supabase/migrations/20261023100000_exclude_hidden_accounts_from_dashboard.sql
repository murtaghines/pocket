-- "Exclude from dashboard" (accounts.hidden_from_dashboard) now removes the account from every
-- dashboard number, not only from the accounts list:
--   * mv_daily_totals / mv_opening_balances (KPIs, series, opening balance) are rebuilt without them
--   * get_dashboard_aggregates, get_category_trends, get_weekday_spending, get_balance_at_date skip them
-- Per-account RPCs used by the Transactions page (get_account_period_summary,
-- get_account_opening_balances) are intentionally untouched: hidden accounts still show there.
-- The dashboard's client code excludes hidden accounts from the totals it sums from those RPCs.

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
  AND a.account_type IS DISTINCT FROM 'SAVINGS'
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
    AND acct.account_type IS DISTINCT FROM 'SAVINGS'
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

-- Readers of the views (recreated in case dropping them took the functions along).
CREATE OR REPLACE FUNCTION public.get_monthly_series(
  p_user_id    uuid,
  p_domain     public.app_domain,
  p_start_month text DEFAULT NULL,
  p_end_month   text DEFAULT NULL
)
RETURNS TABLE(month text, income numeric, expenses numeric, balance numeric, sent_to_invest numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    d.month,
    ROUND(SUM(d.income), 2)   AS income,
    ROUND(SUM(d.expenses), 2) AS expenses,
    ROUND(SUM(d.income) - SUM(d.expenses), 2) AS balance,
    ROUND(GREATEST(SUM(d.sent_to_invest), 0), 2) AS sent_to_invest
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
RETURNS TABLE(period text, income numeric, expenses numeric, balance numeric, sent_to_invest numeric)
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
    ROUND(GREATEST(SUM(d.sent_to_invest), 0), 2) AS sent_to_invest
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

CREATE OR REPLACE FUNCTION public.get_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain
)
RETURNS TABLE(month text, opening_balance numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ob.month, ob.opening_balance
  FROM mv_opening_balances ob
  WHERE ob.user_id = p_user_id
    AND ob.domain  = p_domain
  ORDER BY ob.month;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_aggregates(p_user_id uuid, p_domain app_domain, p_start_date date, p_end_date date, p_prev_start date DEFAULT NULL::date, p_prev_end date DEFAULT NULL::date, p_month text DEFAULT NULL::text, p_week text DEFAULT NULL::text, p_year smallint DEFAULT NULL::smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'daily_totals', COALESCE((
      SELECT jsonb_agg(row_to_json(dt) ORDER BY dt.day)
      FROM (
        SELECT
          t.date AS day,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
            FILTER (WHERE t.movement = 'INCOME'), 0) AS income,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
            FILTER (WHERE t.movement = 'EXPENSE'), 0) AS expenses,
          COUNT(*) AS tx_count
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
        GROUP BY t.date
      ) dt
    ), '[]'::jsonb),

    'expense_categories', COALESCE((
      SELECT jsonb_agg(row_to_json(ec) ORDER BY ec.total DESC)
      FROM (
        SELECT
          t.category,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'EXPENSE'
        GROUP BY t.category
      ) ec
    ), '[]'::jsonb),

    'income_categories', COALESCE((
      SELECT jsonb_agg(row_to_json(ic) ORDER BY ic.total DESC)
      FROM (
        SELECT
          t.category,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'INCOME'
        GROUP BY t.category
      ) ic
    ), '[]'::jsonb),

    'prev_expense_categories', CASE
      WHEN p_prev_start IS NOT NULL AND p_prev_end IS NOT NULL THEN
        COALESCE((
          SELECT jsonb_agg(row_to_json(pec) ORDER BY pec.total DESC)
          FROM (
            SELECT
              t.category,
              COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total
            FROM transactions t
            LEFT JOIN accounts a ON a.id = t.account_id
            WHERE t.user_id = p_user_id
              AND t.domain = p_domain
              AND t.is_hidden = false
              AND COALESCE(a.hidden_from_dashboard, false) = false
              AND t.date BETWEEN p_prev_start AND p_prev_end
              AND t.movement = 'EXPENSE'
            GROUP BY t.category
          ) pec
        ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END,

    'top_expenses', COALESCE((
      SELECT jsonb_agg(row_to_json(te))
      FROM (
        SELECT
          t.id,
          COALESCE(t.description, t.description_norm) AS description,
          t.date,
          ROUND(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0, 2) AS amount,
          t.category
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'EXPENSE'
          AND t.category != 'to_investment'
        ORDER BY ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0 DESC
        LIMIT 10
      ) te
    ), '[]'::jsonb),

    'essential_split', COALESCE((
      SELECT jsonb_agg(row_to_json(es) ORDER BY es.total DESC)
      FROM (
        SELECT
          t.category,
          CASE
            WHEN t.category IN ('housing', 'groceries', 'transport', 'health',
                                 'subscriptions', 'education', 'sports', 'pets')
            THEN 'essential'
            ELSE 'discretionary'
          END AS kind,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'EXPENSE'
        GROUP BY t.category
      ) es
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

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
      ROUND(SUM(ABS(t.amount)), 2) AS total
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND COALESCE(a.hidden_from_dashboard, false) = false
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
      SUM(ABS(t.amount)) AS day_total,
      COUNT(*) AS day_count
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND COALESCE(a.hidden_from_dashboard, false) = false
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

CREATE OR REPLACE FUNCTION public.get_balance_at_date(p_user_id uuid, p_domain app_domain, p_date date)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH sum_before AS (
    SELECT t.account_id, SUM(t.amount) AS total
    FROM transactions t
    JOIN accounts acct ON acct.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND t.date < p_date
      AND acct.account_type IS DISTINCT FROM 'SAVINGS'
      AND acct.hidden_from_dashboard = false
    GROUP BY t.account_id
  )
  SELECT COALESCE(ROUND(SUM(
    (COALESCE(a.initial_balance, 0) + COALESCE(sb.total, 0))
    * COALESCE(a.split_percentage, 100) / 100.0
  ), 2), 0)
  FROM sum_before sb
  JOIN accounts a ON a.id = sb.account_id;
$function$;

SELECT refresh_dashboard_views();
