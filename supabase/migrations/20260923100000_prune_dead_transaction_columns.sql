-- Schema audit: prune dead / redundant columns from `transactions`.
--
--   description_clean      — 100% identical to `description` across all rows (0 differ); its
--                            index was already dropped in 20260818200000. The display uses
--                            `description`; the AI's cleaned text still feeds it at import time.
--   source_transaction_id  — never populated (0 rows); the extractor doesn't produce it for the
--                            supported bank formats and no reader depends on it.
--
--   counterparty_raw       — sparsely filled (12 rows); the reconciler's third-party guard and
--                            confirmatory signal now read the description instead (banks name the
--                            other party there), which is always present, so the guard works far
--                            more often than it did off this column.

ALTER TABLE public.transactions DROP COLUMN IF EXISTS description_clean;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS source_transaction_id;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS counterparty_raw;
