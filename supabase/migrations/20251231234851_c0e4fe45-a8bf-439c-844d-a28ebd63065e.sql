-- Create investments table to track investment transactions
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  platform TEXT NOT NULL, -- Revolut, Cocos, MyInvestor, etc.
  asset_type TEXT, -- stocks, bonds, etf, commodities, crypto, savings, etc.
  description TEXT NOT NULL,
  original_text TEXT,
  transaction_hash TEXT,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')), -- deposit = money going into investment, withdrawal = money coming out
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create investment_accounts table to track current values
CREATE TABLE public.investment_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, account_name)
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for investments
CREATE POLICY "Users can view their own investments" ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own investments" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investments" ON public.investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own investments" ON public.investments FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for investment_accounts
CREATE POLICY "Users can view their own investment accounts" ON public.investment_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own investment accounts" ON public.investment_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investment accounts" ON public.investment_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own investment accounts" ON public.investment_accounts FOR DELETE USING (auth.uid() = user_id);

-- Create unique index for duplicate detection
CREATE UNIQUE INDEX idx_investments_user_hash ON public.investments(user_id, transaction_hash) WHERE transaction_hash IS NOT NULL;