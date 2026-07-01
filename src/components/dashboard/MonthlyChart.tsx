import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useLocalization } from "@/hooks/useLocalization";
import { EmptyState } from "@/components/ui/empty-state";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

interface MonthlyChartProps {
  data: MonthlyData[];
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthLabel = (val: string) => {
  const [, m] = val.split('-');
  return MONTH_NAMES[parseInt(m) - 1] || val;
};

export function MonthlyChart({ data }: MonthlyChartProps) {
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();

  const hasData = data.length > 0 && data.some(d => d.income !== 0 || d.expenses !== 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3 min-w-[160px]">
        <p className="text-xs font-semibold text-foreground mb-2">{monthLabel(label)}</p>
        {payload.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm mt-1">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
              {item.name}
            </span>
            <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="bg-card rounded-[18px] p-[20px_22px_18px]"
      style={{ boxShadow: "0 1px 3px rgba(13,30,70,.06)" }}
    >
      {/* Header */}
      <div className="mb-1">
        <p className="text-[15px] font-semibold text-foreground">
          {t('charts.monthlyBalance', 'Income vs expenses')}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {t('charts.lastMonths', 'Last {{n}} months', { n: data.length })}
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 mt-3">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          {t('stats.income', 'Income')}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(220 14% 76%)' }} />
          {t('stats.expenses', 'Expenses')}
        </span>
      </div>

      {!hasData ? (
        <EmptyState height="h-[230px]" />
      ) : (
        <div className="h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -14, bottom: 0 }}
              barGap={3}
              barCategoryGap="28%"
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={monthLabel}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }} />
              <Bar
                dataKey="income"
                name={t('stats.income', 'Income')}
                fill="hsl(var(--primary))"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expenses"
                name={t('stats.expenses', 'Expenses')}
                fill="hsl(220 14% 76%)"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
