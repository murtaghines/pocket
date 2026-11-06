-- Tax lot tracking: FIFO/LIFO cost basis for realized gains
-- Each BUY creates a tax lot; each SELL consumes lots in order

-- 1. Tax lots table
CREATE TABLE IF NOT EXISTS tax_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id uuid NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES investment_transactions(id) ON DELETE SET NULL,
  quantity_original numeric NOT NULL CHECK (quantity_original > 0),
  quantity_remaining numeric NOT NULL CHECK (quantity_remaining >= 0),
  cost_per_unit numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  acquired_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tax_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tax lots"
  ON tax_lots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tax_lots_holding ON tax_lots(holding_id, acquired_at);
CREATE INDEX idx_tax_lots_user ON tax_lots(user_id);

-- 2. Tax lot disposals: which lots were consumed by a SELL
CREATE TABLE IF NOT EXISTS tax_lot_disposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sell_transaction_id uuid NOT NULL REFERENCES investment_transactions(id) ON DELETE CASCADE,
  tax_lot_id uuid NOT NULL REFERENCES tax_lots(id) ON DELETE CASCADE,
  quantity numeric NOT NULL CHECK (quantity > 0),
  cost_per_unit numeric NOT NULL,
  sell_price_per_unit numeric NOT NULL,
  realized_pnl numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tax_lot_disposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own disposals"
  ON tax_lot_disposals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_disposals_sell_tx ON tax_lot_disposals(sell_transaction_id);
CREATE INDEX idx_disposals_lot ON tax_lot_disposals(tax_lot_id);

-- 3. Add cost_method preference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_preferences'
      AND column_name = 'cost_method'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD COLUMN cost_method text NOT NULL DEFAULT 'fifo'
      CHECK (cost_method IN ('fifo', 'lifo', 'average'));
  END IF;
END$$;

-- 4. Enhanced trigger with tax lot support
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
  v_cost_method text;
  v_remaining numeric;
  v_lot record;
  v_consume numeric;
  v_total_pnl numeric := 0;
BEGIN
  -- Auto-create holding if needed (import path)
  IF NEW.holding_id IS NULL AND NEW.ticker IS NOT NULL AND NEW.type IN ('buy', 'sell', 'dividend') THEN
    SELECT id INTO v_holding_id
    FROM holdings
    WHERE user_id = NEW.user_id
      AND ticker = NEW.ticker
      AND COALESCE(account_id::text, '') = COALESCE(NEW.account_id::text, '')
      AND NOT is_closed
    LIMIT 1;

    IF v_holding_id IS NULL AND NEW.type = 'buy' THEN
      INSERT INTO holdings (
        user_id, account_id, ticker, asset_name, asset_class,
        quantity, avg_cost_per_unit, currency
      ) VALUES (
        NEW.user_id, NEW.account_id, NEW.ticker,
        COALESCE(NEW.asset_name, NEW.ticker),
        COALESCE(
          (SELECT h2.asset_class FROM holdings h2
           WHERE h2.user_id = NEW.user_id AND h2.ticker = NEW.ticker LIMIT 1),
          'other'
        ),
        0, 0, NEW.currency
      )
      RETURNING id INTO v_holding_id;
    END IF;

    IF v_holding_id IS NOT NULL THEN
      NEW.holding_id := v_holding_id;
    END IF;
  END IF;

  IF NEW.holding_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_holding FROM holdings WHERE id = NEW.holding_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get user's cost method preference
  SELECT COALESCE(cost_method, 'fifo') INTO v_cost_method
  FROM user_preferences
  WHERE user_id = NEW.user_id;
  IF v_cost_method IS NULL THEN
    v_cost_method := 'fifo';
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

    IF v_cost_method = 'average' THEN
      -- Legacy behavior: average cost
      NEW.realized_pnl := (NEW.price_per_unit - v_holding.avg_cost_per_unit) * NEW.quantity - NEW.fee;
    ELSE
      -- FIFO or LIFO: consume specific lots
      -- realized_pnl will be set after lot consumption
      NEW.realized_pnl := 0;
    END IF;

    UPDATE holdings
    SET quantity = v_new_qty,
        is_closed = (v_new_qty = 0),
        updated_at = now()
    WHERE id = NEW.holding_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. After-insert trigger for tax lot creation and consumption
--    (Separate trigger because we need the transaction ID assigned)
CREATE OR REPLACE FUNCTION process_tax_lots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost_method text;
  v_remaining numeric;
  v_lot record;
  v_consume numeric;
  v_total_pnl numeric := 0;
  v_lot_order text;
BEGIN
  IF NEW.holding_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get user's cost method preference
  SELECT COALESCE(cost_method, 'fifo') INTO v_cost_method
  FROM user_preferences
  WHERE user_id = NEW.user_id;
  IF v_cost_method IS NULL THEN
    v_cost_method := 'fifo';
  END IF;

  IF NEW.type = 'buy' AND NEW.quantity > 0 THEN
    -- Create a tax lot for every buy
    INSERT INTO tax_lots (
      user_id, holding_id, transaction_id,
      quantity_original, quantity_remaining,
      cost_per_unit, currency, acquired_at
    ) VALUES (
      NEW.user_id, NEW.holding_id, NEW.id,
      NEW.quantity, NEW.quantity,
      NEW.price_per_unit, NEW.currency, NEW.date
    );

  ELSIF NEW.type = 'sell' AND NEW.quantity > 0 AND v_cost_method != 'average' THEN
    -- Consume lots in FIFO or LIFO order
    v_remaining := NEW.quantity;

    IF v_cost_method = 'lifo' THEN
      v_lot_order := 'acquired_at DESC';
    ELSE
      v_lot_order := 'acquired_at ASC';
    END IF;

    FOR v_lot IN
      SELECT id, quantity_remaining, cost_per_unit
      FROM tax_lots
      WHERE holding_id = NEW.holding_id
        AND quantity_remaining > 0
      ORDER BY
        CASE WHEN v_cost_method = 'lifo' THEN acquired_at END DESC,
        CASE WHEN v_cost_method != 'lifo' THEN acquired_at END ASC
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_consume := LEAST(v_remaining, v_lot.quantity_remaining);

      -- Record the disposal
      INSERT INTO tax_lot_disposals (
        user_id, sell_transaction_id, tax_lot_id,
        quantity, cost_per_unit, sell_price_per_unit, realized_pnl
      ) VALUES (
        NEW.user_id, NEW.id, v_lot.id,
        v_consume, v_lot.cost_per_unit, NEW.price_per_unit,
        (NEW.price_per_unit - v_lot.cost_per_unit) * v_consume
      );

      v_total_pnl := v_total_pnl + (NEW.price_per_unit - v_lot.cost_per_unit) * v_consume;

      -- Reduce the lot
      UPDATE tax_lots
      SET quantity_remaining = quantity_remaining - v_consume
      WHERE id = v_lot.id;

      v_remaining := v_remaining - v_consume;
    END LOOP;

    -- Update the transaction's realized_pnl with lot-based calculation
    UPDATE investment_transactions
    SET realized_pnl = v_total_pnl - NEW.fee
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_tax_lots
  AFTER INSERT ON investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_tax_lots();
