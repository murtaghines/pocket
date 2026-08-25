import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, Loader2, Wallet, TrendingUp } from "lucide-react";

import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { SavingsRateRingCard } from "@/components/dashboard/SavingsRateRingCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";
import { DailyFlowChart } from "@/components/dashboard/DailyFlowChart";
import { DailyHeatmapCard } from "@/components/dashboard/DailyHeatmapCard";
import { AccountsStackCard } from "@/components/dashboard/AccountsStackCard";
import { WeeklyIncomeExpensesChart } from "@/components/dashboard/WeeklyIncomeExpensesChart";
import { MonthlyFlowSankey } from "@/components/dashboard/MonthlyFlowSankey";

import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useProfile } from "@/hooks/useProfile";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { usePeriodAggregates } from "@/hooks/usePeriodAggregates";
import { periodRangeOf, type WeeklyPoint } from "@/lib/analytics";

/** Dashboard's "month" tab — current month vs. previous month. Verbatim body of the former Index.tsx page. */
export function MonthTab() {
  const { t } = useTranslation('dashboard');
  const { monthlyData, openingBalanceByMonth, isLoading: isDashLoading } = useDashboardData();

  const { formatCurrency } = useLocalization();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates('EUR');
  const { profile } = useProfile();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { selectedMonth, setSelectedMonth, setAvailableMonths, setOpeningBalance, setTransactionCount } = useMonthSelection();

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

  const { transactions, isLoading } = useTransactions({ startDate: range?.start, endDate: range?.end });

  useEffect(() => {
    if (!prefsLoading && preferences && preferences.id) {
      const needsOnboarding = preferences.onboarding_completed === false || preferences.onboarding_completed === null || preferences.onboarding_completed === undefined;
      setShowOnboarding(needsOnboarding);
      setOnboardingChecked(true);
    }
  }, [preferences, prefsLoading]);

  const userCurrency = preferences?.base_currency || 'EUR';
  const convertToUserCurrency = useCallback(
    (amount: number) => convertAmount(amount, 'EUR', userCurrency),
    [convertAmount, userCurrency],
  );

  const agg = usePeriodAggregates({
    startDate: range?.start,
    endDate: range?.end,
    prevStartDate: prevRange?.start,
    prevEndDate: prevRange?.end,
    granularity: "month",
    convert: convertToUserCurrency,
  });

  // Sync month state into the layout header
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
      setOpeningBalance(convertToUserCurrency(openingBalanceByMonth[latestMonthLabel]));
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
      const entry = accMap.get(tx.account_id) || { name: tx.account || "Unknown", income: 0, expenses: 0 };
      if (tx.type === "income") entry.income += Math.abs(convertToUserCurrency(tx.amount));
      else if (tx.type === "expense") entry.expenses += Math.abs(convertToUserCurrency(tx.amount));
      accMap.set(tx.account_id, entry);
    }
    return Array.from(accMap.entries())
      .map(([id, data]) => ({ id, name: data.name, income: data.income, expenses: data.expenses }))
      .filter(a => a.income > 0 || a.expenses > 0)
      .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses));
  }, [transactions, convertToUserCurrency]);

  const convertedCurrentMonth = {
    ...currentMonth,
    income: convertToUserCurrency(currentMonth.income),
    expenses: convertToUserCurrency(currentMonth.expenses),
    balance: convertToUserCurrency(currentMonth.balance),
    sentToInvest: convertToUserCurrency(currentMonth.sentToInvest ?? 0),
  };

  const convertedPreviousMonth = {
    ...previousMonth,
    income: convertToUserCurrency(previousMonth.income),
    expenses: convertToUserCurrency(previousMonth.expenses),
    balance: convertToUserCurrency(previousMonth.balance),
    sentToInvest: convertToUserCurrency(previousMonth.sentToInvest ?? 0),
  };

  const hasPreviousData = monthlyData.length >= 2;

  const incomeChange = hasPreviousData && previousMonth.income > 0
    ? Math.round(((currentMonth.income - previousMonth.income) / previousMonth.income) * 100)
    : undefined;

  const expenseChange = hasPreviousData && previousMonth.expenses > 0
    ? Math.round(((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100)
    : undefined;

  const balanceChange = hasPreviousData && convertedPreviousMonth.balance !== 0
    ? Math.round(((convertedCurrentMonth.balance - convertedPreviousMonth.balance) / Math.abs(convertedPreviousMonth.balance)) * 100)
    : undefined;



  return (
    <>
      {onboardingChecked && (
        <OnboardingModal
          open={showOnboarding}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <main className="w-full">

        {(isLoading || isDashLoading || prefsLoading || agg.isLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !isDashLoading && !prefsLoading && !agg.isLoading && (
          <>
            {latestMonthLabel && openingBalanceByMonth[latestMonthLabel] != null && (
              <p className="mb-5 text-sm tabular-nums text-muted-foreground md:hidden">
                {t('stats.openingBalance', { defaultValue: 'Opening balance' })}: {formatCurrency(convertToUserCurrency(openingBalanceByMonth[latestMonthLabel]))}
              </p>
            )}

            <div className="flex flex-col gap-[14px]">
              {/* KPI row — 5 cards, split to align with chart grid below */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.55fr_1fr] lg:gap-[14px]">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-[12px]">
                  <TrendKpiCard
                    kind="income"
                    label={t('stats.income')}
                    icon={<Plus className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                    bgClass="bg-success"
                    monthKey={latestMonthLabel}
                    previousMonthKey={hasPreviousData ? previousMonth.month : null}
                    total={convertedCurrentMonth.income}
                    previousTotal={hasPreviousData ? convertedPreviousMonth.income : undefined}
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
                    total={convertedCurrentMonth.expenses}
                    previousTotal={hasPreviousData ? convertedPreviousMonth.expenses : undefined}
                    formatCurrency={formatCurrency}
                    positiveIsGood={false}
                  />
                  <TrendKpiCard
                    kind="balance"
                    label={t('stats.netBalance')}
                    icon={<Wallet className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                    bgClass="bg-foreground"
                    monthKey={latestMonthLabel}
                    previousMonthKey={hasPreviousData ? previousMonth.month : null}
                    total={convertedCurrentMonth.balance}
                    previousTotal={hasPreviousData ? convertedPreviousMonth.balance : undefined}
                    formatCurrency={formatCurrency}
                    positiveIsGood
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 lg:gap-[12px]">
                  <SavingsRateRingCard
                    income={convertedCurrentMonth.income}
                    expenses={convertedCurrentMonth.expenses}
                    previousIncome={hasPreviousData ? convertedPreviousMonth.income : undefined}
                    previousExpenses={hasPreviousData ? convertedPreviousMonth.expenses : undefined}
                    monthKey={latestMonthLabel}
                  />
                  <TrendKpiCard
                    kind="invest"
                    label={t('stats.sentToInvest')}
                    icon={<TrendingUp className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                    bgClass="bg-primary"
                    monthKey={latestMonthLabel}
                    previousMonthKey={hasPreviousData ? previousMonth.month : null}
                    total={convertedCurrentMonth.sentToInvest}
                    previousTotal={hasPreviousData ? convertedPreviousMonth.sentToInvest : undefined}
                    formatCurrency={formatCurrency}
                    positiveIsGood
                  />
                </div>
              </div>

              {/* Row 2: weekly income vs expenses (this month, wide) + Accounts */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px]">
                <WeeklyIncomeExpensesChart weekly={agg.subBreakdown as WeeklyPoint[]} />
                <AccountsStackCard
                  startDate={range?.start}
                  endDate={range?.end}
                  convert={convertToUserCurrency}
                  formatCurrency={formatCurrency}
                />
              </div>

              {/* Row 3: Daily balance chart (wide) + Daily view heatmap (with stats, in its square) */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px]">
                <DailyFlowChart
                  dailyTotals={agg.dailyTotals}
                  monthKey={latestMonthLabel}
                  convert={convertToUserCurrency}
                />
                <DailyHeatmapCard
                  dailyTotals={agg.dailyTotals}
                  monthKey={latestMonthLabel}
                  convert={convertToUserCurrency}
                />
              </div>

              {/* Row 4: Income by category (blue, 1fr) + Spending by category (1.62fr) */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.62fr] gap-[14px]">
                <CategoryChart data={agg.incomeCategoryData} />
                <SpendingByCategoryChart data={agg.expenseCategoryData} monthKey={latestMonthLabel} />
              </div>

              {/* Row 5: Monthly flow Sankey (1.62fr) + Top expenses (1fr) */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.62fr_1fr] gap-[14px]">
                <MonthlyFlowSankey
                  incomeCategories={agg.incomeCategoryData}
                  expenseCategories={agg.expenseCategoryData}
                  accountFlows={sankeyAccountFlows}
                  openingBalance={latestMonthLabel && openingBalanceByMonth[latestMonthLabel] != null
                    ? convertToUserCurrency(openingBalanceByMonth[latestMonthLabel])
                    : 0}
                />
                <TopExpensesCard topExpenses={agg.topExpenses} />
              </div>

              {/* Row 6: Transactions table */}
              <div className="bg-card rounded-xl p-[20px_0_6px] shadow-section">
                <div className="max-h-[700px] overflow-y-auto">
                  <TransactionTable transactions={transactions} monthKey={latestMonthLabel ?? undefined} />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
