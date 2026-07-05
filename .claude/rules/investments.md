---
paths:
  - "src/pages/Investments.tsx"
  - "src/components/investments/**"
  - "src/hooks/useInvestments.tsx"
---
# Investments
- Same chart pattern as Dashboard: semantic tokens, never a raw color
- `InvestmentsTable`/`InvestmentsHistory` also feed `InvestmentSummaryCard` on the
  Dashboard — if you change the data shape, check that usage
- This module's uploads go through `process-investment-file` (see rules/imports.md)
