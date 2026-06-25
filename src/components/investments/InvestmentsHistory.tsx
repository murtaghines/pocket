import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";

interface MonthlyData {
  month: string;
  deposits: number;
  withdrawals: number;
  net: number;
}

interface InvestmentsHistoryProps {
  data: MonthlyData[];
}

export function InvestmentsHistory({ data }: InvestmentsHistoryProps) {
  const { t, i18n } = useTranslation('investments');
  const { formatCurrency } = useLocalization();

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString(i18n.language, { month: 'short', year: '2-digit' });
  };

  // Calculate cumulative invested
  let cumulative = 0;
  const chartData = data.map(d => {
    cumulative += d.net;
    return {
      ...d,
      monthLabel: formatMonth(d.month),
      cumulative,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('history.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'cumulative' ? t('history.totalAccumulated') :
                name === 'deposits' ? t('history.deposits') :
                name === 'withdrawals' ? t('history.withdrawals') : t('history.net')
              ]}
              labelFormatter={(label) => `${t('history.month')}: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorCumulative)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}