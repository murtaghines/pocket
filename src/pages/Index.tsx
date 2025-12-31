import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { UploadCard } from "@/components/dashboard/UploadCard";
import { UploadsManager } from "@/components/dashboard/UploadsManager";
import { SavingsRateCard } from "@/components/dashboard/SavingsRateCard";
import { BankDistributionChart } from "@/components/dashboard/BankDistributionChart";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { WeeklyComparisonChart } from "@/components/dashboard/WeeklyComparisonChart";
import { MonthComparisonCard } from "@/components/dashboard/MonthComparisonCard";
import { YearlyBalanceChart } from "@/components/dashboard/YearlyBalanceChart";
import { useTransactions } from "@/hooks/useTransactions";
import { TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react";

export default function Index() {
  const { 
    transactions, 
    monthlyData, 
    categoryData, 
    bankData, 
    summary, 
    isLoading,
    hasData 
  } = useTransactions();

  const currentMonth = monthlyData[monthlyData.length - 1] || { month: '', income: 0, expenses: 0, balance: 0 };
  const previousMonth = monthlyData[monthlyData.length - 2] || { month: '', income: 0, expenses: 0, balance: 0 };
  
  const incomeChange = previousMonth.income > 0 
    ? Math.round(((currentMonth.income - previousMonth.income) / previousMonth.income) * 100)
    : 0;
  
  const expenseChange = previousMonth.expenses > 0
    ? Math.round(((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100)
    : 0;

  const formatCurrency = (amount: number) => 
    amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  // Get current month name in Spanish
  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Resumen de tus finanzas personales • {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !hasData && (
          <div className="text-center py-12 mb-8">
            <p className="text-muted-foreground mb-4">
              No hay transacciones todavía. Sube un archivo Excel, CSV o PDF para comenzar.
            </p>
            <UploadCard />
          </div>
        )}

        {/* Dashboard with Data */}
        {!isLoading && hasData && (
          <>
            {/* Section 1: KPIs + Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Ingresos del Mes"
                value={formatCurrency(summary.income)}
                change={incomeChange}
                changeLabel="vs mes anterior"
                type="income"
                icon={<TrendingUp className="w-5 h-5" />}
                delay={0}
              />
              <StatCard
                title="Gastos del Mes"
                value={formatCurrency(summary.expenses)}
                change={expenseChange}
                changeLabel="vs mes anterior"
                type="expense"
                icon={<TrendingDown className="w-5 h-5" />}
                delay={100}
              />
              <StatCard
                title="Balance Neto"
                value={formatCurrency(summary.balance)}
                type={summary.balance >= 0 ? 'income' : 'expense'}
                icon={<Wallet className="w-5 h-5" />}
                delay={200}
              />
              <UploadCard />
            </div>

            {/* Section 2: Evolución Mensual + Comparación Mes Anterior */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="lg:col-span-3">
                <MonthlyChart data={monthlyData} />
              </div>
              <MonthComparisonCard currentMonth={currentMonth} previousMonth={previousMonth} />
            </div>

            {/* Section 3: Análisis de Gastos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <CategoryChart data={categoryData} />
              <TopExpensesCard transactions={transactions} />
              <div className="flex flex-col gap-4">
                <WeeklyComparisonChart />
                <BankDistributionChart data={bankData} />
              </div>
            </div>

            {/* Section 4: Balance y Ahorro */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="lg:col-span-3">
                <BalanceChart data={monthlyData} />
              </div>
              <SavingsRateCard income={summary.income} expenses={summary.expenses} delay={250} />
            </div>

            {/* Section 5: Balance Anual */}
            <div className="mb-8">
              <YearlyBalanceChart data={monthlyData} />
            </div>

            {/* Uploads Manager */}
            <div className="mb-8">
              <UploadsManager />
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
            FinanceFlow • Control financiero personal
          </p>
        </div>
      </footer>
    </div>
  );
}