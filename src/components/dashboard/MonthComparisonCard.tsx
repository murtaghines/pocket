import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowRight, Minus } from "lucide-react";
import { MonthlyData } from "@/lib/mockData";

interface MonthComparisonCardProps {
  currentMonth: MonthlyData;
  previousMonth: MonthlyData;
}

export function MonthComparisonCard({ currentMonth, previousMonth }: MonthComparisonCardProps) {
  const incomeChange = previousMonth.income > 0 
    ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 
    : 0;
  
  const expenseChange = previousMonth.expenses > 0
    ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100
    : 0;
  
  const balanceChange = currentMonth.balance - previousMonth.balance;

  const formatCurrency = (value: number) =>
    Math.abs(value).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(0)}%`;
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '350ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          vs Mes Anterior
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-success/10">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
            </div>
            <span className="text-sm">Ingresos</span>
          </div>
          <span className={`text-sm font-semibold ${incomeChange >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatChange(incomeChange)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-destructive/10">
              <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            </div>
            <span className="text-sm">Gastos</span>
          </div>
          <span className={`text-sm font-semibold ${expenseChange <= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatChange(expenseChange)}
          </span>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Minus className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm">Balance</span>
            </div>
            <span className={`text-sm font-semibold ${balanceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
              {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
