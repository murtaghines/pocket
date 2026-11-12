-- Multi-currency support for dashboard RPCs.
-- Adds `currency` (from accounts.currency_base) to every aggregate so the
-- frontend can convert each currency group to the user's display currency
-- before summing, instead of assuming all amounts are EUR.

-------------------------------------------------------------------------
-- 1. get_dashboard_aggregates — add currency to every sub-query
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_aggregates(
  p_user_id uuid, p_domain app_domain,
  p_start_date date, p_end_date date,
  p_prev_start date DEFAULT NULL, p_prev_end date DEFAULT NULL,
  p_month text DEFAULT NULL, p_week text DEFAULT NULL, p_year smallint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(

    /* ── daily_totals ── */
    'daily_totals', COALESCE((
      SELECT jsonb_agg(row_to_json(dt) ORDER BY dt.day, dt.currency)
      FROM (
        SELECT
          t.date AS day,
          COALESCE(a.currency_base, 'EUR') AS currency,
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
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week  IS NOT NULL AND t.week  = p_week)  OR
            (p_year  IS NOT NULL AND t.year  = p_year)  OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
        GROUP BY t.date, a.currency_base
      ) dt
    ), '[]'::jsonb),

    /* ── expense_categories ── */
    'expense_categories', COALESCE((
      SELECT jsonb_agg(row_to_json(ec) ORDER BY ec.total DESC)
      FROM (
        SELECT
          t.category,
          COALESCE(a.currency_base, 'EUR') AS currency,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week  IS NOT NULL AND t.week  = p_week)  OR
            (p_year  IS NOT NULL AND t.year  = p_year)  OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'EXPENSE'
        GROUP BY t.category, a.currency_base
      ) ec
    ), '[]'::jsonb),

    /* ── income_categories ── */
    'income_categories', COALESCE((
      SELECT jsonb_agg(row_to_json(ic) ORDER BY ic.total DESC)
      FROM (
        SELECT
          t.category,
          COALESCE(a.currency_base, 'EUR') AS currency,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week  IS NOT NULL AND t.week  = p_week)  OR
            (p_year  IS NOT NULL AND t.year  = p_year)  OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'INCOME'
        GROUP BY t.category, a.currency_base
      ) ic
    ), '[]'::jsonb),

    /* ── prev_expense_categories ── */
    'prev_expense_categories', CASE
      WHEN p_prev_start IS NOT NULL AND p_prev_end IS NOT NULL THEN
        COALESCE((
          SELECT jsonb_agg(row_to_json(pec) ORDER BY pec.total DESC)
          FROM (
            SELECT
              t.category,
              COALESCE(a.currency_base, 'EUR') AS currency,
              COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total
            FROM transactions t
            LEFT JOIN accounts a ON a.id = t.account_id
            WHERE t.user_id = p_user_id
              AND t.domain = p_domain
              AND t.is_hidden = false
              AND COALESCE(a.hidden_from_dashboard, false) = false
              AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
              AND t.date BETWEEN p_prev_start AND p_prev_end
              AND t.movement = 'EXPENSE'
            GROUP BY t.category, a.currency_base
          ) pec
        ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END,

    /* ── top_expenses (individual rows — just add currency) ── */
    'top_expenses', COALESCE((
      SELECT jsonb_agg(row_to_json(te))
      FROM (
        SELECT
          t.id,
          COALESCE(t.description, t.description_norm) AS description,
          t.date,
          ROUND(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0, 2) AS amount,
          t.category,
          COALESCE(a.currency_base, 'EUR') AS currency
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week  IS NOT NULL AND t.week  = p_week)  OR
            (p_year  IS NOT NULL AND t.year  = p_year)  OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'EXPENSE'
          AND t.category != 'to_investment'
        ORDER BY ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0 DESC
        LIMIT 10
      ) te
    ), '[]'::jsonb),

    /* ── essential_split ── */
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
          COALESCE(a.currency_base, 'EUR') AS currency,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 0) AS total
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week  IS NOT NULL AND t.week  = p_week)  OR
            (p_year  IS NOT NULL AND t.year  = p_year)  OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'EXPENSE'
        GROUP BY t.category, a.currency_base
      ) es
    ), '[]'::jsonb),

    /* ── transfer_totals (now an array grouped by currency) ── */
    'transfer_totals', COALESCE((
      SELECT jsonb_agg(row_to_json(tt))
      FROM (
        SELECT
          COALESCE(a.currency_base, 'EUR') AS currency,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
            FILTER (WHERE t.amount < 0), 0) AS transfers_out,
          COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
            FILTER (WHERE t.amount > 0), 0) AS transfers_in
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND COALESCE(a.hidden_from_dashboard, false) = false
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
          AND (
            (p_month IS NOT NULL AND t.month = p_month) OR
            (p_week  IS NOT NULL AND t.week  = p_week)  OR
            (p_year  IS NOT NULL AND t.year  = p_year)  OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'TRANSFER'
          AND t.category IN ('own_transfer', 'from_myself', 'to_joint_account', 'from_joint_account')
        GROUP BY a.currency_base
      ) tt
    ), '[]'::jsonb)

  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-------------------------------------------------------------------------
-- 2. get_monthly_series — add currency column
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_series(
  p_user_id    uuid,
  p_domain     public.app_domain,
  p_start_month text DEFAULT NULL,
  p_end_month   text DEFAULT NULL
)
RETURNS TABLE(month text, currency text, income numeric, expenses numeric, balance numeric, sent_to_invest numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    to_char(t.date, 'YYYY-MM') AS month,
    COALESCE(a.currency_base, 'EUR') AS currency,
    ROUND(COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'INCOME'), 0), 2) AS income,
    ROUND(COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'EXPENSE'), 0), 2) AS expenses,
    ROUND(
      COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
        FILTER (WHERE t.movement = 'INCOME'), 0)
    - COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
        FILTER (WHERE t.movement = 'EXPENSE'), 0)
    , 2) AS balance,
    ROUND(GREATEST(
      - COALESCE(SUM(t.amount * COALESCE(a.split_percentage, 100) / 100.0)
          FILTER (WHERE t.movement = 'TRANSFER'
            AND t.category IN ('to_investment','from_investment','to_savings','from_savings')), 0)
    , 0), 2) AS sent_to_invest
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id
    AND t.domain  = p_domain
    AND t.is_hidden = false
    AND COALESCE(a.hidden_from_dashboard, false) = false
    AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
    AND (p_start_month IS NULL OR to_char(t.date, 'YYYY-MM') >= p_start_month)
    AND (p_end_month   IS NULL OR to_char(t.date, 'YYYY-MM') <= p_end_month)
  GROUP BY to_char(t.date, 'YYYY-MM'), a.currency_base
  ORDER BY month ASC, currency ASC;
$$;

-------------------------------------------------------------------------
-- 3. get_period_series — add currency column
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_period_series(
  p_user_id     uuid,
  p_domain      public.app_domain,
  p_granularity text DEFAULT 'month'
)
RETURNS TABLE(period text, currency text, income numeric, expenses numeric, balance numeric, sent_to_invest numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE p_granularity
      WHEN 'week' THEN to_char(date_trunc('week', t.date), 'YYYY-MM-DD')
      WHEN 'year' THEN EXTRACT(year FROM t.date)::text
      ELSE to_char(t.date, 'YYYY-MM')
    END AS period,
    COALESCE(a.currency_base, 'EUR') AS currency,
    ROUND(COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'INCOME'), 0), 2) AS income,
    ROUND(COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
      FILTER (WHERE t.movement = 'EXPENSE'), 0), 2) AS expenses,
    ROUND(
      COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
        FILTER (WHERE t.movement = 'INCOME'), 0)
    - COALESCE(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0)
        FILTER (WHERE t.movement = 'EXPENSE'), 0)
    , 2) AS balance,
    ROUND(GREATEST(
      - COALESCE(SUM(t.amount * COALESCE(a.split_percentage, 100) / 100.0)
          FILTER (WHERE t.movement = 'TRANSFER'
            AND t.category IN ('to_investment','from_investment','to_savings','from_savings')), 0)
    , 0), 2) AS sent_to_invest
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id
    AND t.domain  = p_domain
    AND t.is_hidden = false
    AND COALESCE(a.hidden_from_dashboard, false) = false
    AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
  GROUP BY
    CASE p_granularity
      WHEN 'week' THEN to_char(date_trunc('week', t.date), 'YYYY-MM-DD')
      WHEN 'year' THEN EXTRACT(year FROM t.date)::text
      ELSE to_char(t.date, 'YYYY-MM')
    END,
    a.currency_base
  ORDER BY period ASC, currency ASC;
$$;

-------------------------------------------------------------------------
-- 4. get_opening_balances — add currency column
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain
)
RETURNS TABLE(month text, currency text, opening_balance numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH monthly_totals AS (
    SELECT
      t.account_id,
      to_char(t.date, 'YYYY-MM') AS month,
      SUM(t.amount) AS month_total
    FROM transactions t
    JOIN accounts acct ON acct.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.domain  = p_domain
      AND t.is_hidden = false
      AND acct.account_type::text NOT IN ('SAVINGS', 'JOINT_SAVINGS')
      AND acct.hidden_from_dashboard = false
    GROUP BY t.account_id, to_char(t.date, 'YYYY-MM')
  ),
  cumulative AS (
    SELECT
      mt.account_id,
      mt.month,
      COALESCE(
        SUM(mt.month_total) OVER (
          PARTITION BY mt.account_id
          ORDER BY mt.month
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0
      ) AS sum_before
    FROM monthly_totals mt
  )
  SELECT
    c.month,
    COALESCE(a.currency_base, 'EUR') AS currency,
    ROUND(SUM(
      (COALESCE(a.initial_balance, 0) + c.sum_before)
      * COALESCE(a.split_percentage, 100) / 100.0
    ), 2) AS opening_balance
  FROM cumulative c
  JOIN accounts a ON a.id = c.account_id
  GROUP BY c.month, a.currency_base
  ORDER BY c.month, currency;
$$;

-------------------------------------------------------------------------
-- 5. get_account_period_summary — add currency column
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_account_period_summary(
  p_user_id uuid,
  p_start   date,
  p_end     date,
  p_domain  app_domain DEFAULT 'CASHFLOW'
)
RETURNS TABLE(
  account_id          uuid,
  currency            text,
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
    COALESCE(a.currency_base, 'EUR') AS currency,
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

-------------------------------------------------------------------------
-- 6. get_account_opening_balances — add currency column
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_account_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain DEFAULT 'CASHFLOW',
  p_month   text DEFAULT NULL
)
RETURNS TABLE(account_id uuid, currency text, opening_balance numeric)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH prior_totals AS (
    SELECT
      t.account_id,
      SUM(t.amount) AS total_before
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND to_char(t.date, 'YYYY-MM') < p_month
    GROUP BY t.account_id
  ),
  active AS (
    SELECT DISTINCT t.account_id
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND to_char(t.date, 'YYYY-MM') = p_month
  )
  SELECT
    aa.account_id,
    COALESCE(a.currency_base, 'EUR') AS currency,
    ROUND(
      (COALESCE(a.initial_balance, 0) + COALESCE(pt.total_before, 0))
      * COALESCE(a.split_percentage, 100) / 100.0
    , 2) AS opening_balance
  FROM active aa
  JOIN accounts a ON a.id = aa.account_id
  LEFT JOIN prior_totals pt ON pt.account_id = aa.account_id;
$$;

-------------------------------------------------------------------------
-- 7. get_balance_at_date — returns per-currency rows
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_balance_at_date(
  p_user_id uuid,
  p_domain  app_domain,
  p_date    date
)
RETURNS TABLE(currency text, balance numeric)
LANGUAGE sql STABLE
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
  SELECT
    COALESCE(a.currency_base, 'EUR') AS currency,
    ROUND(SUM(
      (COALESCE(a.initial_balance, 0) + COALESCE(sb.total, 0))
      * COALESCE(a.split_percentage, 100) / 100.0
    ), 2) AS balance
  FROM sum_before sb
  JOIN accounts a ON a.id = sb.account_id
  GROUP BY a.currency_base;
$$;

-------------------------------------------------------------------------
-- 8. get_category_trends — add currency column
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_category_trends(
  p_user_id    uuid,
  p_domain     app_domain,
  p_granularity text DEFAULT 'month',
  p_top_n      integer DEFAULT 6
)
RETURNS TABLE(period text, slug text, currency text, total numeric)
LANGUAGE sql STABLE
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
      COALESCE(a.currency_base, 'EUR') AS currency,
      ROUND(SUM(ABS(t.amount) * COALESCE(a.split_percentage, 100) / 100.0), 2) AS total
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND COALESCE(a.hidden_from_dashboard, false) = false
      AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
      AND t.movement = 'EXPENSE'
    GROUP BY 1, t.category, a.currency_base
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
    pc.currency,
    SUM(pc.total) AS total
  FROM period_cat pc
  LEFT JOIN top_slugs ts ON ts.slug = pc.slug
  GROUP BY pc.period,
           CASE WHEN ts.slug IS NOT NULL THEN pc.slug ELSE 'other_expense' END,
           pc.currency
  ORDER BY period, slug, currency;
$function$;

-------------------------------------------------------------------------
-- 9. get_weekday_spending — add currency column
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekday_spending(
  p_user_id uuid,
  p_domain  app_domain
)
RETURNS TABLE(weekday integer, currency text, total_spend numeric, tx_count bigint, avg_spend numeric)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
  WITH daily_totals AS (
    SELECT
      t.date,
      (EXTRACT(isodow FROM t.date)::int - 1) AS weekday,
      COALESCE(a.currency_base, 'EUR') AS currency,
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
    GROUP BY t.date, a.currency_base
  )
  SELECT
    weekday,
    currency,
    ROUND(SUM(day_total), 2) AS total_spend,
    SUM(day_count) AS tx_count,
    ROUND(SUM(day_total) / COUNT(DISTINCT date), 2) AS avg_spend
  FROM daily_totals
  GROUP BY weekday, currency
  ORDER BY weekday, currency;
$function$;
