-- Add archived flag to accounts for closed/inactive accounts
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
