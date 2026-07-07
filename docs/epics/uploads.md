# Epic: Uploads & imports

## Main files
- src/pages/MyData.tsx (uploads hub — bank statements + investments tabs)
- src/components/imports/: BankStatementsTabsView, InvestmentTabsView, RuleEditorDialog,
  AccountSelectDialog, MonthReviewModal.tsx (now just `AddManualEntryDialog` — the
  actual review/edit table lives inline in BankStatementsTabsView)
- Hooks: useImports, useMonthlyFileUpload, useMonthlyInvestmentUpload
- src/lib/excelParser.ts
- Edge functions: process-import, process-financial-file (dead, slated for deletion),
  process-investment-file, check-data-integrity. (`apply-rules-retroactive` and
  `fix-categorization` deleted 2026-07-07 — see Fase 4 notes below.)
- Shared module: supabase/functions/_shared/categorizer.ts (categorization engine — not
  a deployed function)

## Shared finances (2026-07-07)
Investigated how the app should handle shared/joint finances — the user lives with a partner
and wanted to know if uploading a partner's own bank statement (not a joint account) was
supported, so shared costs (rent, groceries) could count as "their share" even though they
didn't make the payment. Findings, before deciding on scope:

- `user_preferences.joint_account_split` (a %, editable in Settings) is **completely dead** —
  saved but never read by any calculation anywhere in the app. Same class of issue as the
  `RuleEditorDialog` "will retroactively match" promise found earlier this session: a setting
  that implies a capability that doesn't exist.
- `accounts` has no ownership dimension at all (`account_role` is only `CASH | INVESTMENT`) —
  every account is implicitly assumed to be 100% the logged-in user's. `AccountSelectDialog`
  only ever asks "which account is this file from," never "whose account is this."
- The two specific multi-person scenarios the user was most worried about — a parent's account
  with a child's sub-account, and an authorized additional cardholder on a shared credit card —
  are actually a **different, simpler problem** than importing a genuinely separate person's
  full statement: they're both "attribution within an account you already own" (a bank
  sub-account is usually its own section in the same PDF → just create a second `accounts` row;
  an authorized cardholder is just text in the description, closer to needing a `cardholder` tag
  than a shared-ownership model). Neither requires solving the harder "two people's separate
  finances" problem.
- Decided NOT to build automatic multi-person statement import (schema for account ownership +
  UI to cherry-pick which lines of someone else's statement are "shared" + deciding what happens
  to the rest of their spending) — disproportionate build cost for a case the user themselves
  doubted many people would use. A joint account (both names on one real account) already works
  today via the `to_joint_account` fix above — no split needed, it's the household's money, not
  divided.
- Implemented instead: a "Shared expense" toggle in `AddManualEntryDialog` (in
  `MonthReviewModal.tsx`). Off by default. When on, replaces the single Amount field with
  "Total amount paid" + "Your share (%)" (default 50), computes your share, and appends a
  self-documenting note to the description (`"Alquiler (50% of 1.200,00 €)"`) — **zero schema
  change**, the split is fully derivable from the saved description text. Verified live: typed
  Alquiler / 1200 total / 50% → correctly showed "You'll save this as 600,00 €" → submitted →
  DB row confirmed `amount: -600.00`, `description: "Alquiler (50% of 1.200,00 €)"`. Deleted the
  test row after. Files: `src/components/imports/MonthReviewModal.tsx`.

## Current state
Full audit done (2026-07-06) + a **test safety net now exists** (Vitest, 33 tests). The
5-phase action plan lives in the approved plan file; Fase 0 (safety net) is complete.

Verified pipeline map:
- Live (CASHFLOW): `useMonthlyFileUpload` → extract (CSV/Excel/pdfjs) → `process-import`
  (Lovable AI + `_shared/categorizer.ts` + sign guardrails + fingerprint dedup) →
  `transactions` → `check-data-integrity`. Inline review = `MonthWorkspace`.
- Live (INVESTING): `useMonthlyInvestmentUpload` → `process-investment-file` (AI only, no
  categorizer) → `investments`. Auto-processes with no preview.
- **No frontend callers** (grep-confirmed): `process-financial-file` (legacy, delete),
  `apply-rules-retroactive`, `fix-categorization` (retroactive rule apply is done inline in
  `RuleEditorDialog.tsx`). Investigate the latter two before deciding.
- IA to migrate off Lovable → Anthropic: `process-import/index.ts:669-676`,
  `process-investment-file/index.ts:160-167`.

## Decisions made
- 2026-07-05: moved these components here from `src/components/profile/` (which is now
  account-settings-only) to match the module boundary already documented in
  `.claude/rules/imports.md`. `InvestmentUploadsOrganizer.tsx` was NOT moved — it was
  dead code (zero importers) and got deleted instead.
- 2026-07-05: found (while trying to visually verify a logo fix) that `MonthUploadSlot.tsx`
  and the `MonthReviewModal` component inside `MonthReviewModal.tsx` were **dead legacy
  UI** — `MonthUploadSlot` had zero importers anywhere, and `MonthReviewModal` was only
  ever rendered from within it. The actual live review/edit table is the inline
  `MonthWorkspace` in `BankStatementsTabsView.tsx`. Deleted `MonthUploadSlot.tsx` entirely
  and trimmed `MonthReviewModal.tsx` down to just its other export, `AddManualEntryDialog`
  (still live, used by BankStatementsTabsView), from 2194 lines to ~330. This is why the
  earlier logo-system audit couldn't visually confirm that fix through the live app — the
  code was correct but unreachable.

## Known issues / pending review
Canonical list of things surfaced but not yet fixed — keep this updated as new ones appear.
Each is locked in a characterization test where noted, so a fix is a deliberate test update.

Correctness (categorization / dedup):
- [x] **`to_joint_account` collapses to `own_transfer`** — fixed 2026-07-07. Added the missing
  `categories` row (migration `20260707200000_add_to_joint_account_category.sql`) and added
  `'to_joint_account'` to `TRANSFER_SLUGS` in `_shared/categoryMap.ts`. The frontend
  (`categoryTranslations.ts`: label, icon, color CSS var, `TRANSFER_CATEGORIES` dropdown
  option) was already fully wired for this slug and needed zero changes — only the DB row and
  the backend allow-list were missing. Verified via a smoke-test insert (real FK to the new
  category row resolves, then deleted). Deployed `process-import`. (test:
  `tests/categoryMap.test.ts`)
- [x] **`\b`-anchored rules miss `.COM`-style descriptors** — fixed 2026-07-07.
  `normalize("NETFLIX.COM")` used to produce `"NETFLIXCOM"` (the existing H&M-merge regex
  glued the dot-separated halves together), so `'NETFLIX\b'` never matched. Fix: a new
  `GLUED_TLD` regex (`\.(COM|NET|ORG|INFO|APP|IO|CO|ES|AR|CL|UY|MX)\b`) runs BEFORE the
  H&M-merge step and splits recognized TLDs out with a space — `"NETFLIX.COM"` →
  `"NETFLIX COM"` — so the merge no longer touches them and the boundary survives.
  The `\b` after the TLD group means it doesn't fire mid-word (`"NETFLIX.COMPANY"` stays
  `"NETFLIXCOMPANY"`, not split). Only `categorizer.ts` needed the fix — checked the two other
  `normalize`-shaped functions in the repo (`src/lib/userRules.ts` and
  `_shared/fingerprint.ts`'s `normalizeDescription`) and neither has the H&M-merge step that
  causes this, so neither had the bug. Also fixed the stale docstring example at the top of the
  file (line 79) while in there. Reviewed by `imports-reviewer` subagent for rule collisions,
  which caught a real mirror-image regression before it shipped to real users: the rule table
  had `'CRYPTOCOM\b'` (Crypto.com exchange, `to_investment`) relying on the exact glued form
  this fix removes — after the TLD split, `"CRYPTO.COM"` → `"CRYPTO COM"`, so the glued-form
  rule stopped matching entirely. Fixed by changing it to `'CRYPTO\s*COM\b'` (same style already
  used for `'PUBLIC\s*COM'`, which was never at risk). Reviewer also confirmed: no other rule
  in the ~2500-pattern table assumes a glued TLD form; the `\b` anchor correctly refuses to
  fire mid-word; and `BOOKING\.COM` (`categorizer.ts:2333`) is pre-existing dead code unrelated
  to this change — a literal `\.` in a rule pattern can never match since `normalize()` strips
  dots before any rule runs (the working rule right next to it, `BOOKING\s*COM`, is what
  actually fires). Left as a separate, low-priority cleanup item, not fixed here. Added a
  regression test (`tests/categorizer.test.ts`) and a warning comment next to `GLUED_TLD` for
  future rule authors. Deployed `process-import` twice (once for the base fix, once for the
  regression fix). (test: `tests/categorizer.test.ts`)
- [x] **`running_balance` in the fingerprint** — fixed 2026-07-07. Removed from dedup formula
  because it's dynamic (changes on reimport when earlier-dated transactions appear). Recalculated
  all 12 existing demo fingerprints with new formula: `hash(account_id | date | amount |
  currency | description_norm)` — also added account_id explicitly (same transaction in two
  accounts = different fingerprint). Updated test `tests/fingerprint.test.ts` to verify new
  behavior. Deployed `process-import` and fixed `useTransactions.tsx` bug: opening balance
  calculation used stale `tx.bank` (dropped in Fase 4) instead of `tx.account_id`.
- [x] **Sign fallback mislabeled `categorized_by='ai'`** — fixed 2026-07-07: the sign guardrail
  (`process-import/index.ts:~1303-1320`) now sets `categorized_by = 'sign_fallback'` and
  `category_source = 'SIGN_FALLBACK'` when it overrides the movement, instead of leaving
  whatever the prior classifier stage had set. Checked consumers first: no frontend UI reads
  `categorized_by` for display/filtering (only writes `'user'` on manual edits); the two
  zero-caller edge functions (`apply-rules-retroactive`, `fix-categorization`) only check
  `categorized_by NOT IN ('user','user_rule')` to decide reprocessing eligibility — a
  `sign_fallback` row correctly stays eligible under that check, so no consumer breaks. No DB
  constraint restricts the column's values. Deployed.
- [x] **Fingerprint can be NULL** → fixed in Fase 4 (2026-07-07): `fingerprint` is now `NOT NULL`
  with a total `UNIQUE (user_id, domain, fingerprint)` index, DB-enforced.
- [x] **Investment dedup was weaker than transactions'** — fixed 2026-07-07. Two real gaps
  closed:
  1. `process-investment-file` trusted an AI-generated `hash_source` string, hashed with a
     weak custom rolling hash (not SHA-256). An LLM's formatting of the same statement isn't
     guaranteed byte-identical across two runs — the exact class of bug `running_balance`
     caused for transactions — so dedup could silently break on reimport. The hash is now
     computed entirely server-side from validated fields via a new
     `calculateInvestmentFingerprint(platform, date, amount, description)` in
     `_shared/fingerprint.ts` (mirrors `calculateFingerprint`'s design: identity fields only,
     `type` deposit/withdrawal excluded same as movement/category are for transactions).
     Removed `hash_source` from the AI prompt/schema entirely — it was never needed once the
     hash is computed independently.
  2. The old hash didn't include the platform, so the same deposit reported on two different
     platforms (e.g. Revolut vs MyInvestor) would have collided as a false duplicate — same
     gap `account_id` fixed for transactions. `platform` is now hashed after
     `normalizePlatform()` runs (not the AI's raw wording), so "Savings" vs "Revolut Savings"
     for the same real platform doesn't fragment dedup either.
  3. DB: `investments.transaction_hash` was a nullable column behind a **partial** unique
     index (`WHERE transaction_hash IS NOT NULL`) — NULL silently bypassed dedup, same gap
     transactions had pre-Fase-4. Migration `20260707190000_investments_strong_dedup.sql` sets
     `transaction_hash SET NOT NULL` and replaces the partial index with a total
     `UNIQUE(user_id, transaction_hash)`. Backfilled all 4 existing demo rows with the new
     formula (computed via the real deployed function, not hand-derived, to guarantee byte
     parity) before applying the constraint — verified 4 rows → 4 distinct hashes after.
  New tests in `tests/fingerprint.test.ts` (`calculateInvestmentFingerprint` describe block).
  Deployed `process-investment-file`.

Cleanliness / product:
- [x] **Orphan edge functions** `apply-rules-retroactive` + `fix-categorization` — investigated
  and resolved 2026-07-07. Neither was ever deployed to the own project (confirmed via
  `list_edge_functions` — only 6 functions exist there, these two aren't among them) and
  grep found zero callers anywhere in the repo, confirming both were genuinely dead.
  `fix-categorization` was also **actively broken**: it wrote to `transactions.type`, a column
  dropped in the Fase 4 migration, and read `joint_account_names`/`investment_platforms` from
  `profiles` instead of `user_preferences` — the exact bug already found and fixed in
  `process-import` (see Fase 3 notes below) but never applied here. Deleted outright — it was a
  one-off migration script (`categorized_by: 'fix_script_v2'`), not a reusable capability.
  `apply-rules-retroactive` was well-built but its only plausible caller, `RuleEditorDialog`
  (rendered in `InlineTransactionsEditor.tsx`, imported and wired to a `categoryRulePrompt`
  state), turned out to be **dead code too** — `setCategoryRulePrompt` was never called with a
  real value anywhere, only reset to `null`, so the dialog could never open. Its "Live preview:
  Will retroactively match transactions in your history" copy was a promise the app never kept:
  the actual live "save as rule" flow (the second Sparkles-tick path in `commitRow`) silently
  auto-created a CONTAINS-only `user_rules` row with copy correctly saying "Future transactions"
  — forward-only, no retroactive apply, which was honest but blunt (no control over match type).
  Fix: wired `RuleEditorDialog` into the live flow (`commitRow`'s `withRule=true` branch now opens
  it via `setCategoryRulePrompt` instead of silently inserting), and made the retroactive promise
  real — `RuleEditorDialog`'s preview query now returns the matched transaction ids (not just a
  count), excluding rows already `categorized_by IN ('user','user_rule')`, and `onConfirm` bulk-
  updates exactly that set after inserting the `user_rules` row. Applying the *same* ids that were
  previewed (not a second server-side re-match) guarantees the shown count can never drift from
  what actually changes — this is why the two edge functions were deleted rather than fixed: their
  SQL `ilike`-based matching doesn't understand the fuzzy/starts_with/ends_with/exact match types
  the client's `ruleMatchesDescription` supports, so keeping both matchers in sync forever was the
  wrong shape for this fix. Verified: tsc clean, eslint clean, 56/56 tests green, Vite build clean.
- [x] **`Function()` amount eval** — replaced with `src/lib/safeMath.ts` (recursive-descent
  parser, no eval), 11 tests. (Fase 5, done 2026-07-06)
- [x] **Investment flow** auto-processes with no preview — fixed 2026-07-07: added a
  preview step matching the bank flow. `process-investment-file` now takes `previewOnly`
  (parses + dedups against existing hashes, returns the would-be-inserted rows, skips the
  `investments` insert and the `imports` status update). Frontend does two calls:
  `previewOnly: true` on upload → shows `InvestmentPreviewDialog` (date/description/
  platform/type/amount table + deposit/withdrawal counts) → user confirms →
  `previewOnly: false` re-runs the same parse+dedup and persists. New:
  `src/components/imports/investments/InvestmentPreviewDialog.tsx`. Deployed. (Dedup strength
  parity — see "Investment dedup was weaker than transactions'" above — fixed separately.)
- [ ] **UI retry** button consuming the new `failed`/`partial` response fields. (Fase 1)
- [ ] **`import_status` has no PARTIAL** — partial imports are marked NORMALIZED + `error_message`;
  a real `PARTIAL` enum value (migration) would be cleaner.

Fixed already: `extractMonthKey` "NaN-NaN" (Fase 1); `mapCategorySlug` completeness guard added;
`userContext` always-undefined bug and the `categorization_rules` N+1 (both below, 2026-07-07).

## Fase 3 deploy + real-file smoke-test (2026-07-07)
Deployed `process-import` + `process-investment-file` to Supabase (project ertwmshiupmickhfbaue)
for the first time, with the ANTHROPIC_API_KEY secret now set. Smoke-tested against real
anonymized Revolut statements (personal checking, joint account, investment CSV) via direct
edge-function calls (demo user, real JWT) since browser login in the dev server wasn't working.
Found and fixed two production bugs live during this pass:

- [x] **P0 — `userContext` was `undefined` for every user, always.** `process-import` loaded
  the profile with `.from('profiles').select('first_name, last_name, joint_account_names,
  investment_platforms, custom_category_rules')` — but `joint_account_names` and
  `investment_platforms` live in `user_preferences`, not `profiles` (confirmed via direct
  REST query: `column profiles.joint_account_names does not exist`, and a comment in
  `src/pages/Auth.tsx:433` documenting the correct table). Since the code destructured
  `{ data: userProfile }` without checking `error`, the whole profiles fetch silently failed
  and `userProfile` was `undefined` — collapsing `userContext` to `undefined` for 100% of
  imports. This silently disabled: name-based `own_transfer` detection, joint-account
  detection, custom categories, and category-rule overrides, for every user, always.
  **Fix (deployed):** split the query correctly — `profiles` now selects only
  `first_name, last_name, custom_category_rules`; `user_preferences` now selects
  `country, base_currency, joint_account_names` (dropped `investment_platforms`, unused).
  Verified live: joint-account transfers between the demo user and her co-holder went from
  100% miscategorized as `other_income`/`other_expense` to correctly detected as `TRANSFER`
  once `user_preferences.joint_account_names` was populated (10-row synthetic test, 6/10
  correctly flagged as transfers vs 0/10 before the fix). They land as `own_transfer` rather
  than `to_joint_account` — that's the already-tracked collapse bug above, now confirmed live.
- [x] **P0 — N+1 query on `categorization_rules` caused `WORKER_RESOURCE_LIMIT` timeouts.**
  `applyCategoryRules()` re-queried `categorization_rules` from the DB on *every single
  transaction* inside the main loop, instead of loading it once like `user_rules` already
  did. A real 11-page joint-account statement (197 transactions) reliably failed with
  `{"code":"WORKER_RESOURCE_LIMIT","message":"...not having enough compute resources"}` —
  confirmed by edge-function logs showing one `GET .../categorization_rules` per transaction.
  **Fix (deployed):** `categoryRules` is now loaded once per import (alongside `userRules`),
  and `applyCategoryRules()` is a pure sync function over the pre-loaded array. Confirmed via
  logs: the repeated `GET .../categorization_rules` is gone after the fix.
- [x] **P0 — sequential per-row inserts (`import_rows` + `transactions`) caused
  `WORKER_RESOURCE_LIMIT`.** After fixing the `userContext` bug above (so name/joint-account
  matching actually runs), the same 197-row joint statement started failing again — same
  error, cutting off mid-loop (66/197 rows inserted, import stuck at `PARSED`). Root cause:
  both `import_rows.upsert()` and `transactions.insert()` were each awaited one row at a time
  inside the main loop — ~400 sequential HTTP round-trips total, on top of the now-heavier
  per-row categorization work. **Fix (deployed):** `import_rows` upserts are now fired
  without blocking the dedup loop (they don't affect dedup decisions, only audit) and awaited
  together afterward in chunks of 25; `transactions` inserts are parallelized in chunks of 25
  with identical per-row error/duplicate counting logic (just rescheduled, not changed).
  **Confirmed fixed end-to-end**: same 197-row joint file, all four fixes deployed together
  (userContext, rules N+1, parallel inserts) → 196 new transactions, 1 in-file duplicate,
  0 failed, **9/9 Ignacio transfers correctly detected as `own_transfer`** (were 0/9 before
  session start), completed in 2:09 (vs. timeout, or 3:23 with only the N+1 fix and
  userContext still broken). Demo data cleaned up afterward; `user_preferences.
  joint_account_names` reset to `[]` (the test value that was set to verify the fix).
- [x] **P1 — real ~150s hard execution-time ceiling confirmed; two more safe optimizations
  applied, both real but not sufficient to clear it for very large files.**
  Edge-function logs showed execution times clustering right at a ceiling regardless of what
  else changed: 150271ms, 148918ms, 138397ms, 150271ms again — all near the same wall,
  distinct from the earlier gradual-slowdown symptoms. The idle-timeout response even names
  it explicitly: `{"code":"IDLE_TIMEOUT","message":"Request idle timeout limit (150s) reached"}`.
  This is a **hard Supabase Edge Functions wall-clock limit around 150s** on this project's
  plan, not something that degrades gracefully — a cliff.
  Two more fixes applied on top of the userContext/N+1/parallel-insert fixes above:
  1. **Real multi-row batch inserts** (`transactions.upsert(batch, {ignoreDuplicates:true})`
     on the `(user_id, domain, fingerprint)` partial unique index, `import_rows.upsert(batch)`
     on its plain unique constraint) instead of chunked-but-still-one-request-per-row inserts.
     Cuts a 300-row statement from ~300+ HTTP round-trips to ~12. A useful side effect: a
     mid-batch failure now leaves at most one batch (≤50 rows) uncommitted instead of
     leaving individual orphaned rows scattered across the whole file — reduces (but doesn't
     eliminate) the half-fail orphan risk documented above.
  2. **Skip the redundant raw/clean `categorize()` second pass** when both normalize to the
     same string — guaranteed identical result since `categorize()` is a pure function of
     `normalize(description)` (locked in by a new determinism test in
     `tests/categorizer.test.ts`). Was running the full 2500+-rule scan twice for every
     unmatched transaction; now only runs twice when raw/clean genuinely differ.
  **Result:** the 197-row joint file (already fixed by the prior 3 bugs) still works. The
  18-page personal statement (~300+ rows, 62KB extracted text) **still hits the 150s ceiling**
  even with all 5 optimizations applied — confirms the safe, low-risk optimization budget is
  exhausted for files this size. **Not fixed for large files.** The two remaining paths are
  both bigger changes, deliberately not attempted this session: (a) further categorize()
  optimization (would mean changing matching logic itself, not just call scheduling — riskier
  for a 2500+-rule, well-tested engine), or (b) an architectural change to asynchronous /
  background processing (return immediately, keep working outside the request-response
  cycle) — the more robust fix, but a bigger scope deserving its own session.
- **Dangerous side-effect of the half-fail bug (already tracked above):** when either
  resource-limit failure hits mid-loop, it leaves **orphaned transactions already committed**
  (seen: 18 rows, 72 rows, 66 rows across different runs) while the `imports` row stays at
  `PARSED` with `transactions_count: 0`. Because dedup only trusts `status = NORMALIZED`, a
  retry after a partial failure would NOT detect these as duplicates and could double-insert
  them. Cleaned up manually for this test; underscores the priority of the existing
  "half-fail" fix AND makes the resource-limit bug above higher priority than it would
  otherwise be (it's not just slow — it corrupts state on every occurrence).
- **`process-investment-file` is not for broker/portfolio statements.** Tested with a real
  investment-platform CSV (dividends: V, MSFT, NVDA...) — it returned `success, 0 investments`
  (200 OK, no error). Root cause: the function's whole design is to scan a *bank* statement
  for cash movements INTO/OUT OF investment platforms (`"To Cocos"`, `"To MyInvestor"`, etc.),
  not to ingest a broker's own portfolio/dividend export. Not a bug per se, but confirms the
  Fase 5 "investment flow parity" item is really "investment flow scope" — worth deciding
  explicitly whether broker-native imports are in scope before building preview parity.
- **Still open, lower priority:** the per-row insert pattern (`import_rows` then
  `transactions`, one row at a time, ~40 sequential requests/sec observed) is the likely
  reason processing 197 rows still took ~3.5 minutes even after the N+1 fix. Batch inserting
  would make this much faster and further reduce WORKER_RESOURCE_LIMIT risk on larger files.

## Decisions made (2026-07-06)
- Adopted a 5-phase plan for the whole pipeline; agreed to **start with tests** (safety net)
  before touching anything, **migrate extraction Lovable AI → Anthropic/Claude**, and **delete
  `process-financial-file`** while investigating the other two orphan functions.
- Added **Vitest** (pinned to v3 — v4 pulls a broken rolldown native binding on darwin-arm64).
  Scripts: `npm test` / `npm run test:watch`. Config: `vitest.config.ts` (node env).
- Wrote 33 characterization tests over the pure functions: `_shared/categorizer.ts`,
  `src/lib/userRules.ts`, `src/lib/excelParser.ts`, and a new extracted
  `_shared/fingerprint.ts` (sha256/normalizeDescription/calculateFingerprint/extractMonthKey,
  copied verbatim from `process-import` — NOT yet imported back there; rewire in Fase 1).
- Bugs surfaced by the baseline tests (fix in Fase 1):
  - `categorizer.ts:79` docstring example is wrong: `normalize` joins "Peña-Nieto" → "PENANIETO".
  - `extractMonthKey` non-ISO fallback returns "NaN-NaN" (`new Date('2024/03/09'+'T12:00:00Z')`
    is invalid) — any non strict-YYYY-MM-DD date breaks.
  - `running_balance` inside the fingerprint makes the same tx with a different balance dedup
    as new (false negatives).

## Fase 1 progress (2026-07-06)
Done (committed to main, **NOT yet deployed to Supabase**):
- `process-import` now imports the 4 hashing/dedup primitives from `_shared/fingerprint.ts`
  (private copies removed; `crypto` std import dropped).
- Half-fail reporting: real (non-dup) insert errors are counted; import is marked `FAILED`
  when nothing lands, or `NORMALIZED` + `error_message` on a partial; response now carries
  `status` / `failed` / `partial` / `errorMessage`.
- `extractMonthKey` no longer returns "NaN-NaN" for non-ISO dates (parses slash/dot, `''`
  when unparseable).

Still pending in Fase 1 (need real sample files + a Supabase deploy):
- Honest labeling of the sign-derived fallback (today mislabeled `categorized_by='ai'`) —
  check `categorized_by` consumers (dashboards, `apply-rules-retroactive`) before changing.
- Fingerprint NOT-NULL / dedup gap; add file-level dedup to the investment flow.
- Frontend **retry** button consuming the new `failed`/`partial` response fields.
- `mapCategorySlug` unmapped-slug guard (add a test).
- **Deploy `process-import` to Supabase + smoke-test with ≥2 real bank files; run
  `imports-reviewer` before considering Fase 1 closed.**
- Later phases: split the monoliths — `BankStatementsTabsView.tsx` 3083 /
  `InvestmentTabsView.tsx` 1327 / `useMonthlyFileUpload.tsx` 573 (Fase 4), hardening incl.
  the `Function()` amount eval (`BankStatementsTabsView.tsx:1866`) and investment-flow
  preview parity (Fase 5).

## Fase 4 progress (2026-07-07) — data-model canonicalization + module boundary

Reframed with the user: Fase 4 leads with **transactions data integrity** (the app's
foundation), not just component splitting. Decisions: (1) data model first, (2) **aggressive**
cleanup — migrate + physically DROP the legacy columns.

**Diagnosis (SQL + grep against `ertwmshiupmickhfbaue`):** `transactions` had ~45 columns with
two parallel lineages. The live pipeline writes `movement`/`account_id`/`category_id`/
`fingerprint`/`description_clean|norm`; the Lovable-era legacy set (`type`+CHECK, `tx_type`,
`bank`, `upload_id`, `description_raw`, `transaction_hash`, `amount_base`, `fx_rate`,
`posted_date`/`auth_date`/`value_date`, `payment_channel`, `subcategory_id`, `rule_id_applied`,
`linked_transaction_id`, `auto_recategorized`, `merchant_norm`) was dead or redundant.

**Done + verified:**
- **Migration `fase4_canonical_transactions_cleanup`**: `movement` + `fingerprint` → NOT NULL;
  dropped the 17 legacy columns; replaced the partial fingerprint unique index with a total
  `UNIQUE (user_id, domain, fingerprint)`. Table now **27 canonical columns** (was ~45).
- **Readers/writers migrated** off legacy cols: `useTransactions.tsx` (derives app `type` from
  `movement`, reads `amount`/account from canonical cols only), `BankStatementsTabsView.tsx`
  (manual-entry insert + inline select + account display), `process-import/index.ts` (txRecord
  writes canonical subset; removed `getLegacyType`/`getLegacyTxType`/`validatePaymentChannel`
  + the `VALID_*` consts). `import_id` kept **nullable** (seed + manual entries have no import).
- Regenerated `src/integrations/supabase/types.ts` (0 legacy refs). tsc + lint clean; 56 tests
  green. `process-import` **redeployed**. Runtime contract-insert + dedup rejection verified via
  SQL, test row cleaned up.
- **Module boundary (Etapa D):** confirmed no cross-imports cashflow⟂investments; investment
  components never query `transactions`; `investments.upload_id` left intact (its own FK).

**Decisions that revised the plan:**
- **`running_balance` KEPT** (not dropped): `useTransactions` uses it for `openingBalanceByMonth`.
  The epic's note was about excluding it from the *fingerprint*, a separate change.
- **Fingerprint formula NOT changed this batch.** `calculateFingerprint` still includes
  `running_balance` (`fingerprint.ts:51`). Changing it would break dedup continuity for already-
  imported files (stored fingerprints would no longer match) → needs its own migration that
  recomputes all existing fingerprints. Deferred.
- `original_text` (nullable) left in place — harmless provenance, not worth another migration.

**Etapa E — DONE (2026-07-07):** split both monoliths into per-component files, verbatim
(extracted with `sed` line ranges, not retyped, to avoid transcription risk in ~4400 lines of
JSX). `BankStatementsTabsView.tsx` 3079→265 lines, rest moved into
`src/components/imports/cashflow/{types,helpers,MonthTabStrip,ManualEntryFooter,MonthWorkspace,
UploadedFiles,InlineTransactionsEditor,AmountEditButton,RowEditIndicator,
RevertToOriginalButton,ProcessingPanel}`. `InvestmentTabsView.tsx` 1330→214 lines, rest into
`src/components/imports/investments/{types,MonthTabStrip,MonthWorkspace,UploadedFiles,
InlineInvestmentsEditor,ProcessingPanel}`. Deleted `FileChipsBar` (dead code, zero call sites,
found while mapping the file — not caught by cross-file grep since it was private/unexported).

**Verification caught a real bug tsc/eslint both missed:** this repo's tsconfig
(`strict: false`, `noImplicitAny: false`) does not flag an unresolved JSX component identifier
as a compile error, and `eslint-plugin-react` (which owns `react/jsx-no-undef`) isn't installed
— confirmed empirically by deliberately removing an import and re-running both with a clean
exit. `InlineTransactionsEditor.tsx` shipped with a missing `Button` import that only surfaced
as a runtime crash (blank screen, whole React root unmounted — no error boundary anywhere in
the app) once real transaction rows rendered. Caught by inserting a temporary test `imports` +
3 `transactions` rows for the demo account via SQL (demo data has no real `imports` rows, so
every month showed the harmless empty-state — masking the bug) and clicking through the actual
UI. Fixed, then re-verified live: table renders, category edit + save + audit-log diff popover
(`RowEditIndicator`) + revert button (`RevertToOriginalButton`) + split popover
(`AmountEditButton`) all confirmed working end-to-end. Test rows cleaned up after.
**Takeaway: for this codebase, tsc/lint passing is necessary but not sufficient for JSX
refactors — a real browser render-through is required.**

**Fixed (2026-07-07):** `investments.upload_id` had a hard FK to the legacy `uploads` table, but
`process-investment-file/index.ts:291` writes an `imports.id` into it (comment there even says
"legacy field name"), and all app code (`useInvestments`, `UploadedFilesHistoryList`) already
read/matched `upload_id` as an `imports.id`. Confirmed via the Management API against the live
DB (`ertwmshiupmickhfbaue`) that the constraint really did point at `uploads(id)`, and that all
4 seeded demo investment rows have `upload_id: NULL` (seeded directly via SQL, so this path had
never been exercised through the real upload pipeline). Retargeted the FK to `imports(id)` with
`ON DELETE CASCADE` (matching the original delete behavior) — no app code changes needed since
every caller already assumed `upload_id` held an import id. Migration
`20260707140000_fix_investments_upload_id_fk.sql`, applied directly to the live DB via the
Supabase Management API `database/query` endpoint (no `SUPABASE_DB_PASSWORD` available locally
for a CLI `db push`).

**Verified end-to-end (2026-07-07):** ran a real insert against the live DB — created an
`imports` row (domain `INVESTING`) for the demo user, then inserted an `investments` row with
`upload_id` set to that import's id, exactly what `process-investment-file` does. Insert
succeeded with no FK violation (previously this would have failed). Cleaned up both test rows
after. This closes the loop on "confirm the actual failure mode" — the fix works for the real
code path, not just in theory.

## Fase 3 progress (2026-07-06)
- `process-import` + `process-investment-file` migrated off Lovable → **Anthropic Messages
  API** (`claude-haiku-4-5` → `claude-sonnet-5` on escalation, thinking disabled). Read new
  secret `ANTHROPIC_API_KEY`. Committed, **NOT deployed** — blocked on the user setting the
  secret in Supabase, then deploy + smoke-test with real files (see [[project-edge-functions]]).

## Fase 2 progress (2026-07-06)
- Deleted `process-financial-file` (dead, zero callers, superseded by `process-import`).
- Unified duplicated utilities into `src/lib/fileExtract.ts` — `extractPdfText` (was ×3),
  `getMonthKey` (×2), `VALID_EXTS` (×2). Build + lint clean.
- **Orphan functions — NOT deleted (investigated, decision deferred):**
  `apply-rules-retroactive` and `fix-categorization` have zero frontend callers (grep) and
  were never deployed to the own project. BUT `RuleEditorDialog` only previews + delegates
  via `onConfirm`; it does NOT itself apply rules retroactively, so it's unconfirmed whether
  retroactive rule application currently works at all or was meant to go through
  `apply-rules-retroactive`. Deleting data-repair tooling under that uncertainty is unsafe.
  Next: trace the `onConfirm` handler in `BankStatementsTabsView` to see how a new rule is
  applied to existing transactions, THEN decide wire-up vs delete.

## Fase 5 progress (2026-07-06)
- Replaced the `Function()` amount-editor eval with `src/lib/safeMath.ts` (safe parser, tested).
- Added an upload guard `uploadFileRejection` + `MAX_UPLOAD_BYTES` (15 MB) in
  `src/lib/fileExtract.ts`; both tab views now skip oversized/wrong-type files AND toast the
  reason (was a silent filter). NOTE: `fileExtract.ts` isn't unit-testable under the current
  Vitest config because it imports pdfjs' worker via `?url` (no Vite plugin in vitest.config);
  split the pure helpers out if we want them covered.
- Still pending in Fase 5: investment-flow preview parity (auto-processes with no review step).

## Coverage expansion (2026-07-06) — 48 tests total
Extracted the category-slug resolution layer (`MovementType`, slug lists, `mapCategorySlug`,
`validateCategorySlug`) from `process-import` into `_shared/categoryMap.ts` (rewired + unit-
tested — closes the Fase 1 `mapCategorySlug` guard). Broadened `categorizer` tests to the
batch/dashboard routing and more merchants. Two real findings surfaced (both locked in tests,
fix TBD):
- **`to_joint_account` collapses to `own_transfer`**: categorizer emits it on a joint-account
  name match, but `TRANSFER_SLUGS` lacks it and there's no `CATEGORY_SLUG_MAP` entry →
  `validateCategorySlug` downgrades it. Joint-account transfers become indistinguishable from
  own transfers. Fix: add `to_joint_account` as a real app transfer slug (+ category row) or
  map it deliberately.
- **`\b`-anchored rules miss `.COM`-style descriptors**: `normalize("NETFLIX.COM")` →
  `"NETFLIXCOM"`, and rule `'NETFLIX\\b'` needs a boundary after NETFLIX → no match. Hits many
  online/subscription merchants whose bank descriptor appends `.COM`/`.ES` with no space.
  Fix: relax the trailing boundary or strip common TLDs in `normalize`.
