-- Add transfer_totals to get_dashboard_aggregates.
-- Returns in/out totals for the 4 "invisible" transfer categories
-- (own_transfer, from_myself, to_joint_account, from_joint_account).
-- These are own-account transfers that don't appear in Income, Expense,
-- or Invested & Saved KPIs.

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
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
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
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
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
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
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
              AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
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
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
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
          AND COALESCE(a.account_type::text, '') NOT IN ('SAVINGS', 'JOINT_SAVINGS')
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
    ), '[]'::jsonb),

    'transfer_totals', COALESCE((
      SELECT row_to_json(tt)::jsonb
      FROM (
        SELECT
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
            (p_week IS NOT NULL AND t.week = p_week) OR
            (p_year IS NOT NULL AND t.year = p_year) OR
            (p_month IS NULL AND p_week IS NULL AND p_year IS NULL
              AND t.date BETWEEN p_start_date AND p_end_date)
          )
          AND t.movement = 'TRANSFER'
          AND t.category IN ('own_transfer', 'from_myself', 'to_joint_account', 'from_joint_account')
      ) tt
    ), '{"transfers_out": 0, "transfers_in": 0}'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
