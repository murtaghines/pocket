-- Add original_description column to store the raw bank statement text.
-- Existing rows get NULL; the frontend falls back to description when NULL.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS original_description text DEFAULT NULL;
