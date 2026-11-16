-- Merge joint-account transfer categories into own_transfer / from_myself.
-- Joint-account categories were a separate bucket but add no meaningful
-- distinction — the split_percentage on the account already handles attribution.
-- Both own_transfer and from_myself are now labelled "Between Accounts" / "Entre Cuentas".

-- 1. Remap existing transaction data
UPDATE transactions SET category = 'own_transfer'  WHERE category = 'to_joint_account';
UPDATE transactions SET category = 'from_myself'   WHERE category = 'from_joint_account';

-- 2. Remap existing user_rules
UPDATE user_rules SET category = 'own_transfer'  WHERE category = 'to_joint_account';
UPDATE user_rules SET category = 'from_myself'   WHERE category = 'from_joint_account';

-- 3. Remove the now-unused category rows (soft: only if no transactions reference them)
DELETE FROM categories WHERE slug = 'to_joint_account'
  AND NOT EXISTS (SELECT 1 FROM transactions WHERE category = 'to_joint_account' LIMIT 1);
DELETE FROM categories WHERE slug = 'from_joint_account'
  AND NOT EXISTS (SELECT 1 FROM transactions WHERE category = 'from_joint_account' LIMIT 1);

-- 4. Rename own_transfer / from_myself labels in the categories table
UPDATE categories SET name = 'Between Accounts' WHERE slug = 'own_transfer';
UPDATE categories SET name = 'Between Accounts' WHERE slug = 'from_myself';

-- 5. Update get_dashboard_aggregates — remove joint account from transfer_totals IN clause.
--    This function returns jsonb (not RETURNS TABLE), so CREATE OR REPLACE works.
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

    /* ── transfer_totals (grouped by currency) ── */
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
          AND t.category IN ('own_transfer', 'from_myself')
        GROUP BY a.currency_base
      ) tt
    ), '[]'::jsonb)

  ) INTO v_result;

  RETURN v_result;
END;
$function$;
