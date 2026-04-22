ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_user_hidden
  ON public.transactions(user_id, is_hidden)
  WHERE is_hidden = false;