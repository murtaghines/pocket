import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { UploadSection } from "@/components/dashboard/UploadSection";
import { 
  mockTransactions, 
  mockMonthlyData, 
  getCategoryExpenses,
  getMonthSummary 
} from "@/lib/mockData";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

export default function Index() {
  const summary = getMonthSummary(mockTransactions);
  const categoryData = getCategoryExpenses(mockTransactions);

  // Calculate change from previous month
  const currentMonth = mockMonthlyData[mockMonthlyData.length - 1];
  const previousMonth = mockMonthlyData[mockMonthlyData.length - 2];
  
  const incomeChange = previousMonth.income > 0 
    ? Math.round(((currentMonth.income - previousMonth.income) / previousMonth.income) * 100)
    : 0;
  
  const expenseChange = previousMonth.expenses > 0
    ? Math.round(((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100)
    : 0;

  const formatCurrency = (amount: number) => 
    amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

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
            Resumen de tus finanzas personales • Diciembre 2024
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <UploadSection />
          </div>
          <div className="lg:col-span-1">
            <CategoryChart data={categoryData} />
          </div>
          <div className="lg:col-span-1">
            <BalanceChart data={mockMonthlyData} />
          </div>
        </div>

        {/* Monthly Evolution */}
        <div className="mb-8">
          <MonthlyChart data={mockMonthlyData} />
        </div>

        {/* Transactions Table */}
        <TransactionTable transactions={mockTransactions} />
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
