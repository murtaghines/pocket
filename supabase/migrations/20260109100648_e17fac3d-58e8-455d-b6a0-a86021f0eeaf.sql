-- Create unique constraint for fingerprint-based deduplication
-- This allows the upsert with ON CONFLICT to work properly
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_domain_fingerprint_unique 
ON public.transactions (user_id, domain, fingerprint) 
WHERE fingerprint IS NOT NULL;