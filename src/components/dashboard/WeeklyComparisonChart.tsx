import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Calendar } from "lucide-react";

interface WeeklyData {
  day: string;
  amount: number;
  isToday?: boolean;
}

const weeklyData: WeeklyData[] = [
  { day: 'L', amount: 45 },
  { day: 'M', amount: 120 },
  { day: 'X', amount: 35 },
  { day: 'J', amount: 89, isToday: true },
  { day: 'V', amount: 0 },
  { day: 'S', amount: 0 },
  { day: 'D', amount: 0 },
];

export function WeeklyComparisonChart() {
  const totalSpent = weeklyData.reduce((sum, d) => sum + d.amount, 0);
  const averageDaily = Math.round(totalSpent / weeklyData.filter(d => d.amount > 0).length || 1);

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

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

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Esta Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold">{formatCurrency(totalSpent)}</span>
          <span className="text-xs text-muted-foreground">gastados</span>
        </div>
        
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barCategoryGap="20%">
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar 
                dataKey="amount" 
                radius={[4, 4, 0, 0]}
              >
                {weeklyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isToday 
                      ? 'hsl(var(--primary))' 
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

        <div className="mt-3 pt-3 border-t flex justify-between text-xs">
          <span className="text-muted-foreground">Media diaria</span>
          <span className="font-medium">{formatCurrency(averageDaily)}/día</span>
        </div>
      </CardContent>
    </Card>
  );
}
