import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Plus, Minus, Loader2, Wallet, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";
import { SavingsRateRingCard } from "@/components/dashboard/SavingsRateRingCard";
import { PeriodBreakdownChart } from "@/components/dashboard/PeriodBreakdownChart";
import { AccountsStackCard } from "@/components/dashboard/AccountsStackCard";
import { MonthlyFlowChart } from "@/components/dashboard/MonthlyFlowChart";
import { MonthlySpendingCard } from "@/components/dashboard/MonthlySpendingCard";
import { MonthlyFlowSankey } from "@/components/dashboard/MonthlyFlowSankey";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { FixedVsDiscretionaryCard } from "@/components/dashboard/FixedVsDiscretionaryCard";
import { TransactionTable } from "@/components/dashboard/TransactionTable";

import { useTransactions } from "@/hooks/useTransactions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { getAccountDisplayName } from "@/lib/accountColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { usePeriodSelection } from "@/hooks/usePeriodSelection";
import { usePeriodAggregates } from "@/hooks/usePeriodAggregates";
import { periodRangeOf, type MonthOfYearPoint } from "@/lib/analytics";

const PAGE_SIZE = 100;

export function YearTab() {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const { accounts: allAccounts } = useAccounts();
  const { monthlyData: yearlyData, openingBalanceByMonth, isLoading: isDashLoading } = useDashboardData({ granularity: "year" });
  const { formatCurrency } = useLocalization();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");
  const { selectedPeriod, setSelectedPeriod, setAvailablePeriods } = usePeriodSelection();
  const [txPage, setTxPage] = useState(1);

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

  const { transactions, isLoading, totalCount } = useTransactions({
    startDate: range?.start,
    endDate: range?.end,
    page: txPage,
    pageSize: PAGE_SIZE,
  });

  const agg = usePeriodAggregates({
    startDate: range?.start,
    endDate: range?.end,
    prevStartDate: prevRange?.start,
    prevEndDate: prevRange?.end,
    granularity: "year",
    convert: convertToUserCurrency,
  });

  const { data: sankeyAccountFlows = [] } = useQuery({
    queryKey: ["year-account-flows", user?.id, range?.start, range?.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("account_id, amount, type")
        .eq("user_id", user!.id)
        .gte("date", range!.start)
        .lte("date", range!.end)
        .neq("type", "transfer");
      if (error) throw error;
      const accMap = new Map<string, { name: string; income: number; expenses: number }>();
      for (const tx of data ?? []) {
        if (!tx.account_id) continue;
        const entry = accMap.get(tx.account_id) || { name: "", income: 0, expenses: 0 };
        const amt = Math.abs(convertToUserCurrency(Number(tx.amount)));
        if (tx.type === "income") entry.income += amt;
        else if (tx.type === "expense") entry.expenses += amt;
        accMap.set(tx.account_id, entry);
      }
      for (const [accId, entry] of accMap) {
        const match = allAccounts?.find((a) => a.id === accId);
        entry.name = match ? getAccountDisplayName(match) : "Unknown";
      }
      return Array.from(accMap.entries())
        .map(([id, d]) => ({ id, name: d.name, income: d.income, expenses: d.expenses }))
        .filter((a) => a.income > 0 || a.expenses > 0)
        .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses));
    },
    enabled: !!user && !!range?.start && !!range?.end,
    staleTime: 30_000,
  });

  useEffect(() => {
    setAvailablePeriods("year", availableYears);
  }, [availableYears.join("|")]);

  useEffect(() => {
    if (selectedYear && selectedPeriod.year !== selectedYear) {
      setSelectedPeriod("year", selectedYear);
    }
    setTxPage(1);
  }, [selectedYear]);

  const previousPeriodLabel = hasPreviousData ? previous.month : undefined;

  const yearOpeningBalance = useMemo(() => {
    if (!selectedYear || !openingBalanceByMonth) return null;
    const janKey = `${selectedYear}-01`;
    if (openingBalanceByMonth[janKey] != null) return openingBalanceByMonth[janKey];
    const monthKeys = Object.keys(openingBalanceByMonth)
      .filter((k) => k.startsWith(selectedYear))
      .sort();
    if (monthKeys.length > 0) return openingBalanceByMonth[monthKeys[0]];
    return null;
  }, [selectedYear, openingBalanceByMonth]);

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
        <div className="flex flex-col gap-[14px]">
          {/* Row 1: KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.55fr_1fr] lg:gap-[14px]">
            <div className="contents lg:grid lg:grid-cols-3 lg:gap-[12px]">
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
              <TrendKpiCard
                kind="balance"
                label={t("stats.netBalance")}
                icon={<Wallet className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                bgClass="bg-foreground"
                monthKey={selectedYear}
                previousPeriodLabel={previousPeriodLabel}
                total={convertToUserCurrency(current.balance)}
                previousTotal={hasPreviousData ? convertToUserCurrency(previous.balance) : undefined}
                formatCurrency={formatCurrency}
                positiveIsGood
              />
            </div>
            <div className="contents lg:grid lg:grid-cols-2 lg:gap-[12px]">
              <SavingsRateRingCard
                income={convertToUserCurrency(current.income)}
                expenses={convertToUserCurrency(current.expenses)}
                previousIncome={hasPreviousData ? convertToUserCurrency(previous.income) : undefined}
                previousExpenses={hasPreviousData ? convertToUserCurrency(previous.expenses) : undefined}
                previousPeriodLabel={previousPeriodLabel}
                monthKey={selectedYear}
              />
              <TrendKpiCard
                kind="invest"
                label={t("stats.sentToInvest")}
                icon={<TrendingUp className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                bgClass="bg-primary"
                monthKey={selectedYear}
                previousPeriodLabel={previousPeriodLabel}
                total={convertToUserCurrency(current.sentToInvest ?? 0)}
                previousTotal={hasPreviousData ? convertToUserCurrency(previous.sentToInvest ?? 0) : undefined}
                formatCurrency={formatCurrency}
                positiveIsGood
              />
            </div>
          </div>

          {/* Row 2: Evolution by month + Accounts (year-end balance) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px]">
            <PeriodBreakdownChart
              points={breakdownPoints}
              subtitle={t("charts.byMonthThisYear", "By month · this year")}
            />
            <AccountsStackCard
              startDate={range?.start}
              endDate={range?.end}
              convert={convertToUserCurrency}
              formatCurrency={formatCurrency}
              subtitleOverride={t("charts.accountsYearSubtitle", "Year-end balance")}
            />
          </div>

          {/* Row 3: Monthly cumulative balance + Spending by month */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px]">
            <MonthlyFlowChart
              dailyTotals={agg.dailyTotals}
              yearKey={selectedYear}
              convert={convertToUserCurrency}
            />
            <MonthlySpendingCard
              dailyTotals={agg.dailyTotals}
              yearKey={selectedYear}
              convert={convertToUserCurrency}
            />
          </div>

          {/* Row 4: Income by category + Spending by category */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.62fr] gap-[14px]">
            <CategoryChart data={agg.incomeCategoryData} />
            <SpendingByCategoryChart
              data={agg.expenseCategoryData}
              vsPrevLabel={t("charts.treemapVsPrevYear", "vs. prev year")}
            />
          </div>

          {/* Row 5: Yearly flow Sankey */}
          <MonthlyFlowSankey
            incomeCategories={agg.incomeCategoryData}
            expenseCategories={agg.expenseCategoryData}
            accountFlows={sankeyAccountFlows}
            openingBalance={yearOpeningBalance != null ? convertToUserCurrency(yearOpeningBalance) : 0}
          />

          {/* Row 6: Fixed vs discretionary + Top expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
            <FixedVsDiscretionaryCard split={agg.essentialSplit} />
            <TopExpensesCard topExpenses={agg.topExpenses} />
          </div>

          {/* Row 6: Transactions table */}
          <div className="bg-card rounded-xl p-[20px_0_6px] shadow-section">
            <div className="max-h-[700px] overflow-y-auto">
              <TransactionTable
                transactions={transactions}
                totalCount={totalCount ?? undefined}
                openingBalance={yearOpeningBalance != null
                  ? convertToUserCurrency(yearOpeningBalance)
                  : null}
              />
            </div>
            {totalCount != null && totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-between px-1 pt-3 pb-2">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t("transactions.showing", {
                    from: (txPage - 1) * PAGE_SIZE + 1,
                    to: Math.min(txPage * PAGE_SIZE, totalCount),
                    total: totalCount,
                    defaultValue: "{{from}}–{{to}} of {{total}}",
                  })}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => p - 1)}
                    className="p-1 rounded-md hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={txPage * PAGE_SIZE >= totalCount}
                    onClick={() => setTxPage((p) => p + 1)}
                    className="p-1 rounded-md hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
