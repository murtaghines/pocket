import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Calendar } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { useTransactions } from "@/hooks/useTransactions";
import { useTranslation } from "react-i18next";
import { startOfWeek, endOfWeek, format, isToday, eachDayOfInterval, parseISO } from "date-fns";

interface WeeklyData {
  day: string;
  amount: number;
  isToday?: boolean;
}

export function WeeklyComparisonChart() {
  const { formatCurrency } = useLocalization();
  const { transactions } = useTransactions();
  const { t } = useTranslation('dashboard');

  const dayAbbrevs = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const weeklyData: WeeklyData[] = (() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const weekExpenses = transactions.filter(t => {
      const txDate = parseISO(t.date);
      const isExpense = t.movement === "EXPENSE" || t.type === "expense";
      return isExpense && txDate >= weekStart && txDate <= weekEnd;
    });

    return daysOfWeek.map((day, index) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayExpenses = weekExpenses.filter(t => t.date === dayStr);
      const totalAmount = dayExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      return {
        day: dayAbbrevs[index],
        amount: Math.round(totalAmount * 100) / 100,
        isToday: isToday(day),
      };
    });
  })();

  const totalSpent = weeklyData.reduce((sum, d) => sum + d.amount, 0);
  const daysWithExpenses = weeklyData.filter(d => d.amount > 0).length;
  const averageDaily = daysWithExpenses > 0 ? Math.round(totalSpent / daysWithExpenses) : 0;

  const hasData = totalSpent > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border/50 rounded-xl p-3 shadow-lg">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <Card variant="bento" className="animate-slide-up flex-1" style={{ animationDelay: '600ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[160px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="animate-slide-up flex-1" style={{ animationDelay: '600ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold">{formatCurrency(totalSpent)}</span>
          <span className="text-sm text-muted-foreground">spent</span>
        </div>
        
        <div className="h-[80px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barCategoryGap="25%">
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar 
                dataKey="amount" 
                radius={[4, 4, 0, 0]}
              >
                {weeklyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isToday && entry.amount > 0
                      ? 'hsl(242, 100%, 55%)' 
                      : entry.amount > 0 
                        ? 'hsl(var(--muted-foreground) / 0.25)' 
                        : 'hsl(var(--muted))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 flex justify-between text-sm">
          <span className="text-muted-foreground">Daily average</span>
          <span className="font-medium">{formatCurrency(averageDaily)}/day</span>
        </div>
      </CardContent>
    </Card>
  );
}
