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

Also found: `InvestmentSummaryCard` (row 5 of Index.tsx) shows `totalInvestedThisMonth` from
`useInvestments.tsx`, which hardcodes `new Date().toISOString().slice(0, 7)` as "this month" —
the real wall-clock month, NOT the dashboard's selected/latest-data month. Looking at any
historical month (or demo data, which lives in the past relative to "today") shows €0 there
regardless of what's actually selected. This is a separate, pre-existing bug in the
investments-side portfolio card — NOT touched by the fix below, which uses the correct
per-selected-month data from the cashflow side instead. Worth fixing separately.

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

## Next step
- Fix `useInvestments.tsx`'s wall-clock "this month" bug (see Current state above) so
  `InvestmentSummaryCard` reflects the selected month, not always the real current date.
- Consider whether Net Balance should get a breakdown/tooltip distinguishing "idle leftover
  cash" from "money already earmarked to invest" (`balance - sentToInvest`), per the original
  ask: understanding what's truly idle vs deliberately invested.
