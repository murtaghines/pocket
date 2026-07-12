-- Backfill account_id on the 3 demo seed imports that were uploaded without
-- going through AccountSelectDialog (the dialog was added after the seed was run).
-- All 3 files generated transactions for BBVA/Checking (the primary account),
-- confirmed by inspecting transactions.account_id before applying.
-- Uses subquery lookup so it works regardless of which UUID the account has.
UPDATE imports
SET account_id = (
  SELECT a.id
  FROM accounts a
  JOIN profiles p ON p.user_id = a.user_id
  WHERE p.email = 'demo@pocket.app'
    AND a.institution = 'BBVA'
    AND a.name = 'Checking'
  LIMIT 1
)
WHERE user_id = (
  SELECT user_id FROM profiles WHERE email = 'demo@pocket.app'
)
  AND account_id IS NULL
  AND domain = 'CASHFLOW';
