-- Expand account_type enum: add JOINT (bank) and investment subtypes
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'JOINT';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'BROKERAGE';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'CRYPTO';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'RETIREMENT';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'REAL_ESTATE';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'OTHER_INVESTMENT';

-- Migrate existing generic INVESTMENTS rows to BROKERAGE
UPDATE public.accounts
  SET account_type = 'BROKERAGE'
  WHERE account_type = 'INVESTMENTS';
