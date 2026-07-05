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
<!-- fill in -->

## Decisions made
- 2026-07-05: removed 9 dead components that were never wired into the dashboard
  (BalanceChart, BankDistributionChart, DateDisplay, MonthComparisonCard,
  PeriodManager, SavingsRateCard, SavingsRateGauge, StatCard, WeeklyComparisonChart).
  The stat-card pattern is `TrendKpiCard.tsx`, not `StatCard.tsx`.

## Next step
