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
      {/* Header row: title + legend */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[15px] font-semibold text-foreground leading-tight">
            {t('charts.monthlyBalance', 'Income vs expenses')}
          </p>
          <p className="text-[12px] text-muted-foreground mt-[3px]">
            {t('charts.lastMonths', 'Last {{n}} months', { n: data.length })}
          </p>
        </div>
        <div className="flex items-center gap-[14px] text-[12px] text-[#5a6478] shrink-0">
          <span className="flex items-center gap-[6px]">
            <span className="w-[10px] h-[10px] rounded-[3px] bg-primary" />
            {t('stats.income', 'Income')}
          </span>
          <span className="flex items-center gap-[6px]">
            <span className="w-[10px] h-[10px] rounded-[3px]" style={{ background: 'hsl(216 35% 82%)' }} />
            {t('stats.expenses', 'Expenses')}
          </span>
        </div>
      </div>

      {!hasData ? (
        <EmptyState height="h-[180px]" />
      ) : (
        <div className="h-[180px]">
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
                fill="hsl(216 35% 82%)"
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
