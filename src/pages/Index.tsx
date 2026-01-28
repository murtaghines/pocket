import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { SavingsRateCard } from "@/components/dashboard/SavingsRateCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { WeeklyComparisonChart } from "@/components/dashboard/WeeklyComparisonChart";

import { YearlyBalanceChart } from "@/components/dashboard/YearlyBalanceChart";
import { InvestmentSummaryCard } from "@/components/dashboard/InvestmentSummaryCard";
import { MonthClosingBanner } from "@/components/dashboard/MonthClosingBanner";
import { MonthStatusIndicator } from "@/components/dashboard/MonthStatusIndicator";
import { EmptyStateBanner } from "@/components/dashboard/EmptyStateBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react";

export default function Index() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { 
    transactions, 
    monthlyData, 
    categoryData, 
    summary, 
    isLoading 
  } = useTransactions();
  
  const { formatCurrency, formatMonth } = useLocalization();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates('EUR');
  
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

  const currentMonthName = formatMonth(new Date());

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

  const convertedSummary = {
    income: convertToUserCurrency(summary.income),
    expenses: convertToUserCurrency(summary.expenses),
    balance: convertToUserCurrency(summary.balance),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {onboardingChecked && (
        <OnboardingModal 
          open={showOnboarding} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}
      
      <main className="container px-4 md:px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {currentMonthName}
          </p>
        </div>

        {(isLoading || prefsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !prefsLoading && (
          <>
            <EmptyStateBanner hasData={transactions.length > 0} />
            <MonthClosingBanner />

            <h3 className="text-xl font-semibold mb-4 capitalize">
              {currentMonth.month || currentMonthName}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
              <StatCard
                title={t('stats.income')}
                value={formatCurrency(convertedCurrentMonth.income)}
                change={incomeChange}
                changeLabel={t('stats.vsLastMonth')}
                type="income"
                icon={<TrendingUp className="w-5 h-5" />}
                delay={0}
              />
              <StatCard
                title={t('stats.expenses')}
                value={formatCurrency(convertedCurrentMonth.expenses)}
                change={expenseChange}
                changeLabel={t('stats.vsLastMonth')}
                type="expense"
                icon={<TrendingDown className="w-5 h-5" />}
                delay={100}
                invertChangeColor={true}
              />
              <StatCard
                title={t('stats.balance')}
                value={formatCurrency(convertedCurrentMonth.balance)}
                change={balanceChange}
                changeLabel={t('stats.vsLastMonth')}
                type="balance"
                icon={<Wallet className="w-5 h-5" />}
                delay={200}
              />
              <InvestmentSummaryCard />
              <MonthStatusIndicator />
            </div>

            <div className="mb-6">
              <MonthlyChart data={convertedMonthlyData} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <CategoryChart data={convertedCategoryData} />
              <TopExpensesCard transactions={transactions} />
              <WeeklyComparisonChart />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <div className="lg:col-span-3">
                <BalanceChart data={convertedMonthlyData} />
              </div>
              <SavingsRateCard income={convertedSummary.income} expenses={convertedSummary.expenses} delay={250} />
            </div>

            <div className="mb-6">
              <YearlyBalanceChart data={convertedMonthlyData} />
            </div>

            <TransactionTable transactions={transactions} />
          </>
        )}
      </main>

      <footer className="border-t mt-12">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            fint
          </p>
        </div>
      </footer>
    </div>
  );
}
