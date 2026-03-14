ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS investment_platforms text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS joint_account_names text[] DEFAULT '{}';
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS investment_platforms text[] DEFAULT '{}';
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS joint_account_names text[] DEFAULT '{}';
