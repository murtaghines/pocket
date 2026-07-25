import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { getCategoryLabel, categoryColors as categoryColorVars } from "@/lib/categoryTranslations";
import { formatPeriodLabel, type Granularity } from "@/lib/analytics";
import type { CategoryTrend } from "@/lib/analytics";

interface CategoryTrendChartProps {
  trend: CategoryTrend;
  /** Bucketing level driving the axis/tooltip labels (defaults to month). */
  granularity?: Granularity;
}

// Resolve a category slug to an `hsl(...)` string from its CSS variable (falls back to grey).
function categoryHsl(slug: string): string {
  const varName = categoryColorVars[slug];
  if (varName && typeof window !== "undefined") {
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
    if (value) return `hsl(${value})`;
  }
  return "hsl(220, 10%, 55%)";
}

/**
 * Stacked-area evolution of spending across the top expense categories over time, so the user can
 * see where spending is growing or shrinking. Tail categories are already collapsed into
 * "other_expense" by `categoryTrends`.
 */
export function CategoryTrendChart({ trend, granularity = "month" }: CategoryTrendChartProps) {
  const { t, i18n } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const periodLabel = (key: string) => formatPeriodLabel(key, granularity, i18n.language);

  const hasData = trend.months.length > 0 && trend.series.length > 0;

  // Pivot into recharts rows: one object per month with a key per category slug.
  const rows = trend.months.map((month, i) => {
    const row: Record<string, number | string> = { month };
    for (const s of trend.series) row[s.slug] = s.values[i] ?? 0;
    return row;
  });

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const visible = payload.filter((p) => p.value > 0);
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3 max-w-[220px]">
        <p className="text-xs font-semibold text-foreground mb-1">
          {label ? periodLabel(label) : ""}
        </p>
        {visible.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground truncate">{item.name}:</span>
            <span className="font-medium text-foreground tabular-nums ml-auto">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card variant="bento">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          {t("insights.categoryTrend.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("insights.categoryTrend.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState height="h-[280px]" />
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v) => periodLabel(v)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                {trend.series.map((s) => {
                  const color = categoryHsl(s.slug);
                  return (
                    <Area
                      key={s.slug}
                      type="monotone"
                      dataKey={s.slug}
                      name={getCategoryLabel(s.slug)}
                      stackId="spend"
                      stroke={color}
                      fill={color}
                      fillOpacity={0.65}
                      strokeWidth={1}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
