---
paths:
  - "src/pages/Investments.tsx"
  - "src/components/investments/**"
---
# Investments
- Same chart pattern as Dashboard: semantic tokens, never a raw color
- All transaction data lives in `investment_transactions`; legacy `investments` and
  `investment_accounts` tables have been dropped
- Activity tab charts use client-side aggregation via `src/lib/investmentAggregates.ts`
- `InvestmentSummaryCard` on the Dashboard uses `useInvestmentTransactions` + `useHoldings`
- Investment accounts are managed via `/account?tab=accounts` (`AccountsWorkspace`),
  not on the Investments page
- This module's uploads go through `process-investment-file` (see rules/imports.md)
