# Epic: Uploads & imports

## Main files
- src/pages/MyData.tsx (uploads hub — bank statements + investments tabs)
- src/components/profile/: BankStatementsTabsView, InvestmentTabsView, MonthUploadSlot,
  MonthReviewModal, InvestmentUploadsOrganizer, RuleEditorDialog, AccountSelectDialog
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


## Next step
