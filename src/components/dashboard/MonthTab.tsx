import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, Loader2 } from "lucide-react";

import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { NetBalanceCard } from "@/components/dashboard/NetBalanceCard";
import { SavingsRateRingCard } from "@/components/dashboard/SavingsRateRingCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";
import { DailyFlowChart } from "@/components/dashboard/DailyFlowChart";
import { DailyHeatmapCard } from "@/components/dashboard/DailyHeatmapCard";
import { AccountsStackCard } from "@/components/dashboard/AccountsStackCard";
import { WeeklyIncomeExpensesChart } from "@/components/dashboard/WeeklyIncomeExpensesChart";
import { FixedVsDiscretionaryCard } from "@/components/dashboard/FixedVsDiscretionaryCard";

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
  const { selectedMonth, setSelectedMonth, setAvailableMonths, setOpeningBalance } = useMonthSelection();

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

            <div className="flex flex-col gap-[18px]">
              {/* KPI area: income + expenses, then the net-balance hero (with sent-to-invest
                  tucked in) next to the savings-rate ring */}
              {/* All four KPIs on a single row on desktop; on mobile the two pairs stack
                  (income+expenses, then the net-balance hero + savings ring) unchanged. */}
              <div className="flex flex-col gap-3 md:gap-4 lg:flex-row lg:items-stretch">
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:flex-[2]">
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
                </div>
                <div className="grid grid-cols-[1.7fr_0.82fr] gap-3 md:gap-4 lg:flex-[2.5] lg:grid-cols-[1.8fr_0.85fr]">
                  <NetBalanceCard
                    balance={convertedCurrentMonth.balance}
                    previousBalance={hasPreviousData ? convertedPreviousMonth.balance : undefined}
                    sentToInvest={convertedCurrentMonth.sentToInvest}
                    monthKey={latestMonthLabel}
                    previousMonthKey={hasPreviousData ? previousMonth.month : null}
                    formatCurrency={formatCurrency}
                  />
                  <SavingsRateRingCard
                    income={convertedCurrentMonth.income}
                    expenses={convertedCurrentMonth.expenses}
                  />
                </div>
              </div>

              {/* Row 2: weekly income vs expenses (this month, wide) + Accounts */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
                <WeeklyIncomeExpensesChart weekly={agg.subBreakdown as WeeklyPoint[]} />
                <AccountsStackCard
                  transactions={transactions}
                  monthKey={latestMonthLabel}
                  convert={convertToUserCurrency}
                  formatCurrency={formatCurrency}
                />
              </div>

              {/* Row 3: Daily balance chart (wide) + Daily view heatmap (with stats, in its square) */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
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

              {/* Row 4: Spending by category (donut + month-over-month list) + Top expenses */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
                <SpendingByCategoryChart data={agg.expenseCategoryData} />
                <TopExpensesCard topExpenses={agg.topExpenses} />
              </div>

              {/* Row 5: essential vs discretionary + income by category */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
                <FixedVsDiscretionaryCard split={agg.essentialSplit} />
                <CategoryChart data={agg.incomeCategoryData} />
              </div>

              {/* Row 6: Transactions table */}
              <div
                className="bg-card rounded-xl p-[20px_22px_10px] shadow-section border border-border"
              >
                <div className="max-h-[500px] overflow-y-auto">
                  <TransactionTable transactions={transactions} />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
