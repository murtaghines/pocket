-- Joint savings is its own account type.
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'JOINT_SAVINGS';
