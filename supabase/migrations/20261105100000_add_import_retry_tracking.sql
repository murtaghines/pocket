-- Phase 6.2: Add retry tracking columns to imports table
-- Enables server-side auto-retry CRON for FAILED/PARTIAL imports.

ALTER TABLE imports
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz;

COMMENT ON COLUMN imports.retry_count IS 'Number of times this import has been auto-retried by the CRON job';
COMMENT ON COLUMN imports.last_retry_at IS 'Timestamp of the last auto-retry attempt';

-- Index for the CRON query: find retryable imports efficiently
CREATE INDEX IF NOT EXISTS idx_imports_retry_candidates
  ON imports (user_id, status, retry_count, uploaded_at)
  WHERE status IN ('FAILED', 'PARTIAL') AND retry_count < 3;
