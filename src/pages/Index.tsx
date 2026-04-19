import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { SavingsRateCard } from "@/components/dashboard/SavingsRateCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { TrendKpiCard } from "@/components/dashboard/TrendKpiCard";

import { InvestmentSummaryCard } from "@/components/dashboard/InvestmentSummaryCard";


import { EmptyStateBanner } from "@/components/dashboard/EmptyStateBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useProfile } from "@/hooks/useProfile";
import { Wallet, Loader2 } from "lucide-react";

export default function Index() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { 
    transactions, 
    monthlyData, 
    categoryData,
    incomeCategoryData,
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

  const currentMonth = monthlyData[monthlyData.length - 1] || { month: '', income: 0, expenses: 0, balance: 0 };
  const previousMonth = monthlyData[monthlyData.length - 2] || { month: '', income: 0, expenses: 0, balance: 0 };
  
  // Get the month label from the last uploaded data (not current calendar month)
  const latestMonthLabel = monthlyData.length > 0 
    ? monthlyData[monthlyData.length - 1].month 
    : null;
  
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

  const convertedCategoryData = categoryData.map(c => ({
    ...c,
    value: convertToUserCurrency(c.value),
  }));

  const convertedIncomeCategoryData = incomeCategoryData.map(c => ({
    ...c,
    value: convertToUserCurrency(c.value),
  }));

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
      
      <main className="max-w-[1400px] mx-auto">

        {(isLoading || prefsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !prefsLoading && (
          <>
            <EmptyStateBanner hasData={transactions.length > 0} />

            {/* Section header */}
            <div className="mb-6">
              <h3 className="text-2xl md:text-3xl font-semibold capitalize text-foreground">
                {latestMonthLabel ? formatMonth(latestMonthLabel + '-01') : t('period.noPeriods', 'No data yet')}
              </h3>
              {latestMonthLabel && openingBalanceByMonth[latestMonthLabel] != null && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('stats.openingBalance', { defaultValue: 'Opening balance' })}: {formatCurrency(convertToUserCurrency(openingBalanceByMonth[latestMonthLabel]))}
                </p>
              )}
            </div>

            {/* KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <StatCard
                title={t('stats.income')}
                value={formatCurrency(convertedCurrentMonth.income)}
                change={incomeChange}
                changeLabel={t('stats.vsLastMonth')}
                previousValue={hasPreviousData ? formatCurrency(convertedPreviousMonth.income) : undefined}
                type="income"
                icon={<Plus className="w-5 h-5" />}
                delay={0}
              />
              <ExpenseTrendCard
                transactions={transactions}
                monthKey={latestMonthLabel}
                totalExpense={convertedCurrentMonth.expenses}
                previousExpense={hasPreviousData ? convertedPreviousMonth.expenses : undefined}
                convert={convertToUserCurrency}
                formatCurrency={formatCurrency}
                delay={100}
              />
              <StatCard
                title={t('stats.balance')}
                value={formatCurrency(convertedCurrentMonth.balance)}
                change={balanceChange}
                changeLabel={t('stats.vsLastMonth')}
                previousValue={hasPreviousData ? formatCurrency(convertedPreviousMonth.balance) : undefined}
                type="balance"
                icon={<Wallet className="w-5 h-5" />}
                delay={200}
              />
            </div>

            {/* Investment, Savings & Income Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <InvestmentSummaryCard />
              <SavingsRateCard income={convertedSummary.income} expenses={convertedSummary.expenses} delay={250} />
              <CategoryChart data={convertedIncomeCategoryData} />
            </div>

            {/* Expense Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <SpendingByCategoryChart data={convertedCategoryData} />
              <TopExpensesCard transactions={transactions} />
            </div>

            {/* Transactions */}
            <div className="bg-card rounded-2xl p-3 md:p-4 border border-border" style={{ boxShadow: 'var(--shadow-section)' }}>
              <div className="max-h-[500px] overflow-y-auto">
                <TransactionTable transactions={transactions} />
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
