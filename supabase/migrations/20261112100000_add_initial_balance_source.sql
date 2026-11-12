-- Track how initial_balance was determined so the UI can flag accounts that
-- need manual review (the pipeline couldn't auto-infer their opening balance).
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS initial_balance_source text;

COMMENT ON COLUMN public.accounts.initial_balance_source IS
  'How initial_balance was set: inferred (from running_balance chain), '
  'multi_track (decomposed multi-pocket chains), user (manually set), '
  'failed (pipeline could not determine — needs review). NULL = legacy/unknown.';

-- Backfill existing accounts:
-- Accounts with initial_balance != 0 were already inferred or manually fixed.
UPDATE accounts SET initial_balance_source = 'inferred'
WHERE initial_balance IS NOT NULL AND initial_balance != 0
  AND initial_balance_source IS NULL;

-- Accounts with transactions but ALL running_balance = NULL and initial_balance = 0
-- are the bug case (multi-track data was NULLed, inference failed silently).
UPDATE accounts a SET initial_balance_source = 'failed'
WHERE COALESCE(a.initial_balance, 0) = 0
  AND initial_balance_source IS NULL
  AND EXISTS (SELECT 1 FROM transactions t WHERE t.account_id = a.id LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.account_id = a.id AND t.running_balance IS NOT NULL
    LIMIT 1
  );
