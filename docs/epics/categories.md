# Epic: Categories & rules

## Main files
- src/pages/Categories.tsx
- src/components/settings/: CategoriesEditor, CategoryRulesList, AddRuleDialog,
  CreateCategoryDialog, ColorIconPicker, AccountsManager, PreferencesForm
  (`CustomCategoriesManager` never existed — a stale reference removed from this list
  2026-07-11; custom categories are managed inline in CategoriesEditor via
  CreateCategoryDialog)
- Hooks: useCategories, useCustomCategories, useCategorizationRules
- src/lib/userRules.ts (canonical rule matching — see below), categoryPalette.ts,
  lucideIcon.ts
- Edge function: process-import consumes `user_rules` for categorization at import time.
  `apply-rules-retroactive` and `fix-categorization` (mentioned here previously) were
  deleted 2026-07-07 — see docs/epics/uploads.md

## Current state (2026-07-11)

Full audit + fix pass done. Findings and fixes:

**Rule model unified.** There used to be two parallel rule tables:
`categorization_rules` (written by the Categories page, `AddRuleDialog`) and `user_rules`
(written by the imports flow, `RuleEditorDialog`). They had divergent match_type sets
(`categorization_rules`'s CHECK constraint only allowed `CONTAINS/STARTS_WITH/REGEX`, while
`AddRuleDialog`'s UI defaulted to `SMART` — every default save was silently rejected by the
DB) and no UI existed to view/edit `user_rules`. Unified onto `user_rules`:
`categorization_rules` migrated (was empty in the live DB — no data loss) and dropped
(migration `20260711130000_unify_rules_drop_categorization_rules.sql`).
`useCategorizationRules` is now a thin wrapper over `user_rules` so `CategoriesEditor` /
`CategoryRulesList` / `AddRuleDialog` keep their existing UI unchanged.

**4 correctness bugs fixed:**
- `AddRuleDialog`'s `SMART` default now maps to `user_rules`' `fuzzy` match_type (was
  rejected by the old DB constraint before the table unification above).
- Custom categories (`custom_*` slugs) no longer silently demote to `other_expense` /
  `other_income` — `validateCategorySlug` in `_shared/categoryMap.ts` now passes `custom_*`
  through instead of requiring it in `EXPENSE_SLUGS`/`INCOME_SLUGS`.
- `detectInternalTransfer` in `process-import/index.ts` now uses word-boundary regex for
  own-name matching instead of `.includes()` — a short first/last name (e.g. "Ana", "Ivo")
  no longer false-positives inside unrelated merchant names ("PALANCA", "IVOOX").
- Sign-fallback log now names the prior classification stage it overrode
  (`ex-USER_RULE`/`ex-RULE`/`ex-CATEGORIZER`/`ex-AI`) so "why did my rule stop applying" is
  answerable from logs.

**A real fuzzy-match divergence closed during the unification.** `RuleEditorDialog`'s
preview (`src/lib/userRules.ts`) required an exact whole-token match for `fuzzy` rules;
`process-import`'s old inline matcher did a plain substring check. A rule's previewed match
count could silently disagree with what it actually matched on the next import. Both paths
now call the same `ruleMatchesDescription` via a new `supabase/functions/_shared/userRules.ts`
(Deno-side copy of `src/lib/userRules.ts`, same pattern as `_shared/fingerprint.ts`).
Locked with `tests/userRules-parity.test.ts`.

**Cleanup:** removed zero-caller categorizer exports (`categorizeBatch`,
`splitByCategorizationNeed`, `dashboardSplit`, `computeMonthlyKPIs`, `buildNamePatterns`,
categorizer's own `generateSlug`), the dead `BOOKING\.COM` regex literal (dots are stripped
by `normalize()` before matching, so it could never fire), the unused `UserContext.currency`
field, and `useCustomCategories`' dead `addRuleOverride`/`updateRule`/`ruleOverrides`
(the `rule_override` custom-category-rules shape had no UI writer). Deduplicated
`CURATED_COLORS` (`src/lib/categoryPalette.ts`) and the 4x-repeated lucide icon-name resolver
(`src/lib/lucideIcon.ts`).

Full test suite: 76 tests green (`npm test`). tsc/lint clean (pre-existing unrelated warnings
only — see docs/epics/uploads.md for the ledger). `process-import` deployed (version 16).

## Decisions made
- 2026-07-11: unify on `user_rules`, not `categorization_rules` — richer match_type set,
  already the hotter path (every imports-flow edit), and the Categories-page UI was already
  broken on its own default. `categorization_rules` added no capability `user_rules` lacked.
- 2026-07-11: kept `profiles.custom_category_rules` (jsonb) as-is rather than migrating to a
  dedicated table — fixed the one real bug (slug demotion) without a schema change. Custom
  category creation/editing UX unchanged.
- 2026-07-11: i18n audit of this module's hardcoded-English strings (`CategoriesEditor`
  header, `RuleEditorDialog`, parts of `CategoryRulesList`) explicitly out of scope for this
  pass — flagged but not fixed.

## Next step
- Live-verify in the browser: create a rule from `AddRuleDialog` with the default match type,
  confirm it lands in `user_rules`; create a custom category with icon+color; run a real
  import containing a custom-category keyword and a short name to confirm bugs 2 and 3 stay
  fixed against real data (not just the demo seed).
- i18n audit flagged above, if/when prioritized.
