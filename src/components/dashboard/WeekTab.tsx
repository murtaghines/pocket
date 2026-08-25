import { useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, Loader2, Wallet, TrendingUp } from "lucide-react";

import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";
import { SavingsRateRingCard } from "@/components/dashboard/SavingsRateRingCard";
import { PeriodBreakdownChart } from "@/components/dashboard/PeriodBreakdownChart";
import { AccountsStackCard } from "@/components/dashboard/AccountsStackCard";
import { DailyFlowChart } from "@/components/dashboard/DailyFlowChart";
import { DailyHeatmapCard } from "@/components/dashboard/DailyHeatmapCard";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { FixedVsDiscretionaryCard } from "@/components/dashboard/FixedVsDiscretionaryCard";
import { TransactionTable } from "@/components/dashboard/TransactionTable";

import { useTransactions } from "@/hooks/useTransactions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { usePeriodSelection } from "@/hooks/usePeriodSelection";
import { usePeriodAggregates } from "@/hooks/usePeriodAggregates";
import { periodRangeOf, formatPeriodLabel, type DailyOfWeekPoint } from "@/lib/analytics";

/** Dashboard's "week" tab — current ISO week vs. previous week. */
export function WeekTab() {
  const { t, i18n } = useTranslation("dashboard");
  const { monthlyData: weeklyData, isLoading: isDashLoading } = useDashboardData({ granularity: "week" });
  const { formatCurrency } = useLocalization();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");
  const { selectedPeriod, setSelectedPeriod, setAvailablePeriods } = usePeriodSelection();

  const userCurrency = preferences?.base_currency || "EUR";
  const convertToUserCurrency = useCallback(
    (amount: number) => convertAmount(amount, "EUR", userCurrency),
    [convertAmount, userCurrency],
  );

  const availableWeeks = useMemo(() => weeklyData.map((w) => w.month), [weeklyData]);

  const selectedWeek =
    selectedPeriod.week && availableWeeks.includes(selectedPeriod.week)
      ? selectedPeriod.week
      : availableWeeks[availableWeeks.length - 1] ?? null;

  const currentIndex = weeklyData.findIndex((w) => w.month === selectedWeek);
  const current =
    currentIndex >= 0 ? weeklyData[currentIndex] : { month: "", income: 0, expenses: 0, balance: 0, sentToInvest: 0 };
  const previous =
    currentIndex > 0 ? weeklyData[currentIndex - 1] : { month: "", income: 0, expenses: 0, balance: 0, sentToInvest: 0 };
  const hasPreviousData = currentIndex > 0;

  const range = selectedWeek ? periodRangeOf(selectedWeek, "week") : null;
  const prevRange = hasPreviousData ? periodRangeOf(previous.month, "week") : null;

  const { transactions, isLoading } = useTransactions({
    startDate: range?.start,
    endDate: range?.end,
  });

  const agg = usePeriodAggregates({
    startDate: range?.start,
    endDate: range?.end,
    prevStartDate: prevRange?.start,
    prevEndDate: prevRange?.end,
    granularity: "week",
    convert: convertToUserCurrency,
  });

  useEffect(() => {
    setAvailablePeriods("week", availableWeeks);
  }, [availableWeeks.join("|")]);

  useEffect(() => {
    if (selectedWeek && selectedPeriod.week !== selectedWeek) {
      setSelectedPeriod("week", selectedWeek);
    }
  }, [selectedWeek]);

  const previousPeriodLabel = hasPreviousData
    ? formatPeriodLabel(previous.month, "week", i18n.language)
    : undefined;

  const displayMonthKey = useMemo(() => {
    if (!transactions.length) return selectedWeek ? null : null;
    const latest = transactions.reduce((a, b) => (a.date > b.date ? a : b));
    return latest.date.slice(0, 7);
  }, [transactions, selectedWeek]);

  const breakdownPoints = useMemo(
    () =>
      (agg.subBreakdown as DailyOfWeekPoint[]).map((p) => ({
        label: new Intl.DateTimeFormat(i18n.language || "en", { weekday: "short" }).format(
          new Date(2024, 0, 1 + p.dayIndex),
        ),
        income: p.income,
        expenses: p.spend,
      })),
    [agg.subBreakdown, i18n.language],
  );

  return (
    <main className="w-full">
      {(isLoading || isDashLoading || prefsLoading || agg.isLoading) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && !isDashLoading && !prefsLoading && !agg.isLoading && (
        <div className="flex flex-col gap-[14px]">
          {/* KPI row — 5 cards, split to align with chart grid below */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.55fr_1fr] lg:gap-[14px]">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-[12px]">
              <TrendKpiCard
                kind="income"
                label={t("stats.income")}
                icon={<Plus className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                bgClass="bg-success"
                monthKey={selectedWeek}
                previousPeriodLabel={previousPeriodLabel}
                total={convertToUserCurrency(current.income)}
                previousTotal={hasPreviousData ? convertToUserCurrency(previous.income) : undefined}
                formatCurrency={formatCurrency}
                positiveIsGood
              />
              <TrendKpiCard
                kind="expense"
                label={t("stats.expenses")}
                icon={<Minus className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                bgClass="bg-destructive"
                monthKey={selectedWeek}
                previousPeriodLabel={previousPeriodLabel}
                total={convertToUserCurrency(current.expenses)}
                previousTotal={hasPreviousData ? convertToUserCurrency(previous.expenses) : undefined}
                formatCurrency={formatCurrency}
                positiveIsGood={false}
              />
              <TrendKpiCard
                kind="balance"
                label={t("stats.netBalance")}
                icon={<Wallet className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                bgClass="bg-foreground"
                monthKey={selectedWeek}
                previousPeriodLabel={previousPeriodLabel}
                total={convertToUserCurrency(current.balance)}
                previousTotal={hasPreviousData ? convertToUserCurrency(previous.balance) : undefined}
                formatCurrency={formatCurrency}
                positiveIsGood
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:gap-[12px]">
              <SavingsRateRingCard
                income={convertToUserCurrency(current.income)}
                expenses={convertToUserCurrency(current.expenses)}
                previousIncome={hasPreviousData ? convertToUserCurrency(previous.income) : undefined}
                previousExpenses={hasPreviousData ? convertToUserCurrency(previous.expenses) : undefined}
                previousPeriodLabel={previousPeriodLabel}
                monthKey={selectedWeek}
              />
              <TrendKpiCard
                kind="invest"
                label={t("stats.sentToInvest")}
                icon={<TrendingUp className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                bgClass="bg-primary"
                monthKey={selectedWeek}
                previousPeriodLabel={previousPeriodLabel}
                total={convertToUserCurrency(current.sentToInvest ?? 0)}
                previousTotal={hasPreviousData ? convertToUserCurrency(previous.sentToInvest ?? 0) : undefined}
                formatCurrency={formatCurrency}
                positiveIsGood
              />
            </div>
          </div>

          {/* Row 2: income vs expenses breakdown + accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px]">
            <PeriodBreakdownChart points={breakdownPoints} subtitle={t("charts.byDayThisWeek", "By day · this week")} />
            <AccountsStackCard
              startDate={range?.start}
              endDate={range?.end}
              convert={convertToUserCurrency}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Row 3: balance line + heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px]">
            <DailyFlowChart
              dailyTotals={agg.dailyTotals}
              monthKey={displayMonthKey}
              convert={convertToUserCurrency}
            />
            <DailyHeatmapCard
              dailyTotals={agg.dailyTotals}
              monthKey={displayMonthKey}
              convert={convertToUserCurrency}
            />
          </div>

          {/* Row 4: Income by category + Spending by category */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.62fr] gap-[14px]">
            <CategoryChart data={agg.incomeCategoryData} />
            <SpendingByCategoryChart data={agg.expenseCategoryData} />
          </div>

          {/* Row 5: Fixed vs discretionary + Top expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
            <FixedVsDiscretionaryCard split={agg.essentialSplit} />
            <TopExpensesCard topExpenses={agg.topExpenses} />
          </div>

          {/* Row 6: Transactions table */}
          <div className="bg-card rounded-xl p-[20px_0_6px] shadow-section">
            <div className="max-h-[700px] overflow-y-auto">
              <TransactionTable transactions={transactions} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
