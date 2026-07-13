-- Fase 6A: Cross-account transfer reconciliation support.
-- Two transactions that form a matched transfer pair share the same UUID.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_pair_id UUID;

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_pair
  ON public.transactions (transfer_pair_id)
  WHERE transfer_pair_id IS NOT NULL;

COMMENT ON COLUMN public.transactions.transfer_pair_id IS
  'Shared UUID linking two transactions that are opposite sides of the same money movement between the user''s own accounts. Set by the reconciliation pass in process-import, never at initial INSERT.';
