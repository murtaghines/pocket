---
paths:
  - "src/pages/Index.tsx"
  - "src/components/dashboard/**"
---
# Dashboard
- Every chart/KPI uses `hsl(var(--success))` / `hsl(var(--destructive))` — never a raw color
- Month data comes from `useMonthSelection` + `useTransactions` — don't duplicate that state in the component
- `TransactionTable` and `TransactionCardList` are shared with History — if you change columns or props, check that usage too
- New stat cards follow the `StatCard.tsx` pattern (label + KPI + sparkline, same token for all three)
