# Epic: Dashboard

## Main files
- src/pages/Index.tsx
- src/components/dashboard/: TrendKpiCard, MonthlyChart, YearlyBalanceChart,
  CategoryChart, SpendingByCategoryChart, DailyFlowChart, DailyHeatmapCard,
  IncomeCategoryReferenceCard, TopExpensesCard, AccountsStackCard,
  InvestmentSummaryCard, TransactionTable, TransactionCardList, TotalView,
  SavingsRateGaugeCard, EmptyStateBanner
- Hooks: useTransactions, useMonthSelection, useAccounts

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

## Next step
- Consider whether Net Balance should get a breakdown/tooltip distinguishing "idle leftover
  cash" from "money already earmarked to invest" (`balance - sentToInvest`), per the original
  ask: understanding what's truly idle vs deliberately invested.
- `useInvestments.tsx`'s "this month" is still not connected to `Index.tsx`'s month selector —
  if the user picks a different month in the top nav, `/investments` and `InvestmentSummaryCard`
  won't follow it (they independently pick "latest month with data"). Wiring a real shared
  month-selector across cashflow and investments is a bigger feature, not a bug fix.
