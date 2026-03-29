-- Create user_rules table
CREATE TABLE IF NOT EXISTS user_rules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  source               text NOT NULL DEFAULT 'manual',
  match_type           text NOT NULL DEFAULT 'fuzzy',
  pattern              text NOT NULL,
  tokens               text[] DEFAULT '{}',
  movement             text NOT NULL,
  category             text NOT NULL,
  confidence           float NOT NULL DEFAULT 0.99,
  created_at           timestamptz NOT NULL DEFAULT now(),
  applied_count        int NOT NULL DEFAULT 0,
  last_applied_at      timestamptz,
  original_description text,
  is_active            boolean NOT NULL DEFAULT true,
  deleted_at           timestamptz
);

-- Validation trigger instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_user_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.source NOT IN ('user_correction', 'manual') THEN
    RAISE EXCEPTION 'Invalid source: %', NEW.source;
  END IF;
  IF NEW.match_type NOT IN ('fuzzy', 'contains', 'starts_with', 'exact', 'regex') THEN
    RAISE EXCEPTION 'Invalid match_type: %', NEW.match_type;
  END IF;
  IF NEW.movement NOT IN ('INCOME', 'EXPENSE', 'TRANSFER') THEN
    RAISE EXCEPTION 'Invalid movement: %', NEW.movement;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_user_rules
  BEFORE INSERT OR UPDATE ON user_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_rules();

-- Index
CREATE INDEX IF NOT EXISTS user_rules_user_id_idx
  ON user_rules (user_id, is_active, created_at DESC);

-- RLS
ALTER TABLE user_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own rules"
  ON user_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add columns to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS rule_id_applied    uuid,
  ADD COLUMN IF NOT EXISTS user_corrected     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_recategorized boolean DEFAULT false;