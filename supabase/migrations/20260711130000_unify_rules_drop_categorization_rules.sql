-- Unify categorization rules into a single table (user_rules).
--
-- Prior state: two rule tables ran in parallel
--   • categorization_rules — written by the Categories page (AddRuleDialog)
--   • user_rules           — written by the imports flow (RuleEditorDialog)
--
-- The Categories-page path was broken: AddRuleDialog defaulted to match_type 'SMART',
-- which the CHECK constraint on categorization_rules forbade — every save with the
-- default rebounded at the DB level. user_rules has a richer match_type set
-- (fuzzy, contains, starts_with, ends_with, exact, regex) and is already the more-
-- exercised path. Consolidating on user_rules.
--
-- Live data at time of migration: both tables empty (verified via SELECT COUNT(*)
-- against ertwmshiupmickhfbaue on 2026-07-11), so no row-level backfill is needed.
-- The frontend hook (useCategorizationRules) and process-import were updated in the
-- same change to read/write user_rules only.
--
-- transactions.categorization_rule_id had a FK to categorization_rules that would
-- have exploded the moment either table had data — process-import already wrote
-- user_rules.id values into it (line 1268 of the pre-refactor file). The FK is
-- dropped; the column stays (now points at user_rules.id) as a plain reference so
-- existing readers (e.g. audit_log diffs) don't break. No RLS change required since
-- categorization_rules dropping removes its policies with it.

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_categorization_rule_id_fkey;

DROP TABLE IF EXISTS public.categorization_rules;
