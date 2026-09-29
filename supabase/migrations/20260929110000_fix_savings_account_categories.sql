-- Fix existing transactions on SAVINGS-type accounts: from the savings
-- account's perspective every transfer is just money moving to/from the
-- user's own checking account.  Positive amounts → from_myself, negative
-- amounts → own_transfer.  This corrects transactions that were
-- incorrectly categorized as to_investment, from_investment, to_savings,
-- from_savings, etc. before the categorizer had account-type awareness.

-- Positive TRANSFER amounts on SAVINGS accounts → from_myself
UPDATE transactions t
SET category    = 'from_myself',
    category_id = (SELECT id FROM categories
                   WHERE slug = 'from_myself' AND domain = 'CASHFLOW' LIMIT 1)
FROM accounts a
WHERE a.id = t.account_id
  AND a.account_type = 'SAVINGS'
  AND t.movement = 'TRANSFER'
  AND t.amount >= 0
  AND t.category IS DISTINCT FROM 'from_myself';

-- Negative TRANSFER amounts on SAVINGS accounts → own_transfer
UPDATE transactions t
SET category    = 'own_transfer',
    category_id = (SELECT id FROM categories
                   WHERE slug = 'own_transfer' AND domain = 'CASHFLOW' LIMIT 1)
FROM accounts a
WHERE a.id = t.account_id
  AND a.account_type = 'SAVINGS'
  AND t.movement = 'TRANSFER'
  AND t.amount < 0
  AND t.category IS DISTINCT FROM 'own_transfer';

-- Refresh materialized views so KPIs reflect the corrected categories
SELECT refresh_dashboard_views();
