import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { SavingsRateGaugeCard } from "@/components/dashboard/SavingsRateGaugeCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";
import { DailyFlowChart } from "@/components/dashboard/DailyFlowChart";
import { DailyHeatmapCard } from "@/components/dashboard/DailyHeatmapCard";

import { InvestmentSummaryCard } from "@/components/dashboard/InvestmentSummaryCard";
import { AccountsStackCard } from "@/components/dashboard/AccountsStackCard";


import { EmptyStateBanner } from "@/components/dashboard/EmptyStateBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useProfile } from "@/hooks/useProfile";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { Wallet, Loader2 } from "lucide-react";
import { getCategoryLabel, categoryColors as categoryColorVars } from "@/lib/categoryTranslations";
import type { Category } from "@/lib/mockData";
import { Button } from "@/components/ui/button";

export default function Index() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { 
    transactions, 
    monthlyData, 
    summary, 
    openingBalanceByMonth,
    isLoading 
  } = useTransactions();
  
  const { formatCurrency, formatMonth } = useLocalization();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates('EUR');
  const { profile } = useProfile();
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { selectedMonth, setSelectedMonth, setAvailableMonths, setOpeningBalance } = useMonthSelection();

  useEffect(() => {
    if (!prefsLoading && preferences && preferences.id) {
      const needsOnboarding = preferences.onboarding_completed === false || preferences.onboarding_completed === null || preferences.onboarding_completed === undefined;
      setShowOnboarding(needsOnboarding);
      setOnboardingChecked(true);
    }
  }, [preferences, prefsLoading]);

  const userCurrency = preferences?.base_currency || 'EUR';
  const convertToUserCurrency = (amount: number) => {
    return convertAmount(amount, 'EUR', userCurrency);
  };

  // Available months (only those with data), sorted descending (newest first)
  const availableMonths = [...monthlyData]
    .map((m) => m.month)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  // Default to latest month with data; allow user to override via selector
  const latestMonthLabel =
    selectedMonth && availableMonths.includes(selectedMonth)
      ? selectedMonth
      : availableMonths[0] ?? null;

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

  const currentIndex = monthlyData.findIndex((m) => m.month === latestMonthLabel);
  const currentMonth =
    currentIndex >= 0
      ? monthlyData[currentIndex]
      : { month: '', income: 0, expenses: 0, balance: 0 };
  const previousMonth =
    currentIndex > 0
      ? monthlyData[currentIndex - 1]
      : { month: '', income: 0, expenses: 0, balance: 0 };
  
  const convertedCurrentMonth = {
    ...currentMonth,
    income: convertToUserCurrency(currentMonth.income),
    expenses: convertToUserCurrency(currentMonth.expenses),
    balance: convertToUserCurrency(currentMonth.balance),
  };

  const convertedPreviousMonth = {
    ...previousMonth,
    income: convertToUserCurrency(previousMonth.income),
    expenses: convertToUserCurrency(previousMonth.expenses),
    balance: convertToUserCurrency(previousMonth.balance),
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

  

  const convertedMonthlyData = monthlyData.map(m => ({
    ...m,
    income: convertToUserCurrency(m.income),
    expenses: convertToUserCurrency(m.expenses),
    balance: convertToUserCurrency(m.balance),
  }));

  // Recompute category breakdowns for the SELECTED month so charts react
  // to the month dropdown AND to live edits (categories, movement) made in
  // the transaction tables.
  const getCategoryHslColor = (slug: string): string => {
    const varName = categoryColorVars[slug];
    if (!varName) return "hsl(220, 10%, 55%)";
    if (typeof window !== "undefined") {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${varName}`)
        .trim();
      if (value) return `hsl(${value})`;
    }
    return "hsl(220, 10%, 55%)";
  };

  const monthTransactions = latestMonthLabel
    ? transactions.filter((t) => t.date.startsWith(latestMonthLabel))
    : [];

  const buildCategoryData = (filterFn: (t: typeof transactions[number]) => boolean) => {
    const totals: Record<string, number> = {};
    monthTransactions.filter(filterFn).forEach((t) => {
      const key = t.categorySlug || t.category;
      totals[key] = (totals[key] || 0) + Math.abs(t.amount);
    });
    return Object.entries(totals).map(([slug, value]) => ({
      name: getCategoryLabel(slug),
      value: Math.round(convertToUserCurrency(value) * 100) / 100,
      category: slug as Category,
      color: getCategoryHslColor(slug),
    }));
  };

  const convertedCategoryData = buildCategoryData(
    (t) => t.movement === "EXPENSE" || t.type === "expense"
  );
  const convertedIncomeCategoryData = buildCategoryData(
    (t) => t.movement === "INCOME" || t.type === "income"
  );

  const convertedSummary = {
    income: convertToUserCurrency(summary.income),
    expenses: convertToUserCurrency(summary.expenses),
    balance: convertToUserCurrency(summary.balance),
  };




  return (
    <DashboardLayout>
      {onboardingChecked && (
        <OnboardingModal 
          open={showOnboarding} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}
      
      <main className="w-full">

        {(isLoading || prefsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !prefsLoading && (
          <>
            {/* Section header (mobile only — desktop shows it in the sticky top bar) */}
            <div className="mb-6 md:hidden">
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight capitalize text-foreground leading-tight">
                {latestMonthLabel ? formatMonth(latestMonthLabel + '-01') : t('period.noPeriods', 'No data yet')}
              </h1>
              {latestMonthLabel && openingBalanceByMonth[latestMonthLabel] != null && (
                <p className="text-sm tabular-nums text-muted-foreground mt-1">
                  {t('stats.openingBalance', { defaultValue: 'Opening balance' })}: {formatCurrency(convertToUserCurrency(openingBalanceByMonth[latestMonthLabel]))}
                </p>
              )}
            </div>

            {/* KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.75fr] gap-4 mb-4">
              <TrendKpiCard
                kind="income"
                label={t('stats.income')}
                icon={<Plus className="w-5 h-5" strokeWidth={2.5} />}
                bgClass="bg-success"
                transactions={transactions}
                monthKey={latestMonthLabel}
                total={convertedCurrentMonth.income}
                previousTotal={hasPreviousData ? convertedPreviousMonth.income : undefined}
                convert={convertToUserCurrency}
                formatCurrency={formatCurrency}
                positiveIsGood
                delay={0}
              />
              <TrendKpiCard
                kind="expense"
                label={t('stats.expenses')}
                icon={<Minus className="w-5 h-5" strokeWidth={2.5} />}
                bgClass="bg-destructive"
                transactions={transactions}
                monthKey={latestMonthLabel}
                total={convertedCurrentMonth.expenses}
                previousTotal={hasPreviousData ? convertedPreviousMonth.expenses : undefined}
                convert={convertToUserCurrency}
                formatCurrency={formatCurrency}
                positiveIsGood={false}
                delay={100}
              />
              <TrendKpiCard
                kind="balance"
                label={t('stats.balance')}
                icon={<Wallet className="w-5 h-5 text-primary" strokeWidth={2.5} />}
                bgClass="bg-primary"
                transactions={transactions}
                monthKey={latestMonthLabel}
                total={convertedCurrentMonth.balance}
                previousTotal={hasPreviousData ? convertedPreviousMonth.balance : undefined}
                convert={convertToUserCurrency}
                formatCurrency={formatCurrency}
                positiveIsGood
                delay={200}
              />
              <SavingsRateGaugeCard
                income={convertedCurrentMonth.income}
                expenses={convertedCurrentMonth.expenses}
                previousIncome={hasPreviousData ? convertedPreviousMonth.income : undefined}
                previousExpenses={hasPreviousData ? convertedPreviousMonth.expenses : undefined}
                delay={300}
              />
            </div>

            {/* Weekly Flow + Daily Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_400px] gap-4 mb-4">
              <DailyFlowChart
                transactions={transactions}
                monthKey={latestMonthLabel}
                convert={convertToUserCurrency}
              />
              <DailyHeatmapCard
                transactions={transactions}
                monthKey={latestMonthLabel}
                convert={convertToUserCurrency}
              />
            </div>

            {/* Investment & Income Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <InvestmentSummaryCard />
              <CategoryChart data={convertedIncomeCategoryData} />
            </div>

            {/* Expense Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <SpendingByCategoryChart data={convertedCategoryData} />
              <TopExpensesCard transactions={monthTransactions} />
            </div>

            {/* Accounts stack (moved below) */}
            <div className="mb-4">
              <AccountsStackCard
                transactions={transactions}
                monthKey={latestMonthLabel}
                convert={convertToUserCurrency}
                formatCurrency={formatCurrency}
              />
            </div>

            {/* Transactions */}
            <div className="bg-card rounded-lg p-3 md:p-4 border border-border" style={{ boxShadow: 'var(--shadow-section)' }}>
              <div className="max-h-[500px] overflow-y-auto">
                <TransactionTable transactions={monthTransactions} />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="mt-12 relative z-10">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            pocket
          </p>
        </div>
      </footer>
    </DashboardLayout>
  );
}
