import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { SavingsRateCard } from "@/components/dashboard/SavingsRateCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { WeeklyComparisonChart } from "@/components/dashboard/WeeklyComparisonChart";
import { MonthComparisonCard } from "@/components/dashboard/MonthComparisonCard";
import { YearlyBalanceChart } from "@/components/dashboard/YearlyBalanceChart";
import { InvestmentSummaryCard } from "@/components/dashboard/InvestmentSummaryCard";
import { MonthClosingBanner } from "@/components/dashboard/MonthClosingBanner";
import { MonthStatusIndicator } from "@/components/dashboard/MonthStatusIndicator";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react";

export default function Index() {
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

  // Check if onboarding is needed - only after preferences are fully loaded
  useEffect(() => {
    if (!prefsLoading && preferences && preferences.id) {
      // Only check onboarding once preferences are loaded from DB (have an id)
      const needsOnboarding = preferences.onboarding_completed === false || preferences.onboarding_completed === null || preferences.onboarding_completed === undefined;
      setShowOnboarding(needsOnboarding);
      setOnboardingChecked(true);
    }
  }, [preferences, prefsLoading]);

  // Convert amounts to user's preferred currency
  const userCurrency = preferences?.base_currency || 'EUR';
  const convertToUserCurrency = (amount: number) => {
    return convertAmount(amount, 'EUR', userCurrency);
  };

  const currentMonth = monthlyData[monthlyData.length - 1] || { month: '', income: 0, expenses: 0, balance: 0 };
  const previousMonth = monthlyData[monthlyData.length - 2] || { month: '', income: 0, expenses: 0, balance: 0 };
  
  // Convert current and previous month values
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

  // Only calculate change if there's actual previous month data
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

  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  // Convert monthly data for charts
  const convertedMonthlyData = monthlyData.map(m => ({
    ...m,
    income: convertToUserCurrency(m.income),
    expenses: convertToUserCurrency(m.expenses),
    balance: convertToUserCurrency(m.balance),
  }));

  // Convert category data
  const convertedCategoryData = categoryData.map(c => ({
    ...c,
    value: convertToUserCurrency(c.value),
  }));

  // Convert summary
  const convertedSummary = {
    income: convertToUserCurrency(summary.income),
    expenses: convertToUserCurrency(summary.expenses),
    balance: convertToUserCurrency(summary.balance),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Onboarding Modal - only show after checking preferences */}
      {onboardingChecked && (
        <OnboardingModal 
          open={showOnboarding} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}
      
      <main className="container px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Overview of your personal finances • {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)}
          </p>
        </div>

        {/* Loading State */}
        {(isLoading || prefsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Dashboard Content - Always show, even with empty data */}
        {!isLoading && !prefsLoading && (
          <>
            {/* Month Closing Banner */}
            <MonthClosingBanner />

            {/* Month Title */}
            <h3 className="text-xl font-semibold mb-4 capitalize">
              {currentMonth.month || currentMonthName}
            </h3>

            {/* Section 1: KPIs + Investment Summary + Month Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard
                title="Income"
                value={formatCurrency(convertedCurrentMonth.income)}
                change={incomeChange}
                changeLabel="vs last month"
                type="income"
                icon={<TrendingUp className="w-5 h-5" />}
                delay={0}
              />
              <StatCard
                title="Expenses"
                value={formatCurrency(convertedCurrentMonth.expenses)}
                change={expenseChange}
                changeLabel="vs last month"
                type="expense"
                icon={<TrendingDown className="w-5 h-5" />}
                delay={100}
                invertChangeColor={true}
              />
              <StatCard
                title="Balance"
                value={formatCurrency(convertedCurrentMonth.balance)}
                change={balanceChange}
                changeLabel="vs last month"
                type="balance"
                icon={<Wallet className="w-5 h-5" />}
                delay={200}
              />
              <InvestmentSummaryCard />
              <MonthStatusIndicator />
            </div>

            {/* Section 2: Monthly Evolution + Month Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="lg:col-span-3">
                <MonthlyChart data={convertedMonthlyData} />
              </div>
              <MonthComparisonCard currentMonth={convertedCurrentMonth} previousMonth={convertedPreviousMonth} />
            </div>

            {/* Section 3: Expense Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <CategoryChart data={convertedCategoryData} />
              <TopExpensesCard transactions={transactions} />
              <WeeklyComparisonChart />
            </div>

            {/* Section 4: Balance and Savings */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="lg:col-span-3">
                <BalanceChart data={convertedMonthlyData} />
              </div>
              <SavingsRateCard income={convertedSummary.income} expenses={convertedSummary.expenses} delay={250} />
            </div>

            {/* Section 5: Yearly Balance */}
            <div className="mb-8">
              <YearlyBalanceChart data={convertedMonthlyData} />
            </div>

            {/* Transactions Table */}
            <TransactionTable transactions={transactions} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            fint • Personal finance control
          </p>
        </div>
      </footer>
    </div>
  );
}
