import { useTranslation } from "react-i18next";
import { CalendarRange } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { useLocalization } from "@/hooks/useLocalization";
import { EmptyState } from "@/components/ui/empty-state";
import { mean } from "@/lib/analytics";
import type { WeeklyPoint } from "@/lib/analytics";
import type { VolatilityLevel } from "@/hooks/useMonthlyInsights";

interface WeeklyBreakdownCardProps {
  weekly: WeeklyPoint[];
  volatilityLevel: VolatilityLevel;
}

/**
 * Spending grouped into weeks-of-month, with an average-per-week reference line and a qualitative
 * spending-consistency badge (from the daily-spend coefficient of variation).
 */
export function WeeklyBreakdownCard({ weekly, volatilityLevel }: WeeklyBreakdownCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const chartData = weekly.map((w) => ({
    ...w,
    label: t("insights.weekly.week", { n: w.week }),
  }));
  const avgSpend = mean(weekly.map((w) => w.spend));
  const hasData = weekly.some((w) => w.spend > 0);

  const volClass =
    volatilityLevel === "erratic"
      ? "text-destructive bg-destructive/10"
      : volatilityLevel === "moderate"
        ? "text-warning-foreground bg-warning/80"
        : "text-success bg-success/10";

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; spend: number } }> }) => {
    if (!active || !payload?.length) return null;
    const { label, spend } = payload[0].payload;
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(spend)}</p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl p-[20px_22px_18px] shadow-bento">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" strokeWidth={2} />
            {t("insights.weekly.title")}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t("insights.weekly.subtitle")}
          </p>
        </div>
        {hasData && (
          <span className={`text-[12px] font-medium rounded-full px-2.5 py-1 whitespace-nowrap ${volClass}`}>
            {t(`insights.volatility.${volatilityLevel}`)}
          </span>
        )}
      </div>

      {!hasData ? (
        <EmptyState height="h-[200px]" />
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${Math.round(v)}`)}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <ReferenceLine
                y={avgSpend}
                stroke="hsl(var(--muted-foreground) / 0.4)"
                strokeDasharray="3 3"
              />
              <Bar dataKey="spend" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
