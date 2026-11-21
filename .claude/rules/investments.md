---
paths:
  - "src/pages/Investments.tsx"
  - "src/components/investments/**"
  - "src/hooks/useInvestments.tsx"
---
# Investments
- Same chart pattern as Dashboard: semantic tokens, never a raw color
- All transaction data lives in `investment_transactions` (not the legacy `investments` table)
- Activity tab charts use client-side aggregation via `src/lib/investmentAggregates.ts`
- `InvestmentSummaryCard` on the Dashboard uses `useInvestmentTransactions` + `useHoldings`
- `useInvestments` hook is for `investment_accounts` only (manual portfolio value tracking)
- This module's uploads go through `process-investment-file` (see rules/imports.md)
