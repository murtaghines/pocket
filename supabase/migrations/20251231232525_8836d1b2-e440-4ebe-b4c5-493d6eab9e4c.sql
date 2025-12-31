-- Add transaction_hash for duplicate detection
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS transaction_hash TEXT;

-- Add linked_transaction_id for internal transfer pairs
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES public.transactions(id);

-- Drop existing type check constraint and add new one with 'transfer'
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense', 'transfer'));

-- Create unique index for duplicate detection per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_hash 
ON public.transactions(user_id, transaction_hash) 
WHERE transaction_hash IS NOT NULL;