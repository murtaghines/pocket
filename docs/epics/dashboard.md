# Epic: Dashboard

## Main files
- src/pages/Dashboard.tsx (tab shell: month/week/year/history via `?tab=`)
- src/components/dashboard/: MonthTab, WeekTab, YearTab, HistoryTab,
  DashboardGreeting, TrendKpiCard, SavingsRateRingCard, PeriodBreakdownChart,
  WeeklyIncomeExpensesChart, DailyFlowChart, DailyHeatmapCard, MonthlyFlowChart,
  MonthlySpendingCard, MonthlyFlowSankey, CategoryChart, SpendingByCategoryChart,
  TopExpensesCard, FixedVsDiscretionaryCard, AccountsStackCard,
  InvestmentSummaryCard, TransactionTable, TransactionCardList, EmptyStateBanner,
  GranularityToggle
- Hooks: useTransactions, useMonthSelection, usePeriodSelection, usePeriodAggregates,
  useDashboardData, useAccounts

## Current state
`useTransactions.tsx` already excludes ALL `movement === 'TRANSFER'` rows from
income/expenses/balance (`financialTransactions`, line ~253) — confirmed correct, own_transfer
and to_investment transfers were never counted as expenses. What was missing: no KPI surfaced
"money moved to investing this month" separately from "money spent" — that number existed
internally (`investmentMovements` / `investmentMovementsCount`, filtered on
`categorySlug === 'to_investment'`) but wasn't rendered anywhere on the dashboard.

`InvestmentSummaryCard` (row 5 of Index.tsx) and the whole `/investments` page had a separate
bug, fixed 2026-07-07 (see Decisions below): both derived "this month" from
`new Date().toISOString().slice(0, 7)` / `formatMonth(new Date())` — real wall-clock time, not
the dashboard's selected/latest-data month.

## Decisions made
- 2026-07-05: removed 9 dead components that were never wired into the dashboard
  (BalanceChart, BankDistributionChart, DateDisplay, MonthComparisonCard,
  PeriodManager, SavingsRateCard, SavingsRateGauge, StatCard, WeeklyComparisonChart).
  The stat-card pattern is `TrendKpiCard.tsx`, not `StatCard.tsx`.
- 2026-07-07: added a "Sent to invest" KPI to the top row (Income · Expenses · **Sent to
  invest** · Savings Rate · Net Balance, `lg:grid-cols-5`). Sourced from `to_investment`
  TRANSFERs already computed in `useTransactions` (`investmentMovements`), summed per month
  the same way income/expenses are (`MonthlyData.sentToInvest`, `summary.sentToInvest`) — NOT
  from `useInvestments`' wall-clock-month-bugged number, so it's correct for whatever month is
  selected. New `TrendKind = "invest"` variant on `TrendKpiCard`. New i18n key
  `dashboard:stats.sentToInvest` (en/es). Verified live against demo data: December showed
  €0,00 with "▼100% vs Nov" — correctly reflecting November's real €600 to_investment transfer
  dropping to zero, confirming both months compute correctly without needing to click into Nov
  directly. Files: `src/hooks/useTransactions.tsx`, `src/pages/Index.tsx`,
  `src/components/dashboard/TrendKpiCard.tsx`, `src/lib/mockData.ts` (added `sentToInvest` to
  `MonthlyData`).
- 2026-07-07: fixed the wall-clock "this month" bug in `useInvestments.tsx`. `currentMonth`
  is now the most recent month WITH actual investment data (`investments.reduce` over
  `date.slice(0, 7)`, mirroring how `useTransactions` derives `latestMonthKey` the same way),
  not `new Date()`. Exposed `currentMonth` from the hook's return so
  `src/pages/Investments.tsx` could stop hardcoding `formatMonth(new Date())` for its header
  subtitle too — that page has no month selector at all, so it was ALWAYS showing wall-clock
  "today" regardless of what data existed. Verified live against demo data (logged in as
  `demo@pocket.app`): before the fix, "This month" on `/investments` showed €0,00 (today is
  July 2026, which has zero investment rows); after, it correctly shows "December 2025" +
  "996,81 €" (December's 2 real deposits: 500 + 496.81). No behavior change for real users
  who only ever look at the actual current month — this only fixes historical/demo browsing.
  Files: `src/hooks/useInvestments.tsx`, `src/pages/Investments.tsx`.

## Navigation restructure (2026-09-10)
Dashboard is now at `/dashboard` with 4 URL-driven tabs (`?tab=month|week|year|history`).
`/history` and `/total` redirect to `/dashboard?tab=history`. The old `Index.tsx` was replaced
by `Dashboard.tsx` + per-tab components (`MonthTab`, `WeekTab`, `YearTab`, `HistoryTab`).

Navigation uses a primary bar (PrimaryNavBar) + secondary bar (SecondaryNavBar) read from
`src/config/navigation.ts`. The dashboard section's sub-tabs are month/week/year/history.

## Period columns optimization (2026-09-10)
Pre-computed `year`, `month`, `week` columns added to `transactions` (trigger-maintained from
`date`). `mv_daily_totals` rebuilt with these columns. RPCs (`get_period_series`,
`get_monthly_series`, `get_dashboard_aggregates`) rewritten to use equality filtering instead
of `date BETWEEN` when period params are provided. `MonthTab` passes `periodMonth`, `YearTab`
passes `periodYear`; `WeekTab` falls back to date range (ISO week format mismatch with
frontend's Monday-date format).

Migrations: `20260910160000_add_transaction_period_columns.sql` (columns + trigger + backfill),
`20260910170000_optimize_period_columns_and_indexes.sql` (fix index collision + MV rebuild +
RPC rewrites).

## Next step
- Convert WeekTab to use the `week` column once frontend week format is aligned with ISO week
- Consider wiring `useInvestments.tsx`'s "this month" to the dashboard's period selector
