-- Add color and is_primary to accounts
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Trigger function: ensure only one primary account per user
CREATE OR REPLACE FUNCTION public.ensure_single_primary_account()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.accounts
       SET is_primary = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_single_primary_account ON public.accounts;
CREATE TRIGGER trg_ensure_single_primary_account
BEFORE INSERT OR UPDATE OF is_primary ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_primary_account();

-- Helpful index for primary lookups
CREATE INDEX IF NOT EXISTS idx_accounts_user_primary
  ON public.accounts(user_id) WHERE is_primary = true;