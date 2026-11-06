-- Phase 5: Target allocations for rebalancing suggestions
-- Stores user-defined target percentages per asset class

CREATE TABLE IF NOT EXISTS target_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_class text NOT NULL,
  target_pct numeric NOT NULL DEFAULT 0 CHECK (target_pct >= 0 AND target_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_class)
);

ALTER TABLE target_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own target allocations"
  ON target_allocations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_target_allocations_user ON target_allocations(user_id);

-- RPC: get dividend & fee summary from investment_transactions
CREATE OR REPLACE FUNCTION get_investment_insights(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totalDividends', COALESCE(SUM(CASE WHEN type = 'dividend' THEN total_amount ELSE 0 END), 0),
    'totalFees', COALESCE(SUM(CASE WHEN type = 'fee' THEN total_amount ELSE 0 END), 0),
    'totalBuyVolume', COALESCE(SUM(CASE WHEN type = 'buy' THEN total_amount ELSE 0 END), 0),
    'totalSellVolume', COALESCE(SUM(CASE WHEN type = 'sell' THEN total_amount ELSE 0 END), 0),
    'totalRealizedPnl', COALESCE(SUM(CASE WHEN type = 'sell' THEN realized_pnl ELSE 0 END), 0),
    'transactionCount', COUNT(*),
    'dividendCount', COUNT(*) FILTER (WHERE type = 'dividend'),
    'feeCount', COUNT(*) FILTER (WHERE type = 'fee'),
    'dividendsByMonth', (
      SELECT COALESCE(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.month), '[]'::jsonb)
      FROM (
        SELECT
          to_char(date, 'YYYY-MM') AS month,
          SUM(total_amount) AS amount
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'dividend'
        GROUP BY to_char(date, 'YYYY-MM')
        ORDER BY month
      ) m
    ),
    'feesByMonth', (
      SELECT COALESCE(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.month), '[]'::jsonb)
      FROM (
        SELECT
          to_char(date, 'YYYY-MM') AS month,
          SUM(total_amount) AS amount
        FROM investment_transactions
        WHERE user_id = p_user_id AND type = 'fee'
        GROUP BY to_char(date, 'YYYY-MM')
        ORDER BY month
      ) m
    )
  ) INTO result
  FROM investment_transactions
  WHERE user_id = p_user_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
