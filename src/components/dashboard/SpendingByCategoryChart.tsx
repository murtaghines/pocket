import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";

interface CategoryData {
  name: string;
  value: number;
  color: string;
  category?: string;
  /** Same category's spend in the previous month, for the trend arrow. */
  previousValue?: number;
}

interface SpendingByCategoryChartProps {
  data: CategoryData[];
  monthKey?: string | null;
}

export function SpendingByCategoryChart({ data, monthKey }: SpendingByCategoryChartProps) {
  const { t, i18n } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;
  const sorted = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);

  const monthLabel = useMemo(() => {
    if (!monthKey) return "";
    const [y, m] = monthKey.split("-").map(Number);
    if (!y || !m) return "";
    return new Intl.DateTimeFormat(i18n.language || "en", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  }, [monthKey, i18n.language]);

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
          <CardTitle className="text-lg font-semibold">
            {t("charts.spendingByCategory", "Spending by category")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {t("charts.spendingByCategory", "Spending by category")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
          {/* Donut gauge with the month total in the centre */}
          <div className="relative shrink-0" style={{ width: 214, height: 196 }}>
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
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-3">
              <span className="text-[26px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-foreground">
                {formatCurrency(total)}
              </span>
              {monthLabel && (
                <span className="mt-1.5 text-[13px] capitalize text-muted-foreground">{monthLabel}</span>
              )}
            </div>
          </div>

          {/* Category list with month-over-month trend */}
          <ul className="w-full flex-1 space-y-1">
            {sorted.map((entry, i) => {
              const prev = entry.previousValue;
              const up = prev !== undefined && prev > 0 && entry.value > prev;
              const down = prev !== undefined && prev > 0 && entry.value < prev;
              return (
                <li key={i} className="flex items-center gap-3 py-1">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-foreground">{entry.name}</span>
                  <span className="w-[46px] shrink-0 text-right text-[13px] font-medium tabular-nums text-foreground">
                    {pctLabel(entry.value)}
                  </span>
                  <span className="w-[96px] shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">
                    {formatCurrency(entry.value)}
                  </span>
                  <span className="flex w-4 shrink-0 justify-center">
                    {up && <ArrowUp className="h-3.5 w-3.5 text-destructive" strokeWidth={2.4} />}
                    {down && <ArrowDown className="h-3.5 w-3.5 text-success" strokeWidth={2.4} />}
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
