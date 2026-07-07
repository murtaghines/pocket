-- Strengthen investments dedup to parity with transactions (Fase 4).
-- Was: process-investment-file trusted an AI-generated `hash_source` string and hashed it
-- with a weak custom rolling hash; the DB index was a PARTIAL unique index (NULL bypassed
-- it entirely, same class of bug as transactions.fingerprint before Fase 4).
-- Now: transaction_hash is computed server-side only, via calculateInvestmentFingerprint
-- (SHA-256 over platform|date|amount|normalized description) -- never from AI-authored text,
-- which isn't guaranteed byte-identical across two runs of the same statement.
-- All 4 existing demo rows were backfilled with the new formula before this migration ran.

ALTER TABLE investments ALTER COLUMN transaction_hash SET NOT NULL;

DROP INDEX IF EXISTS idx_investments_user_hash;
CREATE UNIQUE INDEX idx_investments_user_hash
  ON public.investments (user_id, transaction_hash);
