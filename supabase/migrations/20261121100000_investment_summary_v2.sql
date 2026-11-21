-- Replace get_investment_summary to read from investment_transactions
-- instead of the legacy investments table.
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
  SELECT MAX(to_char(it.date, 'YYYY-MM')) INTO v_current_month
  FROM investment_transactions it
  WHERE it.user_id = p_user_id;

  IF v_current_month IS NULL THEN
    v_current_month := to_char(now(), 'YYYY-MM');
  END IF;

  SELECT jsonb_build_object(
    'currentMonth', v_current_month,
    'totalInvestedThisMonth',
      COALESCE((
        SELECT SUM(total_amount)
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'buy'
          AND to_char(date, 'YYYY-MM') = v_current_month
      ), 0),
    'totalWithdrawnThisMonth',
      COALESCE((
        SELECT SUM(total_amount)
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'sell'
          AND to_char(date, 'YYYY-MM') = v_current_month
      ), 0),
    'netInvestedThisMonth',
      COALESCE((
        SELECT SUM(total_amount)
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'buy'
          AND to_char(date, 'YYYY-MM') = v_current_month
      ), 0)
      - COALESCE((
        SELECT SUM(total_amount)
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'sell'
          AND to_char(date, 'YYYY-MM') = v_current_month
      ), 0),
    'totalInvestedAllTime',
      COALESCE((
        SELECT SUM(total_amount)
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'buy'
      ), 0),
    'totalWithdrawnAllTime',
      COALESCE((
        SELECT SUM(total_amount)
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'sell'
      ), 0),
    'netInvestedAllTime',
      COALESCE((
        SELECT SUM(total_amount)
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'buy'
      ), 0)
      - COALESCE((
        SELECT SUM(total_amount)
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'sell'
      ), 0),
    'totalCurrentValue',
      COALESCE((
        SELECT SUM(current_value)
        FROM investment_accounts
        WHERE user_id = p_user_id
      ), 0),
    'byPlatform',
      COALESCE((
        SELECT jsonb_object_agg(acct_name, jsonb_build_object(
          'deposits', buys, 'withdrawals', sells, 'net', buys - sells
        ))
        FROM (
          SELECT
            COALESCE(a.institution, 'Unknown') AS acct_name,
            COALESCE(SUM(it.total_amount) FILTER (WHERE it.type = 'buy'), 0) AS buys,
            COALESCE(SUM(it.total_amount) FILTER (WHERE it.type = 'sell'), 0) AS sells
          FROM investment_transactions it
          LEFT JOIN accounts a ON a.id = it.account_id
          WHERE it.user_id = p_user_id
          GROUP BY COALESCE(a.institution, 'Unknown')
        ) sub
      ), '{}'::jsonb),
    'byAssetType',
      COALESCE((
        SELECT jsonb_object_agg(asset_key, jsonb_build_object(
          'deposits', buys, 'withdrawals', sells, 'net', buys - sells
        ))
        FROM (
          SELECT
            COALESCE(it.ticker, it.asset_name, 'Other') AS asset_key,
            COALESCE(SUM(it.total_amount) FILTER (WHERE it.type = 'buy'), 0) AS buys,
            COALESCE(SUM(it.total_amount) FILTER (WHERE it.type = 'sell'), 0) AS sells
          FROM investment_transactions it
          WHERE it.user_id = p_user_id
          GROUP BY COALESCE(it.ticker, it.asset_name, 'Other')
        ) sub
      ), '{}'::jsonb),
    'monthlyHistory',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'month', month,
          'deposits', buys,
          'withdrawals', sells,
          'net', buys - sells
        ) ORDER BY month)
        FROM (
          SELECT
            to_char(it.date, 'YYYY-MM') AS month,
            COALESCE(SUM(it.total_amount) FILTER (WHERE it.type = 'buy'), 0) AS buys,
            COALESCE(SUM(it.total_amount) FILTER (WHERE it.type = 'sell'), 0) AS sells
          FROM investment_transactions it
          WHERE it.user_id = p_user_id
          GROUP BY to_char(it.date, 'YYYY-MM')
        ) sub
      ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
