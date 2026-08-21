-- Phase 7: Drop dead column + redundant indexes from transactions
--
-- original_text: always NULL across all 47 rows, never written or read
-- by any edge function or frontend code (investments.original_text is separate).
--
-- Index cleanup:
--   idx_transactions_category        — subsumed by idx_transactions_category_agg
--   idx_transactions_category_source — bare column, never queried without user_id
--   idx_transactions_description_clean — bare column, no query uses it
--   transactions_movement_idx        — bare column, never queried without user_id
--   idx_transactions_user_date       — subsumed by idx_transactions_user_month (user_id, domain, date)

-- 1. Drop dead column
ALTER TABLE public.transactions DROP COLUMN IF EXISTS original_text;

-- 2. Drop redundant indexes
DROP INDEX IF EXISTS public.idx_transactions_category;
DROP INDEX IF EXISTS public.idx_transactions_category_source;
DROP INDEX IF EXISTS public.idx_transactions_description_clean;
DROP INDEX IF EXISTS public.transactions_movement_idx;
DROP INDEX IF EXISTS public.idx_transactions_user_date;
