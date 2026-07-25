import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { cn } from "@/lib/utils";

interface CategoryData {
  name: string;
  value: number;
  color: string;
  category?: string;
  /** Same category's spend in the previous month, for the trend arrow + % change. */
  previousValue?: number;
}

interface SpendingByCategoryChartProps {
  data: CategoryData[];
}

export function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;
  const sorted = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);

  // One-decimal percentage with a comma separator, integers when whole (e.g. "40%", "1,5%").
  const pctLabel = (value: number) => {
    const p = (value / total) * 100;
    const rounded = p < 10 ? Math.round(p * 10) / 10 : Math.round(p);
    const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
    return `${s}%`;
  };

  if (!hasData) {
    return (
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px] font-semibold text-foreground">
            {t("charts.spendingByCategory", "Spending by category")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[240px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px] font-semibold text-foreground">
          {t("charts.spendingByCategory", "Spending by category")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex h-full flex-col items-center justify-center gap-5 sm:flex-row sm:items-center sm:gap-8">
          {/* Donut gauge with the month total in the centre */}
          <div className="relative shrink-0" style={{ width: 224, height: 204 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sorted}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="72%"
                  outerRadius="100%"
                  startAngle={225}
                  endAngle={-45}
                  paddingAngle={2}
                  cornerRadius={5}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {sorted.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-3">
              <span className="text-[19px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-foreground">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Category list with month-over-month trend + % change */}
          <ul className="w-full flex-1 space-y-0.5">
            {sorted.map((entry, i) => {
              const prev = entry.previousValue;
              const pct = prev !== undefined && prev > 0 ? Math.round(((entry.value - prev) / prev) * 100) : undefined;
              const up = pct !== undefined && pct > 0;
              const down = pct !== undefined && pct < 0;
              return (
                <li key={i} className="flex items-center gap-2.5 py-1">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-foreground">{entry.name}</span>
                  <span className="w-[44px] shrink-0 text-right text-[13px] font-medium tabular-nums text-foreground">
                    {pctLabel(entry.value)}
                  </span>
                  <span className="w-[88px] shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">
                    {formatCurrency(entry.value)}
                  </span>
                  <span
                    className={cn(
                      "flex w-[52px] shrink-0 items-center justify-end gap-0.5 text-[12px] font-medium tabular-nums",
                      up ? "text-destructive" : down ? "text-success" : "text-muted-foreground/50",
                    )}
                  >
                    {up && <ArrowUp className="h-3 w-3" strokeWidth={2.6} />}
                    {down && <ArrowDown className="h-3 w-3" strokeWidth={2.6} />}
                    {up || down ? `${Math.abs(pct as number)}%` : "0%"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
