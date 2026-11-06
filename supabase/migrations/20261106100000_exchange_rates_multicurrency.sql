-- =============================================
-- Phase 4: Multi-currency portfolio support
-- =============================================

-- User-specific exchange rate overrides for investments.
-- The global `exchange_rates` table has API-cached rates (frankfurter.app).
-- This table lets users set their own rates — especially for:
--   • MEP dollar (Argentina's legal parallel rate)
--   • Blue dollar (informal rate)
--   • Any manual correction when the API rate doesn't match reality
CREATE TABLE IF NOT EXISTS public.portfolio_rate_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL CHECK (rate > 0),
  rate_type text NOT NULL DEFAULT 'official'
    CHECK (rate_type IN ('official', 'mep', 'blue', 'custom')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, from_currency, to_currency, rate_type)
);

ALTER TABLE public.portfolio_rate_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rate overrides"
  ON public.portfolio_rate_overrides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_portfolio_rate_overrides_user
  ON public.portfolio_rate_overrides(user_id);
CREATE INDEX idx_portfolio_rate_overrides_lookup
  ON public.portfolio_rate_overrides(user_id, from_currency, to_currency, rate_type);

-- Add preferred_rate_type to user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_preferences'
      AND column_name = 'preferred_rate_type'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD COLUMN preferred_rate_type text NOT NULL DEFAULT 'official';
  END IF;
END$$;

-- =============================================
-- RPC: get_portfolio_summary_multicurrency
-- Converts all holdings to a target display currency.
-- Uses user overrides first, then global exchange_rates, then falls back to 1:1.
-- =============================================
CREATE OR REPLACE FUNCTION public.get_portfolio_summary_multicurrency(
  p_user_id uuid,
  p_display_currency text DEFAULT 'USD',
  p_rate_type text DEFAULT 'official'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total numeric;
BEGIN
  WITH user_rates AS (
    -- User overrides (preferred rate_type, then fall back to official)
    SELECT DISTINCT ON (from_currency, to_currency)
      from_currency, to_currency, rate
    FROM portfolio_rate_overrides
    WHERE user_id = p_user_id
      AND rate_type IN (p_rate_type, 'official')
    ORDER BY from_currency, to_currency,
      CASE WHEN rate_type = p_rate_type THEN 0 ELSE 1 END
  ),
  global_rates AS (
    -- Latest global rates from exchange_rates cache (frankfurter)
    SELECT DISTINCT ON (base_currency, target_currency)
      base_currency AS from_currency,
      target_currency AS to_currency,
      rate
    FROM exchange_rates
    ORDER BY base_currency, target_currency, rate_date DESC
  ),
  converted_holdings AS (
    SELECT
      h.*,
      CASE
        WHEN h.currency = p_display_currency THEN 1.0
        -- Try user override direct
        WHEN ur_direct.rate IS NOT NULL THEN ur_direct.rate
        -- Try user override inverse
        WHEN ur_inverse.rate IS NOT NULL THEN 1.0 / ur_inverse.rate
        -- Try global rate direct (base_currency -> target matches from -> to)
        WHEN gr_direct.rate IS NOT NULL THEN gr_direct.rate
        -- Try global rate inverse
        WHEN gr_inverse.rate IS NOT NULL THEN 1.0 / gr_inverse.rate
        ELSE NULL
      END AS fx_rate
    FROM holdings h
    LEFT JOIN user_rates ur_direct
      ON ur_direct.from_currency = h.currency
      AND ur_direct.to_currency = p_display_currency
    LEFT JOIN user_rates ur_inverse
      ON ur_inverse.from_currency = p_display_currency
      AND ur_inverse.to_currency = h.currency
    LEFT JOIN global_rates gr_direct
      ON gr_direct.from_currency = h.currency
      AND gr_direct.to_currency = p_display_currency
    LEFT JOIN global_rates gr_inverse
      ON gr_inverse.from_currency = p_display_currency
      AND gr_inverse.to_currency = h.currency
    WHERE h.user_id = p_user_id AND NOT h.is_closed
  )
  SELECT jsonb_build_object(
    'displayCurrency', p_display_currency,
    'rateType', p_rate_type,
    'totalValue',
      COALESCE((SELECT SUM(current_value * COALESCE(fx_rate, 1)) FROM converted_holdings), 0),
    'totalCostBasis',
      COALESCE((SELECT SUM(cost_basis * COALESCE(fx_rate, 1)) FROM converted_holdings), 0),
    'totalPnl',
      COALESCE((SELECT SUM(unrealized_pnl * COALESCE(fx_rate, 1)) FROM converted_holdings), 0),
    'holdingsCount',
      (SELECT COUNT(*) FROM converted_holdings),
    'unconvertedCount',
      (SELECT COUNT(*) FROM converted_holdings WHERE fx_rate IS NULL AND currency != p_display_currency),
    'currencies',
      COALESCE((SELECT jsonb_agg(DISTINCT currency) FROM converted_holdings), '[]'::jsonb),
    'byAssetClass',
      COALESCE((
        SELECT jsonb_object_agg(asset_class, jsonb_build_object(
          'value', val, 'costBasis', cost, 'pnl', val - cost, 'count', cnt
        ))
        FROM (
          SELECT asset_class,
            COALESCE(SUM(current_value * COALESCE(fx_rate, 1)), 0) AS val,
            COALESCE(SUM(cost_basis * COALESCE(fx_rate, 1)), 0) AS cost,
            COUNT(*) AS cnt
          FROM converted_holdings GROUP BY asset_class
        ) sub
      ), '{}'::jsonb),
    'byAccount',
      COALESCE((
        SELECT jsonb_object_agg(
          COALESCE(a.institution, a.name, ch.account_id::text),
          jsonb_build_object(
            'accountId', ch.account_id, 'value', val,
            'costBasis', cost, 'pnl', val - cost, 'count', cnt
          )
        )
        FROM (
          SELECT account_id,
            COALESCE(SUM(current_value * COALESCE(fx_rate, 1)), 0) AS val,
            COALESCE(SUM(cost_basis * COALESCE(fx_rate, 1)), 0) AS cost,
            COUNT(*) AS cnt
          FROM converted_holdings WHERE account_id IS NOT NULL GROUP BY account_id
        ) ch
        LEFT JOIN accounts a ON a.id = ch.account_id
      ), '{}'::jsonb),
    'topHoldings',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'assetName', asset_name, 'ticker', ticker,
          'assetClass', asset_class, 'currency', currency,
          'currentValue', current_value * COALESCE(fx_rate, 1),
          'nativeValue', current_value,
          'costBasis', cost_basis * COALESCE(fx_rate, 1),
          'nativeCostBasis', cost_basis,
          'pnl', unrealized_pnl * COALESCE(fx_rate, 1),
          'nativePnl', unrealized_pnl,
          'pnlPercent', CASE WHEN cost_basis > 0
            THEN ROUND((unrealized_pnl / cost_basis * 100)::numeric, 2) ELSE 0 END,
          'weight', 0,
          'hasRate', (fx_rate IS NOT NULL OR currency = p_display_currency)
        ) ORDER BY current_value * COALESCE(fx_rate, 1) DESC)
        FROM (
          SELECT * FROM converted_holdings
          ORDER BY current_value * COALESCE(fx_rate, 1) DESC LIMIT 10
        ) sub
      ), '[]'::jsonb)
  ) INTO v_result;

  -- Calculate weights
  v_total := (v_result->>'totalValue')::numeric;
  IF v_total > 0 THEN
    v_result := jsonb_set(v_result, '{topHoldings}',
      (SELECT jsonb_agg(
        h || jsonb_build_object(
          'weight', ROUND(((h->>'currentValue')::numeric / v_total * 100)::numeric, 2)
        )
      )
      FROM jsonb_array_elements(v_result->'topHoldings') h)
    );
  END IF;

  RETURN v_result;
END;
$$;
