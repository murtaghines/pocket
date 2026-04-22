import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalization } from "@/hooks/useLocalization";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronDown } from "lucide-react";

type Metric = "expense" | "income" | "count";

interface DailyHeatmapCardProps {
  transactions: Array<{ date: string; amount: number; type: string }>;
  monthKey: string | null;
  convert: (amount: number) => number;
}

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function DailyHeatmapCard({ transactions, monthKey, convert }: DailyHeatmapCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const [metric, setMetric] = useState<Metric>("expense");

  const { cells, maxValue, minNonZero, daysInMonth, leadingBlanks, total } = useMemo(() => {
    if (!monthKey) {
      return {
        cells: [] as Array<{ day: number; value: number }>,
        maxValue: 0,
        minNonZero: 0,
        daysInMonth: 0,
        leadingBlanks: 0,
        total: 0,
      };
    }
    const [y, m] = monthKey.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    // ISO weekday: Mon=0..Sun=6
    const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;

    const buckets = new Array(days).fill(0);
    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) continue;
      const day = d.getDate();
      const idx = day - 1;
      if (metric === "count") {
        buckets[idx] += 1;
      } else if (metric === "expense" && tx.type === "expense") {
        buckets[idx] += convert(Math.abs(tx.amount));
      } else if (metric === "income" && tx.type === "income") {
        buckets[idx] += convert(Math.abs(tx.amount));
      }
    }

    const cells = buckets.map((value, i) => ({ day: i + 1, value }));
    const maxValue = Math.max(0, ...buckets);
    const nonZero = buckets.filter((v) => v > 0);
    const minNonZero = nonZero.length > 0 ? Math.min(...nonZero) : 0;
    const total = buckets.reduce((s, v) => s + v, 0);
    return { cells, maxValue, minNonZero, daysInMonth: days, leadingBlanks: firstWeekday, total };
  }, [transactions, monthKey, metric, convert]);

  const getIntensity = (value: number) => {
    if (maxValue <= 0 || value <= 0) return 0;
    // Use sqrt to soften extreme outliers — better visual distribution
    const ratio = Math.sqrt(value / maxValue);
    return Math.min(1, Math.max(0.08, ratio));
  };

  const formatValue = (value: number) => {
    if (metric === "count") return `${value} ${value === 1 ? t("heatmap.transaction", "transaction") : t("heatmap.transactions", "transactions")}`;
    return formatCurrency(value);
  };

  const formatLegendValue = (value: number) => {
    if (metric === "count") return `${value}`;
    return formatCurrency(value);
  };

  const metricOptions: Array<{ key: Metric; label: string }> = [
    { key: "expense", label: t("heatmap.expense", "Expenses") },
    { key: "income", label: t("heatmap.income", "Income") },
    { key: "count", label: t("heatmap.count", "Activity") },
  ];
  const activeMetricLabel = metricOptions.find((o) => o.key === metric)?.label ?? "";

  // Build a flat grid: leading blanks + days (always start Monday)
  const totalCells = leadingBlanks + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  const gridSize = totalCells + trailing;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            {t("heatmap.title", "Daily view")}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium",
                  "border border-border bg-card text-foreground hover:bg-muted/40 transition-colors",
                )}
              >
                <span>{activeMetricLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {metricOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onSelect={() => setMetric(opt.key)}
                  className={cn("text-xs", metric === opt.key && "font-semibold")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {!monthKey || daysInMonth === 0 ? (
          <EmptyState icon={CalendarDays} message={t("transactions.noTransactions")} />
        ) : (
          <div className="space-y-4">
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              {WEEKDAY_KEYS.map((k) => (
                <div key={k} className="text-center">
                  {t(`heatmap.weekdays.${k}`, k.charAt(0).toUpperCase() + k.slice(1, 3))}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: gridSize }).map((_, i) => {
                const dayIndex = i - leadingBlanks;
                if (dayIndex < 0 || dayIndex >= daysInMonth) {
                  return <div key={i} className="aspect-square rounded-md" />;
                }
                const cell = cells[dayIndex];
                const intensity = getIntensity(cell.value);
                const hasValue = cell.value > 0;
                return (
                  <div
                    key={i}
                    title={hasValue ? `${cell.day}: ${formatValue(cell.value)}` : `${cell.day}`}
                    className={cn(
                      "aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-transform hover:scale-110 cursor-default",
                      hasValue ? "text-primary-foreground" : "text-muted-foreground/60 bg-muted/30",
                    )}
                    style={
                      hasValue
                        ? { backgroundColor: `hsl(var(--primary) / ${intensity})` }
                        : undefined
                    }
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>

            {/* Legend / total */}
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-foreground/70 tabular-nums">
                  {minNonZero > 0 ? formatLegendValue(minNonZero) : "—"}
                </span>
                {[0.12, 0.3, 0.55, 0.8, 1].map((a) => (
                  <div
                    key={a}
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: `hsl(var(--primary) / ${a})` }}
                  />
                ))}
                <span className="text-foreground/70 tabular-nums">
                  {maxValue > 0 ? formatLegendValue(maxValue) : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}