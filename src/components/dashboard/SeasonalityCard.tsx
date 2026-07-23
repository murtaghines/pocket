import { useTranslation } from "react-i18next";
import { Snowflake } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import type { SeasonalMonth } from "@/lib/analytics";

interface SeasonalityCardProps {
  seasonal: SeasonalMonth[];
  hasData: boolean;
}

/**
 * Average expense per calendar month (Jan..Dec) across all history, highlighting the peak month in
 * the destructive tone. Reveals annual seasonality (e.g. travel spikes in summer). Gated behind
 * `hasData` (>= 12 months) since a single year gives one sample per month.
 */
export function SeasonalityCard({ seasonal, hasData }: SeasonalityCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency, formatMonthShort } = useLocalization();

  const data = seasonal
    .filter((s) => s.sampleSize > 0)
    .map((s) => ({
      ...s,
      label: formatMonthShort(`2020-${String(s.month).padStart(2, "0")}-01`),
    }));

  const maxExpense = Math.max(0, ...data.map((d) => d.avgExpenses));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; avgExpenses: number } }> }) => {
    if (!active || !payload?.length) return null;
    const { label, avgExpenses } = payload[0].payload;
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(avgExpenses)}</p>
      </div>
    );
  };

  return (
    <Card variant="bento">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Snowflake className="w-4 h-4 text-primary" />
          </div>
          {t("insights.seasonality.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("insights.seasonality.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState height="h-[220px]" message={t("insights.seasonality.needMoreData")} />
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
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
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                <Bar dataKey="avgExpenses" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {data.map((d) => (
                    <Cell
                      key={d.month}
                      fill={
                        d.avgExpenses >= maxExpense && maxExpense > 0
                          ? "hsl(var(--destructive))"
                          : "hsl(var(--destructive) / 0.35)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
