-- Account & settings redesign: number-format preference and account notes.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS show_decimals boolean NOT NULL DEFAULT true;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS notes text;
