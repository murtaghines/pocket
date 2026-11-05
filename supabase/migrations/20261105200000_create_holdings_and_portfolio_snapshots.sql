-- =============================================
-- Holdings table: what the user currently owns
-- =============================================
CREATE TABLE IF NOT EXISTS public.holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  ticker text,
  asset_name text NOT NULL,
  asset_class text NOT NULL DEFAULT 'other'
    CHECK (asset_class IN ('stocks','etf','bonds','crypto','real_estate','cash','fci','commodities','other')),
  quantity numeric NOT NULL DEFAULT 0,
  avg_cost_per_unit numeric NOT NULL DEFAULT 0,
  cost_basis numeric NOT NULL GENERATED ALWAYS AS (quantity * avg_cost_per_unit) STORED,
  currency text NOT NULL DEFAULT 'USD',
  current_price numeric,
  current_value numeric NOT NULL GENERATED ALWAYS AS (quantity * COALESCE(current_price, avg_cost_per_unit)) STORED,
  unrealized_pnl numeric NOT NULL GENERATED ALWAYS AS (quantity * (COALESCE(current_price, avg_cost_per_unit) - avg_cost_per_unit)) STORED,
  price_updated_at timestamptz,
  is_closed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own holdings"
  ON public.holdings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_holdings_user ON public.holdings(user_id);
CREATE INDEX idx_holdings_user_open ON public.holdings(user_id) WHERE NOT is_closed;
CREATE INDEX idx_holdings_account ON public.holdings(account_id);

-- =============================================
-- Portfolio snapshots: daily value for performance charts
-- =============================================
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  total_value numeric NOT NULL,
  total_cost_basis numeric NOT NULL,
  total_pnl numeric NOT NULL GENERATED ALWAYS AS (total_value - total_cost_basis) STORED,
  deposits_cumulative numeric NOT NULL DEFAULT 0,
  withdrawals_cumulative numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  breakdown jsonb,
  UNIQUE(user_id, snapshot_date, currency)
);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own snapshots"
  ON public.portfolio_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_portfolio_snapshots_user_date
  ON public.portfolio_snapshots(user_id, snapshot_date DESC);

-- =============================================
-- RPC: get_portfolio_summary
-- =============================================
CREATE OR REPLACE FUNCTION public.get_portfolio_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totalValue',
      COALESCE((SELECT SUM(current_value) FROM holdings WHERE user_id = p_user_id AND NOT is_closed), 0),
    'totalCostBasis',
      COALESCE((SELECT SUM(cost_basis) FROM holdings WHERE user_id = p_user_id AND NOT is_closed), 0),
    'totalPnl',
      COALESCE((SELECT SUM(unrealized_pnl) FROM holdings WHERE user_id = p_user_id AND NOT is_closed), 0),
    'holdingsCount',
      (SELECT COUNT(*) FROM holdings WHERE user_id = p_user_id AND NOT is_closed),
    'byAssetClass',
      COALESCE((
        SELECT jsonb_object_agg(asset_class, jsonb_build_object(
          'value', val,
          'costBasis', cost,
          'pnl', val - cost,
          'count', cnt
        ))
        FROM (
          SELECT
            asset_class,
            COALESCE(SUM(current_value), 0) AS val,
            COALESCE(SUM(cost_basis), 0) AS cost,
            COUNT(*) AS cnt
          FROM holdings
          WHERE user_id = p_user_id AND NOT is_closed
          GROUP BY asset_class
        ) sub
      ), '{}'::jsonb),
    'byAccount',
      COALESCE((
        SELECT jsonb_object_agg(COALESCE(a.institution, a.name, h.account_id::text), jsonb_build_object(
          'accountId', h.account_id,
          'value', val,
          'costBasis', cost,
          'pnl', val - cost,
          'count', cnt
        ))
        FROM (
          SELECT
            account_id,
            COALESCE(SUM(current_value), 0) AS val,
            COALESCE(SUM(cost_basis), 0) AS cost,
            COUNT(*) AS cnt
          FROM holdings
          WHERE user_id = p_user_id AND NOT is_closed AND account_id IS NOT NULL
          GROUP BY account_id
        ) h
        LEFT JOIN accounts a ON a.id = h.account_id
      ), '{}'::jsonb),
    'topHoldings',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'assetName', asset_name,
          'ticker', ticker,
          'assetClass', asset_class,
          'currentValue', current_value,
          'costBasis', cost_basis,
          'pnl', unrealized_pnl,
          'pnlPercent', CASE WHEN cost_basis > 0 THEN ROUND((unrealized_pnl / cost_basis * 100)::numeric, 2) ELSE 0 END,
          'weight', 0
        ) ORDER BY current_value DESC)
        FROM (
          SELECT * FROM holdings
          WHERE user_id = p_user_id AND NOT is_closed
          ORDER BY current_value DESC
          LIMIT 10
        ) sub
      ), '[]'::jsonb)
  ) INTO v_result;

  -- Calculate weights (percentage of total)
  DECLARE
    v_total numeric;
  BEGIN
    v_total := (v_result->>'totalValue')::numeric;
    IF v_total > 0 THEN
      v_result := jsonb_set(v_result, '{topHoldings}',
        (SELECT jsonb_agg(
          h || jsonb_build_object('weight', ROUND(((h->>'currentValue')::numeric / v_total * 100)::numeric, 2))
        )
        FROM jsonb_array_elements(v_result->'topHoldings') h)
      );
    END IF;
  END;

  RETURN v_result;
END;
$$;
