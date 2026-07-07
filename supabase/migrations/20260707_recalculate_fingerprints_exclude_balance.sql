-- Recalculate all fingerprints with the corrected formula.
-- OLD: hash(user_id | account_id | date | amount | currency | description_norm | running_balance)
-- NEW: hash(account_id | date | amount | currency | description_norm)
-- Reason: running_balance is dynamic (changes on reimport) → causes false-negative dedup.
--         Also added account_id explicitly to dedup key (same tx, different account = different).
--
-- Applied after fingerprint.ts and process-import/index.ts were updated to use the new formula.
-- All new imports will use the new formula; this backfill makes dedup consistent on reimport.

UPDATE transactions
SET fingerprint = encode(
  digest(
    COALESCE(account_id::text, 'no-account') || '|' ||
    date::text || '|' ||
    amount::text || '|' ||
    COALESCE(currency, 'EUR') || '|' ||
    COALESCE(description_norm, ''),
    'sha256'
  ),
  'hex'
)
WHERE fingerprint IS NOT NULL;

-- Verify: count should match pre-update count (no rows lost).
-- SELECT COUNT(*) as recomputed_count FROM transactions WHERE fingerprint IS NOT NULL;
