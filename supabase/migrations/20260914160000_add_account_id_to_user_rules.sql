-- Add optional account scope to categorization rules.
-- When account_id is NULL the rule applies to all accounts;
-- when set it only matches transactions from that account.
ALTER TABLE user_rules
  ADD COLUMN account_id uuid REFERENCES accounts(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX idx_user_rules_account
  ON user_rules (user_id, account_id, is_active)
  WHERE is_active = true;
