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
- Later phases: dead-code/consolidation (Fase 2), Lovable→Anthropic migration (Fase 3),
  split the monoliths — `BankStatementsTabsView.tsx` 3083 / `InvestmentTabsView.tsx` 1327 /
  `useMonthlyFileUpload.tsx` 573 (Fase 4), hardening incl. the `Function()` amount eval
  (`BankStatementsTabsView.tsx:1866`) and investment-flow preview parity (Fase 5).
