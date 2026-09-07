-- Drop stale 3-column unique indexes that block cross-account same-content transactions.
-- The canonical index is now idx_transactions_fingerprint(user_id, domain, account_id, fingerprint)
-- created in migration 20260905143000.
DROP INDEX IF EXISTS transactions_user_domain_fingerprint_unique;
DROP INDEX IF EXISTS transactions_user_domain_fingerprint_key;
