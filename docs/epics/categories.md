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

## Auto-learning + rule-precedence follow-up (2026-07-13)

Second pass focused on making user categorization always win, and making the app learn from
corrections instead of requiring the user to discover the rule-creation flow.

**User rules now beat sign_fallback.** The sign sanity check in `process-import/index.ts`
(positive amount can't be EXPENSE, negative can't be INCOME) used to run unconditionally after
user_rules, silently overriding a rule the user explicitly created (refunds, chargebacks, bank
corrections are legitimate sign/movement mismatches). Now skipped entirely when
`categorizedBy === 'user_rule'`.

**Sparkles button auto-creates the rule — no intermediate dialog.** Previously "Sparkles" in
`InlineTransactionsEditor` opened `RuleEditorDialog` for fine-tuning before saving anything.
Now it saves the correction AND immediately inserts a `user_rules` row via
`buildRuleFromCorrection()`, then shows a toast: `Rule saved: "PATTERN" → Category` with
**Apply to all** (retroactive, reuses the same matcher/data as the preview so the count can't
drift), **Edit** (opens `RuleEditorDialog` pre-loaded, UPDATEs the just-created rule instead of
inserting a new one), and **Undo** (soft-deletes the auto-created rule). Dedup check before
insert: skips creating a duplicate if an identical active rule (same pattern + category) exists.

**`applied_count`/`last_applied_at` activated.** These `user_rules` columns existed since the
original schema but were never written. New Postgres RPC `increment_rule_stats(rule_id, hit_count)`
(migration `20260713160000_increment_rule_stats_rpc.sql`), called once per distinct matched rule
per import (batched via a `Map<ruleId, count>` accumulated during the transaction loop, not once
per transaction). `CategoryRulesList` now shows `· applied N×` / `· never applied` next to each
rule's pattern.

**`AddRuleDialog` (Settings → Categories) reached parity with `RuleEditorDialog` (imports flow).**
Extracted the preview query from `RuleEditorDialog` into a shared hook `useRulePreview`
(`src/hooks/useRulePreview.ts`) so both dialogs use the identical matcher. `AddRuleDialog` now
shows a live "Will match N existing transactions" count under the pattern input and, on save,
retroactively applies to that same set via an extended `addRule` mutation
(`useCategorizationRules.tsx`, accepts optional `matchingTransactionIds`). Also added
`ENDS_WITH` as a selectable match type (was missing from this dialog's `MATCH_TYPES` even
though `user_rules` and `RuleEditorDialog` already supported it) — added `matchHelp_ENDS_WITH`
i18n keys (en/es). New exported `buildDbRuleFields()` in `useCategorizationRules.tsx` is the
single source of truth for turning a UI pattern + match type into the DB-shaped
`{ dbType, pattern, tokens }`, used by both the mutation and the dialog's preview so they can
never compute a different match set for the same input.

Live-verified against the demo account (`ertwmshiupmickhfbaue`): created a rule from
`AddRuleDialog` with default Smart Match on "carrefour" → preview showed "Will match 3 existing
transactions" → saved → toast "3 past transactions updated" → confirmed in DB all 3 CARREFOUR*
transactions flipped to `categorized_by = 'user_rule'`. Verified Sparkles auto-create + Undo
round-trip (rule inserted with `source: 'user_correction'`, then `is_active: false` +
`deleted_at` set after Undo). Verified `increment_rule_stats` RPC updates `applied_count` and
that `CategoryRulesList` renders the badge. All test data cleaned from the demo account after
verification. 76/76 tests green, tsc/lint clean (0 errors, pre-existing warnings only), build
clean. `process-import` deployed (v18: sign_fallback fix + rule-stats tracking).

## Suggested rules from recurring AI-fallback patterns (2026-07-13)

Closes the deferred "Fase 5" from the plan: surfaces transactions that repeatedly fall through
to the AI baseline (`categorized_by = 'ai'` — neither the local categorizer nor a user_rule
matched) so the user can convert a recurring pattern into a rule with one click, instead of
correcting the same merchant every month.

New hook `src/hooks/useSuggestedRules.tsx`: queries the user's `categorized_by = 'ai'`
transactions, groups them client-side by normalized description + movement
(`src/lib/userRules.ts:normalize`), and returns groups with 3+ occurrences (top 10 by
frequency). No new backend/query needed on the categorization side — `categorized_by = 'ai'`
already implies the transaction is sitting in `other_expense`/`other_income` (or, rarely, a
`detectInternalTransfer`-set TRANSFER subtype that never got categorizer/user_rule
confirmation), so grouping by description alone is enough.

New component `src/components/settings/SuggestedRulesSection.tsx`, rendered at the top of
`CategoriesEditor`'s workspace (all tabs, not tab-scoped): each suggestion shows the pattern,
occurrence count, and movement, plus a category `<Select>` (filtered to the suggestion's
movement) and a "Create rule" button. Clicking it calls the *existing* `addRule` mutation
(`useCategorizationRules.tsx`, extended in the Fase 4 pass) with the group's transaction IDs as
`matchingTransactionIds` — reuses the same insert + retroactive-apply path `AddRuleDialog`
already uses, no new backend logic. A suggestion has no separate dismiss-tracking: once its
rule is created, its transactions flip to `categorized_by = 'user_rule'` and it naturally drops
out of the query on the next fetch (a manual "×" dismiss is also offered, client-side only, for
patterns the user wants to leave as `other_*`).

**Live-verified** against the demo account: inserted 4 synthetic `categorized_by='ai'`
transactions sharing a description ("Pago WOSAP Klindt") directly via SQL (the AI's own
extraction/natural-key dedup collapsed repeated near-identical CSV rows when tested through the
real upload path — an orthogonal AI-extraction behavior, not something this feature or the
Fase-4/5 changes touch). The suggestions section rendered it alongside two patterns already
present in the real demo data (`METRO MENSUAL`, `NETFLIX`, 3 occurrences each) — confirming the
query surfaces genuine existing gaps, not just the synthetic test case. Picked "Subscriptions",
clicked Create rule → toast "Rule created — 4 transactions updated" → confirmed in DB: rule
inserted (`pattern: "WOSAP KLINDT"`, tokens correctly stripped "PAGO" as a stopword,
`category: subscriptions`), all 4 transactions flipped to `categorized_by: 'user_rule'`, and the
suggestion disappeared from the list on refetch with no manual dismiss. Test data removed after
verification. 76/76 tests green, tsc/lint clean, build clean. Frontend-only change — no edge
function redeploy needed.
