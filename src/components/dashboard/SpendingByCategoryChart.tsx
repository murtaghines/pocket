import { useMemo, useState } from "react";
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

  // Tapping a slice (or a list row) selects that category: the other slices dim, its row is
  // highlighted and the donut centre shows that category's amount instead of the month total.
  // Tapping the same one again clears the selection.
  const [active, setActive] = useState<string | null>(null);
  const activeEntry = active ? sorted.find((e) => e.name === active) ?? null : null;
  const toggle = (name?: string) => {
    if (!name) return;
    setActive((cur) => (cur === name ? null : name));
  };

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
      <CardHeader className="px-5 pt-[18px] pb-2">
        <CardTitle className="text-[15px] font-semibold text-foreground">
          {t("charts.spendingByCategory", "Spending by category")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-5 pb-[18px] pt-0">
        <div className="flex w-full select-none flex-col items-center justify-center gap-5 [-webkit-tap-highlight-color:transparent] sm:flex-row sm:items-center sm:gap-9">
          {/* Donut gauge — centre shows the month total, or the selected category's amount */}
          <div className="relative shrink-0" style={{ width: 216, height: 200 }}>
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
                  onClick={(d: { name?: string }) => toggle(d?.name)}
                >
                  {sorted.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      fillOpacity={active && active !== entry.name ? 0.25 : 1}
                      className="cursor-pointer outline-none transition-[fill-opacity] duration-150 focus:outline-none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 pb-3 text-center">
              {activeEntry ? (
                <>
                  <span className="max-w-full truncate text-[12px] font-medium text-muted-foreground">
                    {activeEntry.name}
                  </span>
                  <span className="text-[16px] md:text-[19px] font-semibold tabular-nums leading-tight tracking-[-0.02em] text-foreground">
                    {formatCurrency(activeEntry.value)}
                  </span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">{pctLabel(activeEntry.value)}</span>
                </>
              ) : (
                <span className="text-[17px] md:text-[20px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-foreground">
                  {formatCurrency(total)}
                </span>
              )}
            </div>
          </div>

          {/* Category list with month-over-month trend + % change; rows are tap-to-select too */}
          <ul className="w-full flex-1 space-y-0.5">
            {sorted.map((entry, i) => {
              const prev = entry.previousValue;
              const pct = prev !== undefined && prev > 0 ? Math.round(((entry.value - prev) / prev) * 100) : undefined;
              const up = pct !== undefined && pct > 0;
              const down = pct !== undefined && pct < 0;
              const dimmed = active !== null && active !== entry.name;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => toggle(entry.name)}
                    aria-pressed={active === entry.name}
                    className={cn(
                      "-mx-1 flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors",
                      active === entry.name && "bg-muted/50",
                      dimmed && "opacity-45",
                    )}
                  >
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
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
