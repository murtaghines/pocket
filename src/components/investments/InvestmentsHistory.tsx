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

  let cumulative = 0;
  const chartData = data.map(d => {
    cumulative += d.net;
    return {
      ...d,
      monthLabel: formatMonth(d.month),
      cumulative,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 px-4 py-3 min-w-[170px]">
        <p className="text-xs text-muted-foreground mb-1">{d.monthLabel}</p>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">{t('history.totalAccumulated')}</span>
          <span className="text-sm font-semibold tabular-nums">{formatCurrency(d.cumulative)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">{t('history.deposits')}</span>
          <span className="text-sm tabular-nums text-success">{formatCurrency(d.deposits)}</span>
        </div>
        {d.withdrawals > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-xs text-muted-foreground">{t('history.net')}</span>
            <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(d.net)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 shrink-0">
        <h3 className="text-base font-semibold">{t('history.title')}</h3>
      </div>
      <div className="flex-1 min-h-0 px-6 pb-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.16} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(v) => formatCurrency(v)}
              width={70}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 2" }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2.2}
              fillOpacity={1}
              fill="url(#colorCumulative)"
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
