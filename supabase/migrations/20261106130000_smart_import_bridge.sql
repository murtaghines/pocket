-- =============================================
-- Smart Import: bridge import pipeline → holdings
-- =============================================

-- 1. Add import_id to investment_transactions for traceability
ALTER TABLE investment_transactions
  ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES imports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inv_tx_import
  ON investment_transactions(import_id) WHERE import_id IS NOT NULL;

-- 2. Enhance trigger to auto-create holdings when holding_id is NULL
--    This is the key piece: when an import inserts a BUY transaction without
--    a holding_id, the trigger finds or creates the matching holding.
CREATE OR REPLACE FUNCTION process_investment_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_holding holdings%ROWTYPE;
  v_new_qty numeric;
  v_new_avg numeric;
  v_holding_id uuid;
BEGIN
  -- If no holding_id but we have a ticker and it's a buy/sell/dividend,
  -- find or create the holding automatically (import path).
  IF NEW.holding_id IS NULL AND NEW.ticker IS NOT NULL AND NEW.type IN ('buy', 'sell', 'dividend') THEN
    -- Try to find existing open holding by (user_id, ticker, account_id)
    SELECT id INTO v_holding_id
    FROM holdings
    WHERE user_id = NEW.user_id
      AND ticker = NEW.ticker
      AND COALESCE(account_id::text, '') = COALESCE(NEW.account_id::text, '')
      AND NOT is_closed
    LIMIT 1;

    IF v_holding_id IS NULL AND NEW.type = 'buy' THEN
      -- Create new holding
      INSERT INTO holdings (
        user_id, account_id, ticker, asset_name, asset_class,
        quantity, avg_cost_per_unit, currency
      ) VALUES (
        NEW.user_id,
        NEW.account_id,
        NEW.ticker,
        COALESCE(NEW.asset_name, NEW.ticker),
        COALESCE(
          (SELECT h2.asset_class FROM holdings h2
           WHERE h2.user_id = NEW.user_id AND h2.ticker = NEW.ticker
           LIMIT 1),
          'other'
        ),
        0,  -- trigger will set qty
        0,  -- trigger will set avg cost
        NEW.currency
      )
      RETURNING id INTO v_holding_id;
    END IF;

    IF v_holding_id IS NOT NULL THEN
      NEW.holding_id := v_holding_id;
    END IF;
  END IF;

  -- Exit early if still no holding
  IF NEW.holding_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_holding FROM holdings WHERE id = NEW.holding_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.type = 'buy' THEN
    v_new_qty := v_holding.quantity + NEW.quantity;
    IF v_new_qty > 0 THEN
      v_new_avg := ((v_holding.quantity * v_holding.avg_cost_per_unit) + (NEW.quantity * NEW.price_per_unit)) / v_new_qty;
    ELSE
      v_new_avg := NEW.price_per_unit;
    END IF;

    UPDATE holdings
    SET quantity = v_new_qty,
        avg_cost_per_unit = v_new_avg,
        updated_at = now()
    WHERE id = NEW.holding_id;

  ELSIF NEW.type = 'sell' THEN
    v_new_qty := GREATEST(v_holding.quantity - NEW.quantity, 0);

    NEW.realized_pnl := (NEW.price_per_unit - v_holding.avg_cost_per_unit) * NEW.quantity - NEW.fee;

    UPDATE holdings
    SET quantity = v_new_qty,
        is_closed = (v_new_qty = 0),
        updated_at = now()
    WHERE id = NEW.holding_id;
  END IF;

  RETURN NEW;
END;
$$;
