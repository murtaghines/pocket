-- Fix interest-on-savings transactions miscategorized as TRANSFER
-- due to now-corrected user_rules. Interest payments should be INCOME / investment.
-- Idempotent: only updates rows that are still wrong.

UPDATE transactions t
SET movement  = 'INCOME',
    category  = 'investment'
FROM accounts a
WHERE t.account_id = a.id
  AND t.movement = 'TRANSFER'
  AND a.account_type IN ('SAVINGS', 'JOINT_SAVINGS')
  AND t.description ~* '(NET\s*INTEREST\s*PAID|INTEREST\s*PAID\s*TO|SAVINGS?\s*INTEREST|INTEREST\s*EARNED|GROSS\s*INTEREST)'
  AND t.category NOT IN ('investment');

-- Fix missed user_rule: "WITHDRAWAL FROM RENDIMIENTOS DIARIOS" was to_joint_account,
-- should be from_investment (withdrawals from the Rendimientos Diarios fund).
UPDATE user_rules
SET category = 'from_investment'
WHERE pattern = 'WITHDRAWAL FROM RENDIMIENTOS DIARIOS'
  AND category = 'to_joint_account';

-- Refresh materialized views so dashboard numbers update
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_totals;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_opening_balances;
