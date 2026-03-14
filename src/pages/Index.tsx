import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { SavingsRateCard } from "@/components/dashboard/SavingsRateCard";
import { SavingsRateCard } from "@/components/dashboard/SavingsRateCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { WeeklyComparisonChart } from "@/components/dashboard/WeeklyComparisonChart";
import { DateDisplay, type DashboardView } from "@/components/dashboard/DateDisplay";
import { TotalView } from "@/components/dashboard/TotalView";

import { YearlyBalanceChart } from "@/components/dashboard/YearlyBalanceChart";
import { InvestmentSummaryCard } from "@/components/dashboard/InvestmentSummaryCard";


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
  const [currentView, setCurrentView] = useState<DashboardView>('monthly');

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
    <DashboardLayout>
      {onboardingChecked && (
        <OnboardingModal 
          open={showOnboarding} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}
      
      <main className="container px-4 md:px-6 py-6">
        {/* Welcome Section - Matching reference design */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 animate-fade-in">
          <DateDisplay currentView={currentView} onViewChange={setCurrentView} />
          
          {/* Greeting on the right - with proper text sizing and BLACK color */}
          <div className="hidden md:block text-right flex-shrink-0">
            <h2 className="text-xl lg:text-2xl font-bold whitespace-nowrap text-foreground">
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

            {currentView === 'monthly' ? (
              <>
                {/* Month label - shows the last uploaded month, not current calendar month */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold capitalize text-foreground">
                    {latestMonthLabel ? formatMonth(latestMonthLabel + '-01') : t('period.noPeriods', 'No data yet')}
                  </h3>
                  {hasPreviousData && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t('stats.previousBalance', { defaultValue: 'Previous month balance' })}: {formatCurrency(convertedPreviousMonth.balance)}
                    </p>
                  )}
                </div>

                {/* KPIs Row - 3 columns full width */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                </div>

                {/* Investment & Savings sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <InvestmentSummaryCard />
                  <SavingsRateCard income={convertedSummary.income} expenses={convertedSummary.expenses} delay={250} />
                </div>

                {/* Middle Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <CategoryChart data={convertedCategoryData} />
                  <TopExpensesCard transactions={transactions} />
                  <WeeklyComparisonChart />
                </div>
              </>
            ) : (
              <TotalView monthlyData={convertedMonthlyData} />
            )}

            {/* Transactions Table - Always visible */}
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
    </DashboardLayout>
  );
}
