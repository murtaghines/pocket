# Epic: Uploads & imports

## Main files
- src/pages/MyData.tsx (uploads hub — bank statements + investments tabs)
- src/components/imports/: BankStatementsTabsView, InvestmentTabsView, RuleEditorDialog,
  AccountSelectDialog, MonthReviewModal.tsx (now just `AddManualEntryDialog` — the
  actual review/edit table lives inline in BankStatementsTabsView)
- Hooks: useImports, useMonthlyFileUpload, useMonthlyInvestmentUpload
- src/lib/excelParser.ts
- Edge functions: process-import, process-financial-file, process-investment-file,
  apply-rules-retroactive, fix-categorization, check-data-integrity
- Shared module: supabase/functions/_shared/categorizer.ts (categorization engine — not
  a deployed function)

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
- [ ] **`to_joint_account` collapses to `own_transfer`** — no app transfer slug / map entry for
  joint-account transfers, so they become indistinguishable from own transfers. Fix: add the
  slug (+ `categories` row) or map it deliberately. (test: `tests/categoryMap.test.ts`)
- [ ] **`\b`-anchored rules miss `.COM`-style descriptors** — `normalize("NETFLIX.COM")` →
  `"NETFLIXCOM"`, so `'NETFLIX\b'` never matches; hits many online/subscription merchants.
  Fix: relax the trailing boundary or strip common TLDs in `normalize`. Touches `normalize()`
  globally → run `imports-reviewer`. (test: `tests/categorizer.test.ts`)
- [ ] **`running_balance` in the fingerprint** — same tx with a different balance dedups as new
  (false negatives). (test: `tests/fingerprint.test.ts`)
- [ ] **Sign fallback mislabeled `categorized_by='ai'`** — when the categorizer is rejected by
  the sign guardrail, the row is dumped into `other_*` but tagged `ai`. Relabel honestly
  (`sign_fallback`/`PENDING`); check `categorized_by` consumers (dashboards,
  `apply-rules-retroactive`) first. (process-import ~`:1305-1325`)
- [ ] **Fingerprint can be NULL** → dedup silently skipped; also add file-level dedup to the
  investment flow (only `process-import` has it).

Cleanliness / product:
- [ ] **Orphan edge functions** `apply-rules-retroactive` + `fix-categorization` — zero callers;
  trace how rules apply retroactively (`onConfirm` in `BankStatementsTabsView`) before
  deleting vs wiring. (spawned as its own task)
- [x] **`Function()` amount eval** — replaced with `src/lib/safeMath.ts` (recursive-descent
  parser, no eval), 11 tests. (Fase 5, done 2026-07-06)
- [ ] **Investment flow** auto-processes with no preview + weaker dedup — add review parity with
  the bank flow. (Fase 5)
- [ ] **UI retry** button consuming the new `failed`/`partial` response fields. (Fase 1)
- [ ] **`import_status` has no PARTIAL** — partial imports are marked NORMALIZED + `error_message`;
  a real `PARTIAL` enum value (migration) would be cleaner.

Docs nit:
- [ ] `categorizer.ts:79` docstring example is wrong (`normalize` yields `PENANIETO`, not
  `PENA NIETO`).

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
- [ ] **NEW — still hits `WORKER_RESOURCE_LIMIT` at ~200 rows once `userContext` is populated.**
  With the N+1 fix ALONE (userContext still accidentally undefined, see above), the 197-row
  joint statement completed successfully end-to-end in ~3.5 min. After ALSO fixing the
  `userContext` bug (so name/joint-account matching actually runs now), the *same* file
  started failing again with `WORKER_RESOURCE_LIMIT`, cutting off mid-loop (66/197 rows
  inserted, import stuck at `PARSED`). A 10-row synthetic file with the same joint-account
  content processed fine in ~10s and correctly detected 6/10 transfers, so the fix itself is
  correct — the issue is that the additional per-transaction work now done (name/joint fuzzy
  matching in `categorize()` / `detectAccountTransfer()`) is CPU-time-expensive enough that
  it exceeds the edge runtime's resource budget once multiplied across ~200 rows. This is a
  distinct problem from the N+1 (that was network round-trips; this is CPU-time), likely
  compounded by the still-sequential per-row inserts (see below). **Not yet fixed** — needs
  profiling of `categorize()`/`detectAccountTransfer()` and/or batching before larger
  real-world statements (multi-month files easily hit 150-300+ rows) can process reliably.
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
