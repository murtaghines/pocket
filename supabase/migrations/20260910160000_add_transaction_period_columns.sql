-- Add pre-computed period columns to transactions for faster grouping/filtering.
-- year (smallint), month (text YYYY-MM), week (text ISO YYYY-Wnn).
-- A trigger keeps them in sync whenever `date` changes.

-- 1. Add columns (nullable so the ALTER is instant)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS year  smallint,
  ADD COLUMN IF NOT EXISTS month text,
  ADD COLUMN IF NOT EXISTS week  text;

-- 2. Trigger function: compute period columns from `date`
CREATE OR REPLACE FUNCTION compute_transaction_periods()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.year  := EXTRACT(YEAR FROM NEW.date::date)::smallint;
  NEW.month := TO_CHAR(NEW.date::date, 'YYYY-MM');
  NEW.week  := TO_CHAR(NEW.date::date, 'IYYY') || '-W' || LPAD(EXTRACT(WEEK FROM NEW.date::date)::text, 2, '0');
  RETURN NEW;
END;
$$;

-- 3. Attach trigger (BEFORE INSERT OR UPDATE on date)
DROP TRIGGER IF EXISTS trg_compute_periods ON transactions;
CREATE TRIGGER trg_compute_periods
  BEFORE INSERT OR UPDATE OF date
  ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION compute_transaction_periods();

-- 4. Backfill existing rows (fires the trigger automatically)
UPDATE transactions
SET date = date
WHERE year IS NULL;

-- 5. Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_year
  ON transactions (user_id, year);

CREATE INDEX IF NOT EXISTS idx_transactions_user_month
  ON transactions (user_id, month);

CREATE INDEX IF NOT EXISTS idx_transactions_user_week
  ON transactions (user_id, week);
