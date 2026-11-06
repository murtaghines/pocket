-- investment_transactions: buy/sell/dividend/fee linked to holdings
-- Separate from legacy "investments" table (deposit/withdrawal ledger)
CREATE TABLE investment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  holding_id uuid REFERENCES holdings(id) ON DELETE SET NULL,
  account_id uuid REFERENCES accounts(id),
  type text NOT NULL CHECK (type IN ('buy', 'sell', 'dividend', 'fee')),
  ticker text,
  asset_name text,
  quantity numeric NOT NULL DEFAULT 0,
  price_per_unit numeric NOT NULL DEFAULT 0,
  total_amount numeric GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  exchange_rate numeric,
  realized_pnl numeric,            -- populated on SELL: (sell_price - avg_cost) * qty
  notes text,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investment transactions"
  ON investment_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_inv_tx_user_date ON investment_transactions (user_id, date DESC);
CREATE INDEX idx_inv_tx_holding ON investment_transactions (holding_id) WHERE holding_id IS NOT NULL;

-- Trigger function: on BUY → update holding quantity and recalculate avg cost
-- on SELL → reduce quantity, record realized P&L
CREATE OR REPLACE FUNCTION process_investment_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_holding holdings%ROWTYPE;
  v_new_qty numeric;
  v_new_avg numeric;
BEGIN
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

    -- Realized P&L = (sell_price - avg_cost) * sold_quantity - fee
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

CREATE TRIGGER trg_process_investment_transaction
  BEFORE INSERT ON investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_investment_transaction();
