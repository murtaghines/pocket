-- Track multi-track balance chain splits detected during import.
-- When a single document (PDF/CSV/Excel) contains transactions from multiple
-- sub-accounts (e.g. Revolut bundles checking + savings vault in one PDF),
-- the pipeline detects separate balance chains and stores them here so the
-- user can decide where each track's transactions should go.

-- Store split metadata on the import record
ALTER TABLE imports ADD COLUMN IF NOT EXISTS split_tracks jsonb;
COMMENT ON COLUMN imports.split_tracks IS
  'Multi-track split metadata: { status, tracks[] with opening_balance, fingerprints, sample_descriptions }. NULL when no split detected.';

-- Link auto-created accounts back to the import that spawned them
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS split_source_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
COMMENT ON COLUMN accounts.split_source_account_id IS
  'When an account was created by resolving a multi-track import split, points to the original account the import targeted.';
