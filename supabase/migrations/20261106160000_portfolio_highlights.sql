-- Portfolio highlights: win rate, info stats, YTD baseline for the investment dashboard

CREATE OR REPLACE FUNCTION get_portfolio_highlights(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wins int := 0;
  v_losses int := 0;
  v_total_closed int := 0;
  v_first_op timestamptz;
  v_last_op timestamptz;
  v_total_movements bigint := 0;
  v_assets_traded bigint := 0;
  v_ytd_start_value numeric;
  v_ytd_start_cost numeric;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE realized_pnl > 0),
    COUNT(*) FILTER (WHERE realized_pnl < 0),
    COUNT(*)
  INTO v_wins, v_losses, v_total_closed
  FROM investment_transactions
  WHERE user_id = p_user_id AND type = 'sell';

  SELECT
    MIN(date), MAX(date), COUNT(*),
    COUNT(DISTINCT ticker) FILTER (WHERE ticker IS NOT NULL)
  INTO v_first_op, v_last_op, v_total_movements, v_assets_traded
  FROM investment_transactions
  WHERE user_id = p_user_id;

  SELECT total_value, total_cost_basis
  INTO v_ytd_start_value, v_ytd_start_cost
  FROM portfolio_snapshots
  WHERE user_id = p_user_id
    AND snapshot_date >= date_trunc('year', CURRENT_DATE)::date
  ORDER BY snapshot_date ASC
  LIMIT 1;

  RETURN jsonb_build_object(
    'winRate', jsonb_build_object(
      'wins', v_wins,
      'losses', v_losses,
      'total', v_total_closed,
      'pct', CASE WHEN v_total_closed > 0
        THEN ROUND((v_wins::numeric / v_total_closed) * 100, 2)
        ELSE 0 END
    ),
    'info', jsonb_build_object(
      'assetsTraded', COALESCE(v_assets_traded, 0),
      'firstOperation', v_first_op,
      'lastOperation', v_last_op,
      'totalMovements', COALESCE(v_total_movements, 0)
    ),
    'ytdStartValue', v_ytd_start_value,
    'ytdStartCost', v_ytd_start_cost
  );
END;
$$;
