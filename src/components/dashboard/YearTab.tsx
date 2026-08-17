import { useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, Loader2 } from "lucide-react";

import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";
import { NetBalanceCard } from "@/components/dashboard/NetBalanceCard";
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
import { periodRangeOf, type MonthOfYearPoint } from "@/lib/analytics";

/** Dashboard's "year" tab — current calendar year vs. previous year. */
export function YearTab() {
  const { t, i18n } = useTranslation("dashboard");
  const { monthlyData: yearlyData, isLoading: isDashLoading } = useDashboardData({ granularity: "year" });
  const { formatCurrency } = useLocalization();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");
  const { selectedPeriod, setSelectedPeriod, setAvailablePeriods } = usePeriodSelection();

  const userCurrency = preferences?.base_currency || "EUR";
  const convertToUserCurrency = useCallback(
    (amount: number) => convertAmount(amount, "EUR", userCurrency),
    [convertAmount, userCurrency],
  );

  const availableYears = useMemo(() => yearlyData.map((y) => y.month), [yearlyData]);

  const selectedYear =
    selectedPeriod.year && availableYears.includes(selectedPeriod.year)
      ? selectedPeriod.year
      : availableYears[availableYears.length - 1] ?? null;

  const currentIndex = yearlyData.findIndex((y) => y.month === selectedYear);
  const current =
    currentIndex >= 0 ? yearlyData[currentIndex] : { month: "", income: 0, expenses: 0, balance: 0, sentToInvest: 0 };
  const previous =
    currentIndex > 0 ? yearlyData[currentIndex - 1] : { month: "", income: 0, expenses: 0, balance: 0, sentToInvest: 0 };
  const hasPreviousData = currentIndex > 0;

  const range = selectedYear ? periodRangeOf(selectedYear, "year") : null;
  const prevRange = hasPreviousData ? periodRangeOf(previous.month, "year") : null;

  const { transactions, isLoading } = useTransactions({
    startDate: range?.start,
    endDate: range?.end,
  });

  const agg = usePeriodAggregates({
    startDate: range?.start,
    endDate: range?.end,
    prevStartDate: prevRange?.start,
    prevEndDate: prevRange?.end,
    granularity: "year",
    convert: convertToUserCurrency,
  });

  useEffect(() => {
    setAvailablePeriods("year", availableYears);
  }, [availableYears.join("|")]);

  useEffect(() => {
    if (selectedYear && selectedPeriod.year !== selectedYear) {
      setSelectedPeriod("year", selectedYear);
    }
  }, [selectedYear]);

  const previousPeriodLabel = hasPreviousData ? previous.month : undefined;

  const displayMonthKey = useMemo(() => {
    if (!transactions.length) return selectedYear ? `${selectedYear}-01` : "2024-01";
    const latest = transactions.reduce((a, b) => (a.date > b.date ? a : b));
    return latest.date.slice(0, 7);
  }, [transactions, selectedYear]);

  const breakdownPoints = useMemo(
    () =>
      (agg.subBreakdown as MonthOfYearPoint[]).map((p) => ({
        label: new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(
          new Date(2024, p.monthIndex - 1, 1),
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
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-3 md:gap-4 lg:flex-row lg:items-stretch">
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:flex-[2]">
              <TrendKpiCard
                kind="income"
                label={t("stats.income")}
                icon={<Plus className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                bgClass="bg-success"
                monthKey={selectedYear}
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
                monthKey={selectedYear}
                previousPeriodLabel={previousPeriodLabel}
                total={convertToUserCurrency(current.expenses)}
                previousTotal={hasPreviousData ? convertToUserCurrency(previous.expenses) : undefined}
                formatCurrency={formatCurrency}
                positiveIsGood={false}
              />
            </div>
            <div className="grid grid-cols-[1.7fr_0.82fr] gap-3 md:gap-4 lg:flex-[2.5] lg:grid-cols-[1.8fr_0.85fr]">
              <NetBalanceCard
                balance={convertToUserCurrency(current.balance)}
                previousBalance={hasPreviousData ? convertToUserCurrency(previous.balance) : undefined}
                sentToInvest={convertToUserCurrency(current.sentToInvest ?? 0)}
                monthKey={selectedYear}
                previousPeriodLabel={previousPeriodLabel}
                formatCurrency={formatCurrency}
              />
              <SavingsRateRingCard
                income={convertToUserCurrency(current.income)}
                expenses={convertToUserCurrency(current.expenses)}
              />
            </div>
          </div>

          {/* Row 2: income vs expenses breakdown + accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
            <PeriodBreakdownChart points={breakdownPoints} subtitle={t("charts.byMonthThisYear", "By month · this year")} />
            <AccountsStackCard
              transactions={transactions}
              monthKey={selectedYear}
              convert={convertToUserCurrency}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Row 3: balance line + heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
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

          {/* Row 4: spending by category + top expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
            <SpendingByCategoryChart data={agg.expenseCategoryData} />
            <TopExpensesCard topExpenses={agg.topExpenses} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            <FixedVsDiscretionaryCard split={agg.essentialSplit} />
            <CategoryChart data={agg.incomeCategoryData} />
          </div>

          <div className="bg-card rounded-xl p-[20px_22px_10px] shadow-section border border-border">
            <div className="max-h-[500px] overflow-y-auto">
              <TransactionTable transactions={transactions} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
