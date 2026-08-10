-- Manual entries must never be linked to an import.
--
-- AddManualEntryDialog used to stamp new entries with the month's first import_id
-- whenever that month already had a statement. Two consequences:
--   1. the UI read them back as "imported" and locked their date/description/account;
--   2. deleteImport() deletes every transaction carrying the import_id, so deleting
--      the statement silently deleted the user's own entries along with it.
--
-- Manual entries are identified by their `manual-` fingerprint prefix, minted at
-- insert time (see src/lib/transactionSource.ts) — imported rows always carry a
-- content sha256 instead, so this can't touch a genuinely imported row.
UPDATE public.transactions
SET import_id = NULL
WHERE import_id IS NOT NULL
  AND fingerprint LIKE 'manual-%';
