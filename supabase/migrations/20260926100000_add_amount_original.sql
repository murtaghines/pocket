-- Track the pre-edit amount for transactions the user manually changes (amount edit or
-- "Split amount"). NULL means the transaction's `amount` is still exactly as imported —
-- the overwhelming majority of rows, at zero storage/query cost.
--
-- This is deliberately scoped to per-transaction manual edits only. It is NOT related to
-- the joint-account split (`accounts.split_percentage`), which stays as-is: `amount` always
-- holds the full 100% statement value for every account, and the user's share is computed
-- at read time (frontend `applySplitFast()` / SQL `* split_percentage / 100.0`). Storing the
-- already-split value here would desync `amount` from `running_balance` (always 100%, bank-
-- reported) and break cross-account transfer reconciliation (which matches raw amounts
-- 1:1 between accounts) — see docs/epics/uploads.md and .claude/rules/imports.md.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS amount_original numeric;

COMMENT ON COLUMN public.transactions.amount_original IS
  'Pre-edit amount, set once on the first manual amount edit/split (NULL = never edited, amount is the imported value). Unrelated to accounts.split_percentage.';
