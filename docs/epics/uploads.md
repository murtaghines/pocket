# Epic: Uploads & imports

## Archivos principales
- src/pages/MyData.tsx, src/pages/Profile.tsx
- src/components/profile/: BankStatementsTabsView, MonthUploadSlot,
  MonthReviewModal, InvestmentUploadsOrganizer, RuleEditorDialog, AccountSelectDialog
- Hooks: useImports, useMonthlyFileUpload, useMonthlyInvestmentUpload
- src/lib/excelParser.ts
- Edge functions: process-import, process-financial-file, process-investment-file,
  categorizer, apply-rules-retroactive, fix-categorization, check-data-integrity

## Estado actual
Módulo sensible: no hay tests automáticos sobre el parsing.
<!-- completar el resto -->

## Decisiones tomadas


## Próximo paso