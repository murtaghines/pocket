import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from "recharts";
import { Scale } from "lucide-react";
import { MonthlyData } from "@/lib/mockData";
import { useLocalization } from "@/hooks/useLocalization";

interface YearlyBalanceChartProps {
  data: MonthlyData[];
}

export function YearlyBalanceChart({ data }: YearlyBalanceChartProps) {
  const { formatCurrency } = useLocalization();

  const totalBalance = data.reduce((sum, d) => sum + d.balance, 0);
  const averageBalance = Math.round(totalBalance / data.length);
  const maxBalance = Math.max(...data.map(d => d.balance));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{label} 2024</p>
          <p className="text-sm font-semibold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '700ms' }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Yearly Balance
          </CardTitle>
          <div className="text-right">
            <p className="text-lg font-bold text-success">{formatCurrency(totalBalance)}</p>
            <p className="text-xs text-muted-foreground">Total Savings</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="15%">
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide domain={[0, maxBalance * 1.2]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <ReferenceLine 
                y={averageBalance} 
                stroke="hsl(var(--muted-foreground) / 0.5)" 
                strokeDasharray="3 3"
                label={{ 
                  value: `Avg: ${formatCurrency(averageBalance)}`,
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }}
              />
              <Bar 
                dataKey="balance" 
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.balance >= averageBalance 
                      ? 'hsl(var(--success))' 
                      : entry.balance > 0 
                        ? 'hsl(var(--success) / 0.5)' 
                        : 'hsl(var(--destructive))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
