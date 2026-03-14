

## Plan: Restructure Dashboard Views & Transactions

### Summary
Reorganize content between Monthly and Total views, move Transactions outside both views to always show at the bottom, and add new visualizations to the Total view.

### Changes

**1. `src/pages/Index.tsx`** — Restructure the layout:

**Monthly view keeps:**
- Month label + KPIs (Income, Expenses, Balance)
- Investment Summary + Savings Rate sidebar (but without MonthlyChart)
- Category Breakdown + Top Expenses + Weekly Comparison
- Remove: `MonthlyChart` (Monthly Balance), `BalanceChart`, `YearlyBalanceChart`

**Monthly view new additions:**
- Bank Distribution chart (if exists) or a simple income breakdown by category

**Total view gets:**
- Current TotalView content (KPIs, cumulative, income vs expenses, net balance)
- Add: `MonthlyChart` (Monthly Balance — moved from monthly)
- Add: `YearlyBalanceChart` (moved from monthly)
- Add: Savings Rate evolution line chart (new, inside TotalView)

**Transactions** — Rendered AFTER the view conditional block, always visible. Sort descending by date (most recent first).

**2. `src/components/dashboard/TotalView.tsx`** — Add props for:
- `MonthlyChart` data to render the monthly balance chart
- `YearlyBalanceChart` data  
- New: Savings Rate evolution per month (line chart showing % saved each month)
- New: Average monthly income/expenses comparison (horizontal bar or summary)

**3. `src/components/dashboard/TransactionTable.tsx`** — Ensure transactions are sorted descending by date (most recent first). Currently likely already handled but will verify the sort.

### Layout Structure After Changes

```text
┌─────────────────────────────────────────────┐
│  Date Display  [Monthly] [Total]   Greeting │
├─────────────────────────────────────────────┤
│                                             │
│  IF MONTHLY:                                │
│  ┌─────────┬──────────┬──────────┐          │
│  │ Income  │ Expenses │ Balance  │  KPIs    │
│  ├─────────┴──┬───────┴──────────┤          │
│  │ Investment │ Savings Rate     │  Sidebar │
│  ├────────┬───┴────┬─────────────┤          │
│  │Category│Top Exp │ This Week   │          │
│  └────────┴────────┴─────────────┘          │
│                                             │
│  IF TOTAL:                                  │
│  ┌──────┬───────┬───────┬────────┐          │
│  │Tot.In│Tot.Ex │Saved  │Sav.Rate│  KPIs   │
│  ├──────┴───────┴───────┴────────┤          │
│  │ Cumulative Balance Area       │          │
│  │ Monthly Balance (moved here)  │          │
│  │ Income vs Expenses Bars       │          │
│  │ Yearly Balance (moved here)   │          │
│  │ Monthly Net Balance           │          │
│  │ Savings Rate Evolution (NEW)  │          │
│  └───────────────────────────────┘          │
│                                             │
│  ALWAYS (both views):                       │
│  ┌───────────────────────────────┐          │
│  │ Transactions Table            │          │
│  │ (all data, sorted desc)       │          │
│  └───────────────────────────────┘          │
└─────────────────────────────────────────────┘
```

### Files to modify
1. **`src/pages/Index.tsx`** — Remove MonthlyChart, BalanceChart, YearlyBalanceChart from monthly view; pass them to TotalView; move TransactionTable outside the conditional
2. **`src/components/dashboard/TotalView.tsx`** — Accept and render MonthlyChart + YearlyBalanceChart components; add savings rate evolution line chart

