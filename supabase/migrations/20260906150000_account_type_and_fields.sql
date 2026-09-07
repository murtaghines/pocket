-- Add account_type enum and new columns to accounts table
CREATE TYPE public.account_type AS ENUM (
  'CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH',
  'INVESTMENTS', 'LOAN', 'OTHER'
);

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS account_type public.account_type,
  ADD COLUMN IF NOT EXISTS account_number text;

-- Backfill existing rows from account_role
UPDATE public.accounts SET account_type = 'INVESTMENTS'
  WHERE account_role = 'INVESTMENT' AND account_type IS NULL;
UPDATE public.accounts SET account_type = 'CHECKING'
  WHERE account_role = 'CASH' AND account_type IS NULL;

-- Make NOT NULL with default after backfill
ALTER TABLE public.accounts ALTER COLUMN account_type SET NOT NULL;
ALTER TABLE public.accounts ALTER COLUMN account_type SET DEFAULT 'CHECKING';
