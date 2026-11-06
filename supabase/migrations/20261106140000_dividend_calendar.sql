-- Dividend calendar: per-holding dividend breakdown + quarterly aggregation
-- Uses existing investment_transactions (type='dividend') + holdings tables

CREATE OR REPLACE FUNCTION get_dividend_calendar(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- Per-holding dividend totals (which tickers pay you most)
    'byHolding', (
      SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.total DESC), '[]'::jsonb)
      FROM (
        SELECT
          it.ticker,
          COALESCE(it.asset_name, hl.asset_name, it.ticker) AS asset_name,
          it.currency,
          SUM(it.total_amount) AS total,
          COUNT(*) AS payment_count,
          MIN(it.date) AS first_payment,
          MAX(it.date) AS last_payment,
          COALESCE(hl.current_value, 0) AS holding_value
        FROM investment_transactions it
        LEFT JOIN holdings hl
          ON hl.user_id = it.user_id
          AND hl.ticker = it.ticker
          AND hl.is_closed = false
        WHERE it.user_id = p_user_id AND it.type = 'dividend'
        GROUP BY it.ticker, COALESCE(it.asset_name, hl.asset_name, it.ticker), it.currency, hl.current_value
      ) h
    ),
    -- Quarterly aggregation
    'byQuarter', (
      SELECT COALESCE(jsonb_agg(row_to_json(q)::jsonb ORDER BY q.quarter), '[]'::jsonb)
      FROM (
        SELECT
          to_char(date, 'YYYY-"Q"Q') AS quarter,
          SUM(total_amount) AS amount,
          COUNT(*) AS payment_count
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'dividend'
        GROUP BY to_char(date, 'YYYY-"Q"Q')
        ORDER BY quarter
      ) q
    ),
    -- Monthly aggregation (last 12 months for chart)
    'byMonth', (
      SELECT COALESCE(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.month), '[]'::jsonb)
      FROM (
        SELECT
          to_char(date, 'YYYY-MM') AS month,
          SUM(total_amount) AS amount,
          COUNT(*) AS payment_count
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'dividend'
        GROUP BY to_char(date, 'YYYY-MM')
        ORDER BY month
      ) m
    ),
    -- Trailing 12-month total (for projected annual)
    'trailing12m', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM investment_transactions
      WHERE user_id = p_user_id
        AND type = 'dividend'
        AND date >= (CURRENT_DATE - interval '12 months')
    ),
    -- Total all-time
    'totalAllTime', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM investment_transactions
      WHERE user_id = p_user_id AND type = 'dividend'
    ),
    -- Total payment count
    'totalPayments', (
      SELECT COUNT(*)
      FROM investment_transactions
      WHERE user_id = p_user_id AND type = 'dividend'
    )
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
