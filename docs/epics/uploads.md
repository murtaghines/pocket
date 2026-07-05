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
Sensitive module: no automated tests on parsing.
<!-- fill in the rest -->

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

## Next step
- `BankStatementsTabsView.tsx` (3082 lines) and `InvestmentTabsView.tsx` (1326 lines) each
  mix multiple responsibilities (upload orchestration, parsing preview, batch editing UI)
  and are candidates for splitting into smaller components/hooks. Deliberately deferred —
  this pipeline has no automated tests, so treat as its own careful pass (real sample
  files from ≥2 banks, verify with `imports-reviewer` before merging), not bundled into a
  broader cleanup.
