-- The RuleEditorDialog UI offers 5 match types (fuzzy, contains, starts_with,
-- ends_with, exact) but validate_user_rules()'s allowlist was missing
-- 'ends_with', so picking that option in the UI fails at insert with
-- "Invalid match_type: ends_with". Also normalize casing defensively before
-- validating, so any future caller sending uppercase values (e.g. matching the
-- categorization_rules table's convention) degrades to a clean insert instead
-- of a raw "Invalid match_type: CONTAINS"-style trigger exception.
CREATE OR REPLACE FUNCTION public.validate_user_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.source NOT IN ('user_correction', 'manual') THEN
    RAISE EXCEPTION 'Invalid source: %', NEW.source;
  END IF;
  NEW.match_type := lower(NEW.match_type);
  IF NEW.match_type NOT IN ('fuzzy', 'contains', 'starts_with', 'ends_with', 'exact', 'regex') THEN
    RAISE EXCEPTION 'Invalid match_type: %', NEW.match_type;
  END IF;
  IF NEW.movement NOT IN ('INCOME', 'EXPENSE', 'TRANSFER') THEN
    RAISE EXCEPTION 'Invalid movement: %', NEW.movement;
  END IF;
  RETURN NEW;
END;
$$;
