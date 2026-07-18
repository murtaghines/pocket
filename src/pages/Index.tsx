import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { SavingsRateGaugeCard } from "@/components/dashboard/SavingsRateGaugeCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";
import { DailyFlowChart } from "@/components/dashboard/DailyFlowChart";
import { DailyHeatmapCard } from "@/components/dashboard/DailyHeatmapCard";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
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
      : { month: '', income: 0, expenses: 0, balance: 0, sentToInvest: 0 };
  const previousMonth =
    currentIndex > 0
      ? monthlyData[currentIndex - 1]
      : { month: '', income: 0, expenses: 0, balance: 0, sentToInvest: 0 };
  
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

            <div className="flex flex-col gap-[18px]">
              {/* KPI row: Income · Expenses · Sent to invest · Savings rate · Net balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-[16px]">
                <TrendKpiCard
                  kind="income"
                  label={t('stats.income')}
                  icon={<Plus className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                  bgClass="bg-success"
                  monthKey={latestMonthLabel}
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
                  total={convertedCurrentMonth.expenses}
                  previousTotal={hasPreviousData ? convertedPreviousMonth.expenses : undefined}
                  formatCurrency={formatCurrency}
                  positiveIsGood={false}
                />
                <TrendKpiCard
                  kind="invest"
                  label={t('stats.sentToInvest')}
                  icon={<TrendingUp className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                  bgClass="bg-primary"
                  monthKey={latestMonthLabel}
                  total={convertedCurrentMonth.sentToInvest}
                  previousTotal={hasPreviousData ? convertedPreviousMonth.sentToInvest : undefined}
                  formatCurrency={formatCurrency}
                  positiveIsGood
                />
                <SavingsRateGaugeCard
                  income={convertedCurrentMonth.income}
                  expenses={convertedCurrentMonth.expenses}
                />
                <TrendKpiCard
                  kind="balance"
                  label="Net balance"
                  filled
                  icon={<Wallet className="w-[17px] h-[17px]" strokeWidth={2.2} />}
                  bgClass="bg-primary"
                  monthKey={latestMonthLabel}
                  total={convertedCurrentMonth.balance}
                  previousTotal={hasPreviousData ? convertedPreviousMonth.balance : undefined}
                  formatCurrency={formatCurrency}
                  positiveIsGood
                />
              </div>

              {/* Row 2: Income vs Expenses chart + Daily view heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
                <MonthlyChart data={convertedMonthlyData} />
                <DailyHeatmapCard
                  transactions={transactions}
                  monthKey={latestMonthLabel}
                  convert={convertToUserCurrency}
                />
              </div>

              {/* Row 3: Daily balance chart + Accounts list */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
                <DailyFlowChart
                  transactions={transactions}
                  monthKey={latestMonthLabel}
                  convert={convertToUserCurrency}
                />
                <AccountsStackCard
                  transactions={transactions}
                  monthKey={latestMonthLabel}
                  convert={convertToUserCurrency}
                  formatCurrency={formatCurrency}
                />
              </div>

              {/* Row 4: Spending by category + Top expenses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                <SpendingByCategoryChart data={convertedCategoryData} />
                <TopExpensesCard transactions={monthTransactions} />
              </div>

              {/* Row 5: Income analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
                <InvestmentSummaryCard />
                <CategoryChart data={convertedIncomeCategoryData} />
              </div>

              {/* Row 6: Transactions table */}
              <div
                className="bg-card rounded-[18px] p-[20px_22px_10px] border border-border shadow-bento"
              >
                <div className="max-h-[500px] overflow-y-auto">
                  <TransactionTable transactions={monthTransactions} />
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <DashboardFooter />
    </DashboardLayout>
  );
}
