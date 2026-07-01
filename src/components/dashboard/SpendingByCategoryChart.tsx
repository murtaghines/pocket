import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useLocalization } from "@/hooks/useLocalization";
import { EmptyState } from "@/components/ui/empty-state";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { useLocalization as useLocFmt } from "@/hooks/useLocalization";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface SpendingByCategoryChartProps {
  data: CategoryData[];
}

const MAX_ITEMS = 6;

export function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();
  const { selectedMonth } = useMonthSelection();

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  const sorted = [...data].filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  // Cap at MAX_ITEMS, collapse tail into "Other"
  let chartData = sorted;
  if (sorted.length > MAX_ITEMS) {
    const head = sorted.slice(0, MAX_ITEMS - 1);
    const tailTotal = sorted.slice(MAX_ITEMS - 1).reduce((s, d) => s + d.value, 0);
    chartData = [...head, { name: t('charts.other', 'Other'), value: tailTotal, color: 'hsl(220 10% 80%)' }];
  }

  // Month label for subtitle
  const monthLabel = (() => {
    if (!selectedMonth) return '';
    const [y, m] = selectedMonth.split('-');
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${names[parseInt(m) - 1]} ${y}`;
  })();

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0].payload;
    const pct = ((entry.value / total) * 100).toFixed(1);
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3 min-w-[150px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-[9px] h-[9px] rounded-[3px] shrink-0" style={{ background: entry.color }} />
          <span className="text-[13px] font-semibold text-foreground">{entry.name}</span>
        </div>
        <p className="text-[13px] text-foreground font-medium">{formatCurrency(entry.value)}</p>
        <p className="text-[11px] text-muted-foreground">{pct}%</p>
      </div>
    );
  };

  return (
    <div
      className="bg-card rounded-[18px] p-[20px_22px_18px]"
      style={{ boxShadow: "0 1px 3px rgba(13,30,70,.06)" }}
    >
      <p className="text-[15px] font-semibold text-foreground leading-tight mb-[3px]">
        {t('charts.spendingByCategory', 'Spending by category')}
      </p>
      <p className="text-[12px] text-muted-foreground mb-4">{monthLabel}</p>

      {!hasData ? (
        <EmptyState height="h-[200px]" />
      ) : (
        <div className="flex items-center gap-5">
          {/* Donut */}
          <div className="relative w-[128px] h-[128px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={62}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-muted-foreground leading-none mb-1">Total</span>
              <span className="text-[15px] font-bold tabular-nums text-foreground leading-none">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-[9px] flex-1 min-w-0">
            {chartData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-[12.5px]">
                <span className="w-[9px] h-[9px] rounded-[3px] shrink-0" style={{ background: entry.color }} />
                <span className="flex-1 text-[#3b465c] truncate">{entry.name}</span>
                <span className="font-semibold tabular-nums shrink-0 text-foreground">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
