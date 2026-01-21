import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
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

  // Day abbreviations in English
  const dayAbbrevs = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Calculate weekly data from real transactions
  const weeklyData: WeeklyData[] = (() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    // Filter expenses from this week
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

  // Check if there's any data
  const hasData = totalSpent > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          <p className="text-xs font-medium">{label}</p>
          <p className="text-sm font-semibold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  // Empty state - show blank card like others
  if (!hasData) {
    return (
      <Card className="animate-slide-up flex-1" style={{ animationDelay: '600ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[140px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('common.noDataYet', { defaultValue: 'No data yet' })}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up flex-1" style={{ animationDelay: '600ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold">{formatCurrency(totalSpent)}</span>
          <span className="text-xs text-muted-foreground">spent</span>
        </div>
        
        <div className="h-[80px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barCategoryGap="20%">
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar 
                dataKey="amount" 
                radius={[3, 3, 0, 0]}
              >
                {weeklyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isToday && entry.amount > 0
                      ? 'hsl(155, 60%, 45%)' 
                      : entry.amount > 0 
                        ? 'hsl(var(--muted-foreground) / 0.3)' 
                        : 'hsl(var(--muted))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 pt-2 border-t flex justify-between text-xs">
          <span className="text-muted-foreground">Daily average</span>
          <span className="font-medium">{formatCurrency(averageDaily)}/day</span>
        </div>
      </CardContent>
    </Card>
  );
}
