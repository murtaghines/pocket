import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { SavingsRateCard } from "@/components/dashboard/SavingsRateCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { WeeklyComparisonChart } from "@/components/dashboard/WeeklyComparisonChart";
import { DateDisplay } from "@/components/dashboard/DateDisplay";

import { YearlyBalanceChart } from "@/components/dashboard/YearlyBalanceChart";
import { InvestmentSummaryCard } from "@/components/dashboard/InvestmentSummaryCard";

import { MonthStatusIndicator } from "@/components/dashboard/MonthStatusIndicator";
import { EmptyStateBanner } from "@/components/dashboard/EmptyStateBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useProfile } from "@/hooks/useProfile";
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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('welcome.morning', 'Good morning');
    if (hour < 18) return t('welcome.afternoon', 'Good afternoon');
    return t('welcome.evening', 'Good evening');
  };

  const firstName = profile?.first_name || '';

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 dashboard-theme">
      <Header />
      <MobileBottomNav />
      
      {onboardingChecked && (
        <OnboardingModal 
          open={showOnboarding} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}
      
      <main className="container px-4 md:px-6 py-6">
        {/* Welcome Section - Matching reference design */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 animate-fade-in">
          <DateDisplay />
          
          {/* Greeting on the right - with proper text sizing */}
          <div className="hidden md:block text-right flex-shrink-0">
            <h2 className="text-xl lg:text-2xl font-bold whitespace-nowrap">
              {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('welcome.subtitle', 'Here\'s your financial overview')}
            </p>
          </div>
        </div>

        {(isLoading || prefsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !prefsLoading && (
          <>
            <EmptyStateBanner hasData={transactions.length > 0} />

            {/* Month label */}
            <h3 className="text-lg font-semibold mb-4 capitalize text-muted-foreground">
              {currentMonth.month || currentMonthName}
            </h3>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              {/* Main stat cards */}
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
              
              {/* Investment and Month Status */}
              <InvestmentSummaryCard />
              <MonthStatusIndicator />
            </div>

            {/* Charts Row - 2 column bento */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Monthly Chart takes 2 cols */}
              <div className="lg:col-span-2">
                <MonthlyChart data={convertedMonthlyData} />
              </div>
              
              {/* Savings rate */}
              <SavingsRateCard income={convertedSummary.income} expenses={convertedSummary.expenses} delay={250} />
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <CategoryChart data={convertedCategoryData} />
              <TopExpensesCard transactions={transactions} />
              <WeeklyComparisonChart />
            </div>

            {/* Balance Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <div className="lg:col-span-3">
                <BalanceChart data={convertedMonthlyData} />
              </div>
              <div className="hidden lg:block">
                {/* Yearly summary or additional card */}
              </div>
            </div>

            {/* Yearly Chart */}
            <div className="mb-6">
              <YearlyBalanceChart data={convertedMonthlyData} />
            </div>

            {/* Transactions Table */}
            <TransactionTable transactions={transactions} />
          </>
        )}
      </main>

      <footer className="border-t border-border/50 mt-12">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            wallet
          </p>
        </div>
      </footer>
    </div>
  );
}
