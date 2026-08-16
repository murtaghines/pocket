-- Phase 1: Server-side aggregation RPCs.
-- Moves all dashboard/chart/KPI computation from client-side JS into Postgres,
-- eliminating the SELECT * + iterate-all-rows pattern in useTransactions.

--------------------------------------------------------------------------------
-- 1. get_dashboard_summary
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_user_id uuid,
  p_domain  public.app_domain,
  p_month_key text
)
RETURNS TABLE(
  income         numeric,
  expenses       numeric,
  balance        numeric,
  sent_to_invest numeric,
  tx_count       bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'INCOME'), 0)
      AS income,
    COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'EXPENSE'), 0)
      AS expenses,
    COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'INCOME'), 0)
      - COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'EXPENSE'), 0)
      AS balance,
    COALESCE(SUM(ABS(amount)) FILTER (WHERE movement = 'TRANSFER' AND category = 'to_investment'), 0)
      AS sent_to_invest,
    COUNT(*)
      AS tx_count
  FROM transactions
  WHERE user_id    = p_user_id
    AND domain     = p_domain
    AND is_hidden  = false
    AND to_char(date, 'YYYY-MM') = p_month_key;
$$;

--------------------------------------------------------------------------------
-- 2. get_monthly_series
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_series(
  p_user_id     uuid,
  p_domain      public.app_domain,
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
    to_char(t.date, 'YYYY-MM') AS month,
    ROUND(COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'INCOME'), 0), 2)
      AS income,
    ROUND(COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'EXPENSE'), 0), 2)
      AS expenses,
    ROUND(
      COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'INCOME'), 0)
      - COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'EXPENSE'), 0), 2
    ) AS balance,
    ROUND(COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'TRANSFER' AND t.category = 'to_investment'), 0), 2)
      AS sent_to_invest
  FROM transactions t
  WHERE t.user_id   = p_user_id
    AND t.domain     = p_domain
    AND t.is_hidden  = false
    AND (p_start_month IS NULL OR to_char(t.date, 'YYYY-MM') >= p_start_month)
    AND (p_end_month   IS NULL OR to_char(t.date, 'YYYY-MM') <= p_end_month)
  GROUP BY to_char(t.date, 'YYYY-MM')
  ORDER BY month ASC;
$$;

--------------------------------------------------------------------------------
-- 3. get_category_breakdown
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_category_breakdown(
  p_user_id   uuid,
  p_domain    public.app_domain,
  p_month_key text,
  p_movement  public.movement_type
)
RETURNS TABLE(
  category text,
  total    numeric,
  tx_count bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    t.category,
    ROUND(SUM(ABS(t.amount)), 2) AS total,
    COUNT(*)                      AS tx_count
  FROM transactions t
  WHERE t.user_id   = p_user_id
    AND t.domain     = p_domain
    AND t.is_hidden  = false
    AND t.movement   = p_movement
    AND to_char(t.date, 'YYYY-MM') = p_month_key
  GROUP BY t.category
  ORDER BY total DESC;
$$;

--------------------------------------------------------------------------------
-- 4. get_account_breakdown
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_account_breakdown(
  p_user_id   uuid,
  p_domain    public.app_domain,
  p_month_key text
)
RETURNS TABLE(
  account_id  uuid,
  account_name text,
  institution  text,
  total        numeric,
  tx_count     bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    a.id           AS account_id,
    a.name         AS account_name,
    a.institution,
    ROUND(SUM(ABS(t.amount)), 2) AS total,
    COUNT(*)                      AS tx_count
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id   = p_user_id
    AND t.domain     = p_domain
    AND t.is_hidden  = false
    AND t.movement   = 'EXPENSE'
    AND to_char(t.date, 'YYYY-MM') = p_month_key
  GROUP BY a.id, a.name, a.institution
  ORDER BY total DESC;
$$;

--------------------------------------------------------------------------------
-- 5. get_opening_balances
--    Mirrors the JS algorithm: for each month+account, find the earliest-date
--    transaction with running_balance, compute (running_balance - amount) as
--    that account's opening balance, then sum across accounts.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_opening_balances(
  p_user_id uuid,
  p_domain  public.app_domain
)
RETURNS TABLE(
  month           text,
  opening_balance numeric
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      to_char(t.date, 'YYYY-MM') AS month,
      t.account_id,
      t.running_balance,
      t.amount,
      ROW_NUMBER() OVER (
        PARTITION BY to_char(t.date, 'YYYY-MM'), t.account_id
        ORDER BY t.date ASC, t.created_at ASC
      ) AS rn
    FROM transactions t
    WHERE t.user_id        = p_user_id
      AND t.domain         = p_domain
      AND t.is_hidden      = false
      AND t.running_balance IS NOT NULL
  )
  SELECT
    r.month,
    ROUND(SUM(r.running_balance - r.amount), 2) AS opening_balance
  FROM ranked r
  WHERE r.rn = 1
  GROUP BY r.month
  ORDER BY r.month;
$$;

--------------------------------------------------------------------------------
-- 6. get_categorization_coverage
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_categorization_coverage(
  p_user_id uuid
)
RETURNS TABLE(
  total           bigint,
  high_confidence bigint,
  percent         int
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COUNT(*)                                                          AS total,
    COUNT(*) FILTER (WHERE confidence >= 0.85 OR confidence IS NULL)  AS high_confidence,
    CASE
      WHEN COUNT(*) = 0 THEN 100
      ELSE ROUND(
        (COUNT(*) FILTER (WHERE confidence >= 0.85 OR confidence IS NULL))::numeric
        / COUNT(*)::numeric * 100
      )::int
    END AS percent
  FROM transactions
  WHERE user_id   = p_user_id
    AND is_hidden  = false;
$$;

--------------------------------------------------------------------------------
-- 7. get_investment_summary
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_investment_summary(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_current_month text;
  v_result jsonb;
BEGIN
  SELECT MAX(to_char(i.date, 'YYYY-MM')) INTO v_current_month
  FROM investments i
  WHERE i.user_id = p_user_id AND i.is_hidden = false;

  IF v_current_month IS NULL THEN
    v_current_month := to_char(now(), 'YYYY-MM');
  END IF;

  SELECT jsonb_build_object(
    'currentMonth', v_current_month,
    'totalInvestedThisMonth',
      COALESCE((SELECT SUM(ABS(amount)) FROM investments WHERE user_id = p_user_id AND is_hidden = false AND type = 'deposit' AND to_char(date, 'YYYY-MM') = v_current_month), 0),
    'totalWithdrawnThisMonth',
      COALESCE((SELECT SUM(ABS(amount)) FROM investments WHERE user_id = p_user_id AND is_hidden = false AND type = 'withdrawal' AND to_char(date, 'YYYY-MM') = v_current_month), 0),
    'netInvestedThisMonth',
      COALESCE((SELECT SUM(ABS(amount)) FROM investments WHERE user_id = p_user_id AND is_hidden = false AND type = 'deposit' AND to_char(date, 'YYYY-MM') = v_current_month), 0)
      - COALESCE((SELECT SUM(ABS(amount)) FROM investments WHERE user_id = p_user_id AND is_hidden = false AND type = 'withdrawal' AND to_char(date, 'YYYY-MM') = v_current_month), 0),
    'totalInvestedAllTime',
      COALESCE((SELECT SUM(ABS(amount)) FROM investments WHERE user_id = p_user_id AND is_hidden = false AND type = 'deposit'), 0),
    'totalWithdrawnAllTime',
      COALESCE((SELECT SUM(ABS(amount)) FROM investments WHERE user_id = p_user_id AND is_hidden = false AND type = 'withdrawal'), 0),
    'netInvestedAllTime',
      COALESCE((SELECT SUM(ABS(amount)) FROM investments WHERE user_id = p_user_id AND is_hidden = false AND type = 'deposit'), 0)
      - COALESCE((SELECT SUM(ABS(amount)) FROM investments WHERE user_id = p_user_id AND is_hidden = false AND type = 'withdrawal'), 0),
    'totalCurrentValue',
      COALESCE((SELECT SUM(current_value) FROM investment_accounts WHERE user_id = p_user_id), 0),
    'byPlatform',
      COALESCE((
        SELECT jsonb_object_agg(platform, jsonb_build_object(
          'deposits', deposits, 'withdrawals', withdrawals, 'net', deposits - withdrawals
        ))
        FROM (
          SELECT
            platform,
            COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'deposit'), 0) AS deposits,
            COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal'), 0) AS withdrawals
          FROM investments
          WHERE user_id = p_user_id AND is_hidden = false
          GROUP BY platform
        ) sub
      ), '{}'::jsonb),
    'byAssetType',
      COALESCE((
        SELECT jsonb_object_agg(asset_type, jsonb_build_object(
          'deposits', deposits, 'withdrawals', withdrawals, 'net', deposits - withdrawals
        ))
        FROM (
          SELECT
            COALESCE(asset_type, 'Sin clasificar') AS asset_type,
            COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'deposit'), 0) AS deposits,
            COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal'), 0) AS withdrawals
          FROM investments
          WHERE user_id = p_user_id AND is_hidden = false
          GROUP BY COALESCE(asset_type, 'Sin clasificar')
        ) sub
      ), '{}'::jsonb),
    'monthlyHistory',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'month', month,
          'deposits', deposits,
          'withdrawals', withdrawals,
          'net', deposits - withdrawals
        ) ORDER BY month)
        FROM (
          SELECT
            to_char(date, 'YYYY-MM') AS month,
            COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'deposit'), 0) AS deposits,
            COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal'), 0) AS withdrawals
          FROM investments
          WHERE user_id = p_user_id AND is_hidden = false
          GROUP BY to_char(date, 'YYYY-MM')
        ) sub
      ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
