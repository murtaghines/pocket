import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useLocalization } from "@/hooks/useLocalization";
import { EmptyState } from "@/components/ui/empty-state";
import type { WeeklyPoint } from "@/lib/analytics";

interface WeeklyIncomeExpensesChartProps {
  weekly: WeeklyPoint[];
}

export function WeeklyIncomeExpensesChart({ weekly }: WeeklyIncomeExpensesChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const data = weekly.map((w) => ({
    label: `${t("charts.weekShortLabel", "sem")} ${w.week}`,
    income: w.income,
    expenses: w.spend,
  }));

  const hasData = weekly.some((w) => w.income !== 0 || w.spend !== 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card rounded-xl shadow-lg p-3 min-w-[160px]">
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
    <div className="flex h-full flex-col bg-card rounded-xl p-[20px_22px_16px] shadow-section">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[15px] font-heading font-bold text-foreground leading-tight">
            {t("charts.monthlyBalance", "Evolution by week")}
          </p>
        </div>
        <div className="flex items-center gap-[14px] text-[12px] text-[#9AA1AC] shrink-0">
          <span className="flex items-center gap-[6px]">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {t("stats.income", "Income")}
          </span>
          <span className="flex items-center gap-[6px]">
            <span className="w-2 h-2 rounded-full" style={{ background: "#DCE0E6" }} />
            {t("stats.expenses", "Expenses")}
          </span>
        </div>
      </div>

      {!hasData ? (
        <EmptyState height="h-[172px]" />
      ) : (
        <div className="h-[150px] md:h-[172px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={5} barCategoryGap="28%">
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9AA1AC", fontSize: 11.5, fontWeight: 400 }}
                dy={8}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }} />
              <Bar
                dataKey="income"
                name={t("stats.income", "Income")}
                fill="#1B76FF"
                radius={6}
                maxBarSize={20}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expenses"
                name={t("stats.expenses", "Expenses")}
                fill="#DCE0E6"
                radius={6}
                maxBarSize={20}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
