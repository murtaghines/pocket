-- Recategorize neobank savings pocket transfers from to_investment/from_investment
-- to own_transfer. Savings vaults, pots, and sub-accounts within neobanks are
-- internal transfers, not investments.

UPDATE transactions
SET category = 'own_transfer'
WHERE category IN ('to_investment', 'from_investment')
  AND movement = 'TRANSFER'
  AND (
    description ILIKE '%Instant Access Savings%'
    OR description ILIKE '%Savings Challenge%'
    OR description ILIKE '%Rendimientos Diarios%'
    OR description ILIKE '%Revolut Savings%'
    OR description ILIKE '%Revolut Vault%'
    OR description ILIKE '%Monzo Pot%'
    OR description ILIKE '%Monzo Savings%'
    OR description ILIKE '%Starling Savings%'
    OR description ILIKE '%N26 Spaces%'
    OR description ILIKE '%Cuenta Remunerada%'
    OR description ILIKE '%Cuenta Ahorro Plus%'
    OR description ILIKE '%Savings Pot%'
    OR description ILIKE '%To Savings Account%'
  );

SELECT refresh_dashboard_views();
