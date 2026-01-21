import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/hooks/useLocalization";

interface MonthlyData {
  month: string;
  balance: number;
}

interface BalanceChartProps {
  data: MonthlyData[];
}

export function BalanceChart({ data }: BalanceChartProps) {
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();

  const hasData = data.length > 0 && data.some(d => d.balance !== 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <p className="font-display font-semibold text-foreground mb-1">{label}</p>
          <p className={`text-lg font-bold ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
            {value >= 0 ? '+' : ''}{formatCurrency(value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: '350ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">{t('stats.balance')}</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('common.noDataYet', { defaultValue: 'No data yet' })}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '350ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">{t('stats.balance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `${value >= 0 ? '+' : ''}${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke="hsl(160, 84%, 45%)" 
                strokeWidth={3}
                dot={{ fill: 'hsl(160, 84%, 45%)', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(160, 84%, 45%)', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
