-- Fase 4: canonicalize the transactions table (data-integrity foundation).
-- Backfill safety (no-op if already clean), enforce NOT NULL on the canonical
-- movement/fingerprint keys, and drop the legacy Lovable-era drift columns.
-- Applied to the own project (ertwmshiupmickhfbaue) via the Supabase MCP; this file
-- records it in the repo for reproducibility. See docs/epics/uploads.md (Fase 4).

-- Etapa A safety backfill: derive movement from the legacy `type` where somehow missing.
UPDATE transactions SET movement = CASE type
    WHEN 'income'   THEN 'INCOME'::movement_type
    WHEN 'expense'  THEN 'EXPENSE'::movement_type
    WHEN 'transfer' THEN 'TRANSFER'::movement_type
  END
WHERE movement IS NULL;

-- Enforce the canonical dedup/classification keys.
ALTER TABLE transactions ALTER COLUMN movement SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN fingerprint SET NOT NULL;

-- Retire the legacy check constraints tied to columns we are removing.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_tx_type_check;

-- Drop the legacy / redundant columns (indexes on them are dropped automatically).
ALTER TABLE transactions
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS tx_type,
  DROP COLUMN IF EXISTS bank,
  DROP COLUMN IF EXISTS upload_id,
  DROP COLUMN IF EXISTS description_raw,
  DROP COLUMN IF EXISTS transaction_hash,
  DROP COLUMN IF EXISTS subcategory_id,
  DROP COLUMN IF EXISTS rule_id_applied,
  DROP COLUMN IF EXISTS posted_date,
  DROP COLUMN IF EXISTS auth_date,
  DROP COLUMN IF EXISTS value_date,
  DROP COLUMN IF EXISTS amount_base,
  DROP COLUMN IF EXISTS fx_rate,
  DROP COLUMN IF EXISTS payment_channel,
  DROP COLUMN IF EXISTS linked_transaction_id,
  DROP COLUMN IF EXISTS auto_recategorized,
  DROP COLUMN IF EXISTS merchant_norm;

-- Now that fingerprint is NOT NULL, replace the partial unique index with a total one.
DROP INDEX IF EXISTS idx_transactions_fingerprint;
CREATE UNIQUE INDEX idx_transactions_fingerprint
  ON public.transactions (user_id, domain, fingerprint);
