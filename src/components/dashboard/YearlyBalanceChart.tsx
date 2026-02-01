import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from "recharts";
import { Scale } from "lucide-react";
import { MonthlyData } from "@/lib/mockData";
import { useLocalization } from "@/hooks/useLocalization";
import { useTranslation } from "react-i18next";

interface YearlyBalanceChartProps {
  data: MonthlyData[];
}

export function YearlyBalanceChart({ data }: YearlyBalanceChartProps) {
  const { formatCurrency } = useLocalization();
  const { t } = useTranslation('dashboard');

  const hasData = data.length > 0 && data.some(d => d.balance !== 0);
  const totalBalance = data.reduce((sum, d) => sum + d.balance, 0);
  const averageBalance = data.length > 0 ? Math.round(totalBalance / data.length) : 0;
  const maxBalance = data.length > 0 ? Math.max(...data.map(d => d.balance)) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border/50 rounded-xl p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '700ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary" />
            </div>
            Yearly Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[160px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '700ms' }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary" />
            </div>
            Yearly Balance
          </CardTitle>
          <div className="text-right">
            <p className="text-xl font-bold text-success">{formatCurrency(totalBalance)}</p>
            <p className="text-xs text-muted-foreground">Total Savings</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
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
                stroke="hsl(var(--muted-foreground) / 0.3)" 
                strokeDasharray="3 3"
              />
              <Bar 
                dataKey="balance" 
                radius={[6, 6, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.balance >= averageBalance 
                      ? 'hsl(var(--success))' 
                      : entry.balance > 0 
                        ? 'hsl(var(--success) / 0.4)' 
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
