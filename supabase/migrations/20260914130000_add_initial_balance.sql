-- Add initial_balance to accounts for opening balance calculation
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS initial_balance numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.accounts.initial_balance IS
  'Balance seed: the account balance just before the earliest tracked transaction. '
  'For file uploads, auto-set from the first statement opening balance. '
  'For manual/cash accounts, user-provided. All period balances derive from this.';
