-- RPC to get portfolio performance time series from snapshots
CREATE OR REPLACE FUNCTION get_portfolio_performance(
  p_user_id uuid,
  p_from date DEFAULT (CURRENT_DATE - INTERVAL '1 year'),
  p_to date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_series jsonb;
  v_latest record;
  v_first record;
  v_total_return numeric;
  v_annualized numeric;
  v_days integer;
BEGIN
  -- Time series of snapshots
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', s.snapshot_date,
      'totalValue', s.total_value,
      'totalCostBasis', s.total_cost_basis,
      'depositsCumulative', s.deposits_cumulative,
      'withdrawalsCumulative', s.withdrawals_cumulative,
      'pnl', s.total_value - s.total_cost_basis
    ) ORDER BY s.snapshot_date
  ), '[]'::jsonb) INTO v_series
  FROM portfolio_snapshots s
  WHERE s.user_id = p_user_id
    AND s.snapshot_date BETWEEN p_from AND p_to;

  -- Latest and first for return calculations
  SELECT * INTO v_latest
  FROM portfolio_snapshots
  WHERE user_id = p_user_id AND snapshot_date <= p_to
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT * INTO v_first
  FROM portfolio_snapshots
  WHERE user_id = p_user_id AND snapshot_date >= p_from
  ORDER BY snapshot_date ASC LIMIT 1;

  IF v_latest IS NULL OR v_first IS NULL THEN
    RETURN jsonb_build_object(
      'series', v_series,
      'totalReturn', 0,
      'totalReturnPercent', 0,
      'annualizedReturn', 0,
      'currentValue', 0,
      'currentCostBasis', 0,
      'periodDays', 0
    );
  END IF;

  v_total_return := v_latest.total_value - v_latest.total_cost_basis;

  v_days := v_latest.snapshot_date - v_first.snapshot_date;

  IF v_latest.total_cost_basis > 0 THEN
    v_annualized := CASE
      WHEN v_days >= 365 THEN
        (POWER(v_latest.total_value / v_latest.total_cost_basis, 365.0 / v_days) - 1) * 100
      ELSE
        (v_total_return / v_latest.total_cost_basis) * 100
    END;
  ELSE
    v_annualized := 0;
  END IF;

  RETURN jsonb_build_object(
    'series', v_series,
    'totalReturn', v_total_return,
    'totalReturnPercent', CASE WHEN v_latest.total_cost_basis > 0
      THEN (v_total_return / v_latest.total_cost_basis) * 100 ELSE 0 END,
    'annualizedReturn', v_annualized,
    'currentValue', v_latest.total_value,
    'currentCostBasis', v_latest.total_cost_basis,
    'periodDays', v_days
  );
END;
$$;

-- Function to take a portfolio snapshot (called by edge function or manually)
CREATE OR REPLACE FUNCTION take_portfolio_snapshot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_value numeric;
  v_total_cost numeric;
  v_deposits numeric;
  v_withdrawals numeric;
  v_breakdown jsonb;
BEGIN
  -- Sum holdings
  SELECT
    COALESCE(SUM(current_value), 0),
    COALESCE(SUM(cost_basis), 0)
  INTO v_total_value, v_total_cost
  FROM holdings
  WHERE user_id = p_user_id AND NOT is_closed;

  -- Sum deposit/withdrawal history
  SELECT
    COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0)
  INTO v_deposits, v_withdrawals
  FROM investments
  WHERE user_id = p_user_id AND NOT is_hidden;

  -- Breakdown by asset class
  SELECT COALESCE(jsonb_object_agg(
    asset_class,
    jsonb_build_object('value', class_value, 'costBasis', class_cost)
  ), '{}'::jsonb) INTO v_breakdown
  FROM (
    SELECT asset_class,
           SUM(current_value) as class_value,
           SUM(cost_basis) as class_cost
    FROM holdings
    WHERE user_id = p_user_id AND NOT is_closed
    GROUP BY asset_class
  ) sub;

  -- Upsert snapshot for today
  INSERT INTO portfolio_snapshots (user_id, snapshot_date, total_value, total_cost_basis,
    deposits_cumulative, withdrawals_cumulative, breakdown)
  VALUES (p_user_id, CURRENT_DATE, v_total_value, v_total_cost,
    v_deposits, v_withdrawals, v_breakdown)
  ON CONFLICT (user_id, snapshot_date, currency)
  DO UPDATE SET
    total_value = EXCLUDED.total_value,
    total_cost_basis = EXCLUDED.total_cost_basis,
    deposits_cumulative = EXCLUDED.deposits_cumulative,
    withdrawals_cumulative = EXCLUDED.withdrawals_cumulative,
    breakdown = EXCLUDED.breakdown;
END;
$$;
