import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";

interface PlatformData {
  deposits: number;
  withdrawals: number;
  net: number;
}

interface InvestmentsByPlatformProps {
  data: Record<string, PlatformData>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--category-investment))',
  'hsl(var(--category-to-joint-account))',
  'hsl(var(--category-salary))',
  'hsl(var(--category-freelance))',
  'hsl(var(--category-refunds))',
  'hsl(var(--category-education))',
  'hsl(var(--category-rents))',
];

const CustomTooltip = ({ active, payload, formatCurrency }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card rounded-xl shadow-lg border border-border/50 px-4 py-3 min-w-[150px]">
      <p className="text-xs font-medium text-foreground mb-1">{d.name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-xs text-muted-foreground">Net</span>
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(d.value)}
        </span>
      </div>
    </div>
  );
};

export function InvestmentsByPlatform({ data }: InvestmentsByPlatformProps) {
  const { t } = useTranslation('investments');
  const { formatCurrency } = useLocalization();

  const chartData = Object.entries(data)
    .map(([name, values], index) => ({
      name,
      value: values.net,
      deposits: values.deposits,
      withdrawals: values.withdrawals,
      color: COLORS[index % COLORS.length],
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
        <div className="px-6 pt-5 pb-3 shrink-0">
          <h3 className="text-base font-semibold">{t('byPlatform.title')}</h3>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-6 pb-5">
          <p className="text-sm text-muted-foreground">{t('byPlatform.noData')}</p>
        </div>
      </div>
    );
  }

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 shrink-0">
        <h3 className="text-base font-semibold">{t('byPlatform.title')}</h3>
      </div>
      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-center gap-4 px-6 pb-5">
        <div className="w-full md:w-1/2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 flex flex-col gap-2">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-foreground truncate flex-1">{d.name}</span>
              <span className="text-sm font-medium tabular-nums text-muted-foreground shrink-0">
                {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
