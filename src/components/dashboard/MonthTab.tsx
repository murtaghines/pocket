import { useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, TrendingUp } from "lucide-react";

import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { NetBalanceKpiCard } from "@/components/dashboard/NetBalanceKpiCard";
import { TransfersKpiCard } from "@/components/dashboard/TransfersKpiCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";
import { DailyFlowChart } from "@/components/dashboard/DailyFlowChart";
import { DailyHeatmapCard } from "@/components/dashboard/DailyHeatmapCard";
import { AccountsStackCard } from "@/components/dashboard/AccountsStackCard";
import { WeeklyIncomeExpensesChart } from "@/components/dashboard/WeeklyIncomeExpensesChart";
import { MonthlyFlowSankey } from "@/components/dashboard/MonthlyFlowSankey";
import { DASHBOARD_GRID, KPI_LEFT_GRID, KPI_RIGHT_GRID } from "@/components/dashboard/kpiGridLayout";

import { useTransactions } from "@/hooks/useTransactions";
import { useDashboardData, useAccountPeriodSummary } from "@/hooks/useDashboardData";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useAccounts } from "@/hooks/useAccounts";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { usePeriodAggregates } from "@/hooks/usePeriodAggregates";
import { periodRangeOf, type WeeklyPoint } from "@/lib/analytics";

/** Dashboard's "month" tab — current month vs. previous month. */
export function MonthTab() {
  const { t } = useTranslation('dashboard');
  const { monthlyData, openingBalanceByMonth, isLoading: isDashLoading } = useDashboardData();

  const { formatCurrency, formatNumber } = useLocalization();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates('EUR');
  const { accounts } = useAccounts();
  const { selectedMonth, setSelectedMonth, setAvailableMonths, setOpeningBalance, setTransactionCount } = useMonthSelection();

  const userCurrency = preferences?.base_currency || 'EUR';
  const convertToUserCurrency = useCallback(
    (amount: number, currency: string = 'EUR') => convertAmount(amount, currency, userCurrency),
    [convertAmount, userCurrency],
  );

  const accountCurrencyMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.id, a.currency_base || 'EUR');
    return m;
  }, [accounts]);

  const availableMonths = [...monthlyData]
    .map((m) => m.month)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  const latestMonthLabel =
    selectedMonth && availableMonths.includes(selectedMonth)
      ? selectedMonth
      : availableMonths[0] ?? null;

  const currentIndex = monthlyData.findIndex((m) => m.month === latestMonthLabel);
  const currentMonth =
    currentIndex >= 0
      ? monthlyData[currentIndex]
      : { month: '', income: 0, expenses: 0, balance: 0, sentToInvest: 0 };
  const previousMonth =
    currentIndex > 0
      ? monthlyData[currentIndex - 1]
      : { month: '', income: 0, expenses: 0, balance: 0, sentToInvest: 0 };

  const range = latestMonthLabel ? periodRangeOf(latestMonthLabel, "month") : null;
  const prevRange = previousMonth.month ? periodRangeOf(previousMonth.month, "month") : null;

  const { transactions, isLoading } = useTransactions({ startDate: range?.start, endDate: range?.end, excludeHiddenAccounts: true });
  const { closingBalance: monthClosingBalance } = useAccountPeriodSummary(latestMonthLabel, "CASHFLOW", undefined, true);

  const agg = usePeriodAggregates({
    startDate: range?.start,
    endDate: range?.end,
    prevStartDate: prevRange?.start,
    prevEndDate: prevRange?.end,
    granularity: "month",
    convert: convertToUserCurrency,
    periodMonth: latestMonthLabel,
  });

  useEffect(() => {
    setAvailableMonths(availableMonths);
  }, [availableMonths.join('|')]);

  useEffect(() => {
    if (latestMonthLabel && selectedMonth !== latestMonthLabel) {
      setSelectedMonth(latestMonthLabel);
    }
  }, [latestMonthLabel]);

  useEffect(() => {
    if (latestMonthLabel && openingBalanceByMonth[latestMonthLabel] != null) {
      setOpeningBalance(openingBalanceByMonth[latestMonthLabel]);
    } else {
      setOpeningBalance(null);
    }
  }, [latestMonthLabel, openingBalanceByMonth, userCurrency]);

  useEffect(() => {
    setTransactionCount(transactions.length);
  }, [transactions.length]);

  const sankeyAccountFlows = useMemo(() => {
    const accMap = new Map<string, { name: string; income: number; expenses: number }>();
    for (const tx of transactions) {
      if (!tx.account_id || tx.type === "transfer") continue;
      const currency = accountCurrencyMap.get(tx.account_id) || 'EUR';
      const entry = accMap.get(tx.account_id) || { name: tx.account || "Unknown", income: 0, expenses: 0 };
      if (tx.type === "income") entry.income += Math.abs(convertToUserCurrency(tx.amount, currency));
      else if (tx.type === "expense") entry.expenses += Math.abs(convertToUserCurrency(tx.amount, currency));
      accMap.set(tx.account_id, entry);
    }
    return Array.from(accMap.entries())
      .map(([id, data]) => ({ id, name: data.name, income: data.income, expenses: data.expenses }))
      .filter(a => a.income > 0 || a.expenses > 0)
      .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses));
  }, [transactions, convertToUserCurrency, accountCurrencyMap]);

  const hasPreviousData = monthlyData.length >= 2;

  const incomeChange = hasPreviousData && previousMonth.income > 0
    ? Math.round(((currentMonth.income - previousMonth.income) / previousMonth.income) * 100)
    : undefined;

  const expenseChange = hasPreviousData && previousMonth.expenses > 0
    ? Math.round(((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100)
    : undefined;

  const balanceChange = hasPreviousData && previousMonth.balance !== 0
    ? Math.round(((currentMonth.balance - previousMonth.balance) / Math.abs(previousMonth.balance)) * 100)
    : undefined;

  return (
    <>
      <main className="w-full">

        {latestMonthLabel && openingBalanceByMonth[latestMonthLabel] != null && (
          <p className="mb-5 text-sm tabular-nums text-muted-foreground md:hidden">
            {t('stats.openingBalance', { defaultValue: 'Opening balance' })}: {formatCurrency(openingBalanceByMonth[latestMonthLabel])}
          </p>
        )}

        <div className="flex flex-col gap-[14px]">
              {/* KPI row */}
              <div className={DASHBOARD_GRID}>
                <div className={KPI_LEFT_GRID}>
                  <TrendKpiCard
                    kind="income"
                    label={t('stats.income')}
                    icon={<Plus className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                    bgClass="bg-success"
                    monthKey={latestMonthLabel}
                    previousMonthKey={hasPreviousData ? previousMonth.month : null}
                    total={currentMonth.income}
                    previousTotal={hasPreviousData ? previousMonth.income : undefined}
                    formatCurrency={formatCurrency}
                    positiveIsGood
                  />
                  <TrendKpiCard
                    kind="expense"
                    label={t('stats.expenses')}
                    icon={<Minus className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                    bgClass="bg-destructive"
                    monthKey={latestMonthLabel}
                    previousMonthKey={hasPreviousData ? previousMonth.month : null}
                    total={currentMonth.expenses}
                    previousTotal={hasPreviousData ? previousMonth.expenses : undefined}
                    formatCurrency={formatCurrency}
                    positiveIsGood={false}
                  />
                  <NetBalanceKpiCard
                    total={currentMonth.balance}
                    previousTotal={hasPreviousData ? previousMonth.balance : undefined}
                    income={currentMonth.income}
                    expenses={currentMonth.expenses}
                    monthKey={latestMonthLabel}
                    previousMonthKey={hasPreviousData ? previousMonth.month : null}
                    formatCurrency={formatCurrency}
                  />
                </div>
                <div className={KPI_RIGHT_GRID}>
                  <TransfersKpiCard
                    transfersIn={agg.transfersIn}
                    transfersOut={agg.transfersOut}
                    formatCurrency={formatCurrency}
                    formatNumber={formatNumber}
                  />
                  <TrendKpiCard
                    kind="invest"
                    label={t('stats.sentToInvest')}
                    icon={<TrendingUp className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                    bgClass="bg-primary"
                    monthKey={latestMonthLabel}
                    previousMonthKey={hasPreviousData ? previousMonth.month : null}
                    total={currentMonth.sentToInvest}
                    previousTotal={hasPreviousData ? previousMonth.sentToInvest : undefined}
                    formatCurrency={formatCurrency}
                    positiveIsGood
                  />
                </div>
              </div>

              {/* Row 2: weekly income vs expenses + Accounts */}
              <div className={`${DASHBOARD_GRID} lg:h-[250px]`}>
                <WeeklyIncomeExpensesChart weekly={agg.subBreakdown as WeeklyPoint[]} />
                <AccountsStackCard
                  startDate={range?.start}
                  endDate={range?.end}
                  formatCurrency={formatCurrency}
                />
              </div>

              {/* Row 3: Daily balance chart + Daily view heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] lg:h-[300px] gap-[14px]">
                <DailyFlowChart
                  dailyTotals={agg.dailyTotals}
                  monthKey={latestMonthLabel}
                />
                <DailyHeatmapCard
                  dailyTotals={agg.dailyTotals}
                  monthKey={latestMonthLabel}
                />
              </div>

              {/* Row 4: Income by category + Spending by category */}
              <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.72fr] lg:h-[370px] gap-[14px]">
                <CategoryChart data={agg.incomeCategoryData} />
                <SpendingByCategoryChart data={agg.expenseCategoryData} />
              </div>

              {/* Row 5: Monthly flow Sankey + Top expenses */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.82fr_0.8fr] lg:h-[370px] gap-[14px]">
                <MonthlyFlowSankey
                  incomeCategories={agg.incomeCategoryData}
                  expenseCategories={agg.expenseCategoryData}
                  accountFlows={sankeyAccountFlows}
                  openingBalance={latestMonthLabel && openingBalanceByMonth[latestMonthLabel] != null
                    ? openingBalanceByMonth[latestMonthLabel]
                    : 0}
                />
                <TopExpensesCard topExpenses={agg.topExpenses} />
              </div>

              {/* Row 6: Transactions table */}
              <div className="bg-card rounded-xl pt-3 pb-[6px] md:pt-[18px] shadow-section">
                <div className="max-h-[700px] overflow-y-auto">
                  <TransactionTable
                  transactions={transactions}
                  monthKey={latestMonthLabel ?? undefined}
                  openingBalance={latestMonthLabel && openingBalanceByMonth[latestMonthLabel] != null
                    ? openingBalanceByMonth[latestMonthLabel]
                    : null}
                  closingBalance={monthClosingBalance}
                />
                </div>
              </div>
        </div>
      </main>
    </>
  );
}
