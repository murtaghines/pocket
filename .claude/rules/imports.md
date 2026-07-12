---
paths:
  - "src/pages/MyData.tsx"
  - "src/components/imports/**"
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
- There are a handful of automated tests (`npm test`, `tests/*.test.ts`) covering
  `userRules`, `categorizer`, `fingerprint`, `excelParser`, `categoryMap`, and
  integrity invariants — run them after touching extraction/categorization logic. They
  don't cover every bank format, so for parser changes specifically, still ask for a
  real sample file if you don't have one at hand
- The pipeline is: `excelParser.ts` (or pdfjs for PDF) → `process-import` /
  `process-financial-file` → `categorizer` (shared module in
  `supabase/functions/_shared/categorizer.ts`, not a deployed function) → `user_rules`
  for categorization (single rules table, unified 2026-07-11 — see
  docs/epics/categories.md). Don't skip or merge steps without flagging it
- `AccountSelectDialog.tsx` (in this folder) creates/picks bank accounts during
  upload — it goes through `useAccounts().createAccount` and the shared
  `AccountFormDialog`, same as the settings page. See `.claude/rules/settings.md` for
  the bank/nickname account model; don't reintroduce a direct
  `supabase.from('accounts').insert()` here
