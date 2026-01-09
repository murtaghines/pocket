-- Create unique constraint for transaction deduplication
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_domain_fingerprint_key 
ON public.transactions (user_id, domain, fingerprint) 
WHERE fingerprint IS NOT NULL;