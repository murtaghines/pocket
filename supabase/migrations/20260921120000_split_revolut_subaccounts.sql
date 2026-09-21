-- Split Revolut sub-account transactions into dedicated savings accounts.
-- Revolut exports mix main account + savings pockets (Instant Access Savings,
-- Savings Challenge, Rendimientos Diarios) under one account_id, which makes
-- running_balance tracks unreliable. This migration separates them.
--
-- Account IDs:
--   Personal:       7c51ebf5-9007-425c-ba75-d8c9cbb7e062
--   Savings:        73772847-0332-4915-b873-4f7eff44f807  (existing, empty)
--   Joint:          5b7f0f98-9003-480f-b7d6-9fd2e330e66e
--   Joint Savings:  (created below)

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. Create Revolut Joint Savings account (mirrors Joint's split)
-- ══════════════════════════════════════════════════════════════
INSERT INTO accounts (
  user_id, name, institution, account_type, account_role,
  currency_base, domain_default, split_percentage, initial_balance
)
VALUES (
  '156d48c3-9d0e-4b99-92ca-de5fc67aafa0',
  'Joint Savings',
  'Revolut',
  'SAVINGS',
  'CASH',
  'EUR',
  'CASHFLOW',
  50,
  1800.16   -- rb 1800.22 of first tx (interest +0.06) minus 0.06
);

-- ══════════════════════════════════════════════════════════════
-- 2. Move savings-side transactions from Revolut Personal
--    → existing Revolut Savings (73772847...)
-- ══════════════════════════════════════════════════════════════
-- 2a. ALL pre-June-2026 transactions (entire savings-only export)
UPDATE transactions
SET account_id = '73772847-0332-4915-b873-4f7eff44f807'
WHERE account_id = '7c51ebf5-9007-425c-ba75-d8c9cbb7e062'
  AND date < '2026-06-01';

-- 2b. Interest on Instant Access Savings
UPDATE transactions
SET account_id = '73772847-0332-4915-b873-4f7eff44f807'
WHERE account_id = '7c51ebf5-9007-425c-ba75-d8c9cbb7e062'
  AND description ILIKE 'Interest earned - Instant Access%';

-- 2c. Interest on Savings Challenge
UPDATE transactions
SET account_id = '73772847-0332-4915-b873-4f7eff44f807'
WHERE account_id = '7c51ebf5-9007-425c-ba75-d8c9cbb7e062'
  AND description ILIKE 'Net Interest Paid to%Savings Challenge%';

-- 2d. SavingsAccount migration
UPDATE transactions
SET account_id = '73772847-0332-4915-b873-4f7eff44f807'
WHERE account_id = '7c51ebf5-9007-425c-ba75-d8c9cbb7e062'
  AND description ILIKE 'SavingsAccount migration%';

-- 2e. Transfer pairs: savings-side of "To [savings]" = positive amount
UPDATE transactions
SET account_id = '73772847-0332-4915-b873-4f7eff44f807'
WHERE account_id = '7c51ebf5-9007-425c-ba75-d8c9cbb7e062'
  AND description ILIKE 'To%Instant Access Savings%'
  AND amount > 0;

UPDATE transactions
SET account_id = '73772847-0332-4915-b873-4f7eff44f807'
WHERE account_id = '7c51ebf5-9007-425c-ba75-d8c9cbb7e062'
  AND description ILIKE 'To EUR Savings Challenge%'
  AND amount > 0;

-- 2f. Transfer pairs: savings-side of "From [savings]" = negative amount
UPDATE transactions
SET account_id = '73772847-0332-4915-b873-4f7eff44f807'
WHERE account_id = '7c51ebf5-9007-425c-ba75-d8c9cbb7e062'
  AND description ILIKE 'From Instant Access Savings%'
  AND amount < 0;

-- ══════════════════════════════════════════════════════════════
-- 3. Move savings-side transactions from Revolut Joint
--    → new Revolut Joint Savings
-- ══════════════════════════════════════════════════════════════
-- 3a. Interest on Rendimientos Diarios
UPDATE transactions
SET account_id = (SELECT id FROM accounts WHERE name = 'Joint Savings' AND institution = 'Revolut' LIMIT 1)
WHERE account_id = '5b7f0f98-9003-480f-b7d6-9fd2e330e66e'
  AND description ILIKE 'Net Interest Paid to%Rendimientos Diarios%';

-- 3b. Transfer pairs: savings-side of "To EUR Rendimientos Diarios" = positive
UPDATE transactions
SET account_id = (SELECT id FROM accounts WHERE name = 'Joint Savings' AND institution = 'Revolut' LIMIT 1)
WHERE account_id = '5b7f0f98-9003-480f-b7d6-9fd2e330e66e'
  AND description ILIKE 'To EUR Rendimientos Diarios%'
  AND amount > 0;

-- 3c. Transfer pairs: savings-side of "From EUR Rendimientos Diarios" = negative
UPDATE transactions
SET account_id = (SELECT id FROM accounts WHERE name = 'Joint Savings' AND institution = 'Revolut' LIMIT 1)
WHERE account_id = '5b7f0f98-9003-480f-b7d6-9fd2e330e66e'
  AND description ILIKE 'From EUR Rendimientos Diarios%'
  AND amount < 0;

-- ══════════════════════════════════════════════════════════════
-- 4. NULL all running_balance on all 4 Revolut accounts
--    (tracks are contaminated from the mixed export)
-- ══════════════════════════════════════════════════════════════
UPDATE transactions
SET running_balance = NULL
WHERE account_id IN (
  '7c51ebf5-9007-425c-ba75-d8c9cbb7e062',  -- Personal
  '73772847-0332-4915-b873-4f7eff44f807',  -- Savings
  '5b7f0f98-9003-480f-b7d6-9fd2e330e66e',  -- Joint
  (SELECT id FROM accounts WHERE name = 'Joint Savings' AND institution = 'Revolut' LIMIT 1)
);

-- ══════════════════════════════════════════════════════════════
-- 5. Set initial_balance on each account
-- ══════════════════════════════════════════════════════════════
-- Personal: first main-track tx Jun 1 rb=238.69 after -27.50 → 266.19
UPDATE accounts SET initial_balance = 266.19
WHERE id = '7c51ebf5-9007-425c-ba75-d8c9cbb7e062';

-- Savings: first tx Oct 5 2025 rb=7682.32 after +2.32 → 7680.00
UPDATE accounts SET initial_balance = 7680.00
WHERE id = '73772847-0332-4915-b873-4f7eff44f807';

-- Joint: first tx Oct 1 2025 rb=3800 after -1200 → 5000.00
UPDATE accounts SET initial_balance = 5000.00
WHERE id = '5b7f0f98-9003-480f-b7d6-9fd2e330e66e';

-- Joint Savings: already set to 1800.16 in INSERT above

-- ══════════════════════════════════════════════════════════════
-- 6. Refresh dashboard views
-- ══════════════════════════════════════════════════════════════
SELECT refresh_dashboard_views();

COMMIT;
