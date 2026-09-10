---
paths:
  - "src/pages/Dashboard.tsx"
  - "src/components/dashboard/**"
---
# Dashboard
- Three granularity tabs (Month, Week, Year) + a History tab, all rendered inside `Dashboard.tsx`
- Tab state is URL-driven via `?tab=month|week|year|history` (default = month, omitted from URL)
- `MonthTab` uses `useMonthSelection` + `useTransactions`; `WeekTab`/`YearTab` use `usePeriodSelection`
- All three tabs share `usePeriodAggregates` for the main RPC call (`get_dashboard_aggregates`)
- Transactions have pre-computed `year`, `month`, `week` columns (trigger-maintained from `date`);
  `MonthTab` and `YearTab` pass these to the RPC for equality filtering; `WeekTab` falls back to
  date-range filtering due to ISO-week vs Monday-date format mismatch
- Every chart/KPI uses `hsl(var(--success))` / `hsl(var(--destructive))` — never a raw color
- `TransactionTable` and `TransactionCardList` are shared with History — if you change columns or props, check that usage too
- New stat cards follow the `TrendKpiCard.tsx` pattern (label + KPI + sparkline, same token for all three)
