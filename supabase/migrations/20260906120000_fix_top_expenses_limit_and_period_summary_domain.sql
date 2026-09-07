-- Fix 1: get_account_period_summary — add domain filter so INVESTING transactions
-- don't bleed into the CASHFLOW dashboard's AccountsStackCard.
DROP FUNCTION IF EXISTS public.get_account_period_summary(uuid, date, date);

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
  WITH period_txs AS (
    SELECT t.account_id, t.amount, t.movement, t.running_balance, t.date
    FROM transactions t
    WHERE t.user_id  = p_user_id
      AND t.domain   = p_domain
      AND t.is_hidden = false
      AND t.date BETWEEN p_start AND p_end
  ),
  latest_rb AS (
    SELECT DISTINCT ON (account_id)
      account_id,
      running_balance
    FROM period_txs
    WHERE running_balance IS NOT NULL
    ORDER BY account_id, date DESC
  )
  SELECT
    pt.account_id,
    ROUND(COALESCE(
      lr.running_balance,
      SUM(CASE WHEN pt.movement = 'EXPENSE' THEN -ABS(pt.amount) ELSE ABS(pt.amount) END)
    ), 2) AS latest_balance,
    (lr.running_balance IS NOT NULL) AS has_running_balance,
    COUNT(*) AS tx_count
  FROM period_txs pt
  LEFT JOIN latest_rb lr ON lr.account_id = pt.account_id
  GROUP BY pt.account_id, lr.running_balance;
$$;

-- Fix 2: get_dashboard_aggregates — restore top_expenses LIMIT from 5 back to 10.
-- Migration 20260903* accidentally reduced it when recreating the function.
CREATE OR REPLACE FUNCTION public.get_dashboard_aggregates(
  p_user_id    uuid,
  p_domain     public.app_domain,
  p_start_date date,
  p_end_date   date,
  p_prev_start date DEFAULT NULL,
  p_prev_end   date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'daily_totals', COALESCE((
      SELECT jsonb_agg(row_to_json(dt) ORDER BY dt.day)
      FROM (
        SELECT
          t.date AS day,
          COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'INCOME'), 0) AS income,
          COALESCE(SUM(ABS(t.amount)) FILTER (WHERE t.movement = 'EXPENSE'), 0) AS expenses,
          COUNT(*) AS tx_count
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND t.date BETWEEN p_start_date AND p_end_date
        GROUP BY t.date
      ) dt
    ), '[]'::jsonb),

    'expense_categories', COALESCE((
      SELECT jsonb_agg(row_to_json(ec) ORDER BY ec.total DESC)
      FROM (
        SELECT
          t.category,
          COALESCE(SUM(ABS(t.amount)), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND t.date BETWEEN p_start_date AND p_end_date
          AND t.movement = 'EXPENSE'
        GROUP BY t.category
      ) ec
    ), '[]'::jsonb),

    'income_categories', COALESCE((
      SELECT jsonb_agg(row_to_json(ic) ORDER BY ic.total DESC)
      FROM (
        SELECT
          t.category,
          COALESCE(SUM(ABS(t.amount)), 0) AS total,
          COUNT(*) AS tx_count
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND t.date BETWEEN p_start_date AND p_end_date
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
              COALESCE(SUM(ABS(t.amount)), 0) AS total
            FROM transactions t
            WHERE t.user_id = p_user_id
              AND t.domain = p_domain
              AND t.is_hidden = false
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
          ABS(t.amount) AS amount,
          t.category
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND t.date BETWEEN p_start_date AND p_end_date
          AND t.movement = 'EXPENSE'
          AND t.category != 'to_investment'
        ORDER BY ABS(t.amount) DESC
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
          COALESCE(SUM(ABS(t.amount)), 0) AS total
        FROM transactions t
        WHERE t.user_id = p_user_id
          AND t.domain = p_domain
          AND t.is_hidden = false
          AND t.date BETWEEN p_start_date AND p_end_date
          AND t.movement = 'EXPENSE'
        GROUP BY t.category
      ) es
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
