import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useLocalization } from "@/hooks/useLocalization";
import { EmptyState } from "@/components/ui/empty-state";

export interface BreakdownPoint {
  label: string;
  income: number;
  expenses: number;
}

interface PeriodBreakdownChartProps {
  points: BreakdownPoint[];
  subtitle: string;
}

/**
 * Income vs expenses bar chart over an arbitrary set of labeled sub-period points — the
 * Week/Year tab counterpart to Month's `WeeklyIncomeExpensesChart` (which stays specific to
 * `WeeklyPoint[]` since the month tab's contract doesn't change).
 */
export function PeriodBreakdownChart({ points, subtitle }: PeriodBreakdownChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const hasData = points.some((p) => p.income !== 0 || p.expenses !== 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3 min-w-[160px]">
        <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm mt-1">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
              {item.name}
            </span>
            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-card rounded-xl p-[20px_22px_18px] shadow-section border border-border">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[13px] md:text-[14px] font-semibold uppercase tracking-[0.05em] text-foreground leading-tight">
            {t("charts.monthlyBalance", "Income vs expenses")}
          </p>
          <p className="text-[12px] text-muted-foreground mt-[3px]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-[14px] text-[12px] text-muted-foreground shrink-0">
          <span className="flex items-center gap-[6px]">
            <span className="w-[10px] h-[10px] rounded-[3px] bg-primary" />
            {t("stats.income", "Income")}
          </span>
          <span className="flex items-center gap-[6px]">
            <span className="w-[10px] h-[10px] rounded-[3px]" style={{ background: "hsl(216 35% 82%)" }} />
            {t("stats.expenses", "Expenses")}
          </span>
        </div>
      </div>

      {!hasData ? (
        <EmptyState height="h-[180px]" />
      ) : (
        <div className="min-h-[180px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 4, right: 4, left: -14, bottom: 0 }} barGap={3} barCategoryGap="28%">
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }} />
              <Bar
                dataKey="income"
                name={t("stats.income", "Income")}
                fill="hsl(var(--primary))"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expenses"
                name={t("stats.expenses", "Expenses")}
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
