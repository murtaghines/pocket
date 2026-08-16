-- Phase 1: Indexes to support the new aggregation RPCs.

-- audit_log: currently has NO indexes beyond PK
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON audit_log(user_id, created_at DESC);

-- transactions: composite for dashboard summary / monthly series queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_month
  ON transactions(user_id, domain, date)
  WHERE is_hidden = false;

-- transactions: composite for category breakdown queries
CREATE INDEX IF NOT EXISTS idx_transactions_category_agg
  ON transactions(user_id, domain, movement, category)
  WHERE is_hidden = false;
