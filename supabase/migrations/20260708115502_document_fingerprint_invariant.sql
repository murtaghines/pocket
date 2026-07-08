-- Integrity invariant, documented at the DB level so it survives dashboard/schema churn.
--
-- `fingerprint` is computed ONCE at import time from the file's original values
-- (account | date | amount | currency | normalized description, or a bank-provided
-- source transaction id) and is the key the unique index
-- idx_transactions_fingerprint (user_id, domain, fingerprint) dedups on when the same
-- statement is re-uploaded.
--
-- It must NEVER be recomputed on UPDATE. User edits (amount, category, movement, hide)
-- are a "shaped view" layer written in place to other columns; the fingerprint stays
-- frozen so a re-upload of the same file still matches the original row and is skipped
-- (ON CONFLICT DO NOTHING) instead of creating a duplicate. Do not add a BEFORE/AFTER
-- UPDATE trigger that regenerates it, and never include `fingerprint` in an edit's
-- update payload. See docs/epics/uploads.md "Modelo de integridad".
COMMENT ON COLUMN public.transactions.fingerprint IS
  'Dedup key, SHA-256 of the file''s ORIGINAL import values. Frozen at import — NEVER recompute on UPDATE (would break re-upload dedup). Enforced by idx_transactions_fingerprint. See docs/epics/uploads.md.';
