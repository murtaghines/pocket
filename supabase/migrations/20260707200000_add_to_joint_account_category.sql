-- Add the missing to_joint_account category. The categorizer (_shared/categorizer.ts) already
-- emits this slug when a transaction matches a configured joint-account name, but there was no
-- row for it in `categories` and no entry in TRANSFER_SLUGS (_shared/categoryMap.ts), so
-- validateCategorySlug() silently fell back to 'own_transfer' before every insert — joint-account
-- transfers were indistinguishable from the user's own inter-account transfers.
--
-- The frontend was already fully wired for this category (label, icon, color CSS var,
-- TRANSFER_CATEGORIES dropdown option in categoryTranslations.ts) — only the DB row was missing.

INSERT INTO categories (domain, movement_type, slug, name, icon, color)
VALUES ('CASHFLOW', 'TRANSFER', 'to_joint_account', 'To Joint Account', 'users', 'hsl(200, 85%, 50%)')
ON CONFLICT DO NOTHING;
