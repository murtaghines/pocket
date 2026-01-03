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
import { TrendingUp, TrendingDown, Wallet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Index() {
  const { 
    transactions, 
    monthlyData, 
    categoryData, 
    summary, 
    isLoading,
    hasData 
  } = useTransactions();
  
  const { formatCurrency, formatMonth, t } = useLocalization();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates('EUR');
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if onboarding is needed
  useEffect(() => {
    if (!prefsLoading && preferences) {
      const needsOnboarding = !preferences.onboarding_completed;
      setShowOnboarding(needsOnboarding);
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

  const incomeChange = previousMonth.income > 0 
    ? Math.round(((currentMonth.income - previousMonth.income) / previousMonth.income) * 100)
    : 0;
  
  const expenseChange = previousMonth.expenses > 0
    ? Math.round(((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100)
    : 0;

  const currentMonthName = new Date().toLocaleDateString(preferences?.language || 'es', { month: 'long' });

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
      
      {/* Onboarding Modal */}
      <OnboardingModal 
        open={showOnboarding} 
        onComplete={() => setShowOnboarding(false)} 
      />
      
      <main className="container px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {t('dashboard.title')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.subtitle')} • {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)}
          </p>
        </div>

        {/* Loading State */}
        {(isLoading || prefsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !prefsLoading && !hasData && (
          <div className="text-center py-12 mb-8">
            <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Welcome to FinanceFlow</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('dashboard.upload_prompt')}
            </p>
            <Link to="/profile">
              <Button variant="gradient" size="lg">
                <Upload className="w-4 h-4 mr-2" />
                {t('dashboard.go_to_profile')}
              </Button>
            </Link>
          </div>
        )}

        {/* Dashboard with Data */}
        {!isLoading && !prefsLoading && hasData && (
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
                title={t('dashboard.income')}
                value={formatCurrency(convertedCurrentMonth.income)}
                change={incomeChange}
                changeLabel={t('dashboard.vs_last_month')}
                type="income"
                icon={<TrendingUp className="w-5 h-5" />}
                delay={0}
              />
              <StatCard
                title={t('dashboard.expenses')}
                value={formatCurrency(convertedCurrentMonth.expenses)}
                change={expenseChange}
                changeLabel={t('dashboard.vs_last_month')}
                type="expense"
                icon={<TrendingDown className="w-5 h-5" />}
                delay={100}
                invertChangeColor={true}
              />
              <StatCard
                title={t('dashboard.balance')}
                value={formatCurrency(convertedCurrentMonth.balance)}
                change={convertedPreviousMonth.balance !== 0 ? Math.round(((convertedCurrentMonth.balance - convertedPreviousMonth.balance) / Math.abs(convertedPreviousMonth.balance)) * 100) : 0}
                changeLabel={t('dashboard.vs_last_month')}
                type="balance"
                icon={<Wallet className="w-5 h-5" />}
                delay={200}
              />
              <InvestmentSummaryCard />
              <MonthStatusIndicator />
            </div>

            {/* Section 2: Evolución Mensual + Comparación Mes Anterior */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="lg:col-span-3">
                <MonthlyChart data={convertedMonthlyData} />
              </div>
              <MonthComparisonCard currentMonth={convertedCurrentMonth} previousMonth={convertedPreviousMonth} />
            </div>

            {/* Section 3: Análisis de Gastos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <CategoryChart data={convertedCategoryData} />
              <TopExpensesCard transactions={transactions} />
              <WeeklyComparisonChart />
            </div>

            {/* Section 4: Balance y Ahorro */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="lg:col-span-3">
                <BalanceChart data={convertedMonthlyData} />
              </div>
              <SavingsRateCard income={convertedSummary.income} expenses={convertedSummary.expenses} delay={250} />
            </div>

            {/* Section 5: Balance Anual */}
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
            FinanceFlow • Personal finance control
          </p>
        </div>
      </footer>
    </div>
  );
}
