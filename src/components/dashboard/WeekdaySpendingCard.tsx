import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
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
import type { WeekdaySpend } from "@/lib/analytics";

interface WeekdaySpendingCardProps {
  weekday: WeekdaySpend[];
}

// weekday index (0=Mon..6=Sun) -> heatmap weekday i18n key
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Average expense per day of the week (Mon..Sun) across all history — surfaces the weekend
 * spending cycle. Weekend bars use the warning tone to stand out from weekdays.
 */
export function WeekdaySpendingCard({ weekday }: WeekdaySpendingCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const data = weekday.map((d) => ({
    ...d,
    label: t(`heatmap.weekdays.${WEEKDAY_KEYS[d.weekday]}`),
    isWeekend: d.weekday >= 5,
  }));
  const hasData = data.some((d) => d.avgSpend > 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; avgSpend: number } }> }) => {
    if (!active || !payload?.length) return null;
    const { label, avgSpend } = payload[0].payload;
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground tabular-nums">
          {t("insights.weekday.avgSpend")}: {formatCurrency(avgSpend)}
        </p>
      </div>
    );
  };

  return (
    <Card variant="bento">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          {t("insights.weekday.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("insights.weekday.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState height="h-[220px]" />
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
                <Bar dataKey="avgSpend" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {data.map((d) => (
                    <Cell
                      key={d.weekday}
                      fill={d.isWeekend ? "hsl(var(--warning))" : "hsl(var(--primary) / 0.55)"}
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
