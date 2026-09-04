-- Backfill original_description for existing imported transactions.
-- At this point no transaction has ever had its description edited (audit_log confirms
-- only category/amount/is_hidden changes), so the current `description` column is the
-- import-time value and is safe to copy.
UPDATE transactions
SET original_description = description
WHERE import_id IS NOT NULL
  AND original_description IS NULL;
