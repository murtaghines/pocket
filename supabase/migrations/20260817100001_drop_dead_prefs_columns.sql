-- Phase 2: Drop unused user_preferences columns.
-- These columns were never read by any component and only added dead weight.

ALTER TABLE public.user_preferences
  DROP COLUMN IF EXISTS selected_categories,
  DROP COLUMN IF EXISTS investment_platforms,
  DROP COLUMN IF EXISTS locale,
  DROP COLUMN IF EXISTS joint_account_split;
