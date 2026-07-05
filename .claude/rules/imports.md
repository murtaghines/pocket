---
paths:
  - "src/pages/MyData.tsx"
  - "src/components/profile/BankStatementsTabsView.tsx"
  - "src/components/profile/InvestmentTabsView.tsx"
  - "src/components/profile/InvestmentUploadsOrganizer.tsx"
  - "src/components/profile/MonthUploadSlot.tsx"
  - "src/components/profile/MonthReviewModal.tsx"
  - "src/components/profile/RuleEditorDialog.tsx"
  - "src/components/profile/AccountSelectDialog.tsx"
  - "src/hooks/useImports.tsx"
  - "src/hooks/useMonthlyFileUpload.tsx"
  - "src/hooks/useMonthlyInvestmentUpload.tsx"
  - "src/lib/excelParser.ts"
  - "supabase/functions/process-import/**"
  - "supabase/functions/process-financial-file/**"
  - "supabase/functions/process-investment-file/**"
  - "supabase/functions/_shared/categorizer.ts"
---
# Uploads & imports — sensitive module
- The uploads hub is `src/pages/MyData.tsx` (`BankStatementsTabsView` /
  `InvestmentTabsView`), not `Profile.tsx` — `Profile.tsx` is account settings now
- There are no automated tests on parsing. Before touching extraction logic,
  ask for a real sample file if you don't have one at hand
- The pipeline is: `excelParser.ts` (or pdfjs for PDF) → `process-import` /
  `process-financial-file` → `categorizer` (shared module in
  `supabase/functions/_shared/categorizer.ts`, not a deployed function). Don't skip
  or merge steps without flagging it
- Changes to automatic categorization: verify they don't break `apply-rules-retroactive`
  or `fix-categorization`, which depend on the same logic
