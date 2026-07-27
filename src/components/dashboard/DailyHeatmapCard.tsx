import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
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
const CELL_SIZE = 30; // fixed px — height must not scale with column width
const CELL_GAP = 4;

export function DailyHeatmapCard({ transactions, monthKey, convert }: DailyHeatmapCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const [metric, setMetric] = useState<Metric>("expense");

  const { cells, maxValue, minNonZero, maxDay, minDay, avgActive, daysInMonth, leadingBlanks } = useMemo(() => {
    if (!monthKey) {
      return {
        cells: [] as Array<{ day: number; value: number }>,
        maxValue: 0, minNonZero: 0, maxDay: 0, minDay: 0, avgActive: 0,
        daysInMonth: 0, leadingBlanks: 0,
      };
    }
    const [y, m] = monthKey.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;

    const buckets = new Array(days).fill(0);
    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) continue;
      const idx = d.getDate() - 1;
      if (metric === "count") buckets[idx] += 1;
      else if (metric === "expense" && tx.type === "expense") buckets[idx] += convert(Math.abs(tx.amount));
      else if (metric === "income" && tx.type === "income") buckets[idx] += convert(Math.abs(tx.amount));
    }

    const cells = buckets.map((value, i) => ({ day: i + 1, value }));
    const maxValue = Math.max(0, ...buckets);
    const nonZero = buckets.filter((v) => v > 0);
    const minNonZero = nonZero.length > 0 ? Math.min(...nonZero) : 0;
    // Day-of-month for the peak / lowest active day (first occurrence), plus the active-day average —
    // these describe exactly what the heatmap colours, so the legend and the stats agree.
    const maxDay = maxValue > 0 ? buckets.findIndex((v) => v === maxValue) + 1 : 0;
    const minDay = minNonZero > 0 ? buckets.findIndex((v) => v === minNonZero) + 1 : 0;
    const avgActive = nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0;
    return { cells, maxValue, minNonZero, maxDay, minDay, avgActive, daysInMonth: days, leadingBlanks: firstWeekday };
  }, [transactions, monthKey, metric, convert]);

  const getIntensity = (value: number) => {
    if (maxValue <= 0 || value <= 0) return 0;
    const ratio = Math.sqrt(value / maxValue);
    return Math.min(1, Math.max(0.1, ratio));
  };

  const formatValue = (value: number) => {
    if (metric === "count") return `${value} ${value === 1 ? t("heatmap.transaction", "transaction") : t("heatmap.transactions", "transactions")}`;
    return formatCurrency(value);
  };

  const formatLegendValue = (value: number) => (metric === "count" ? `${value}` : formatCurrency(value));
  // Stat values: whole counts (avg to 1 decimal) for Activity, currency otherwise.
  const isCount = metric === "count";
  const formatStat = (value: number, isAvg = false) =>
    isCount ? (isAvg ? value.toFixed(1) : String(Math.round(value))) : formatCurrency(value);

  const metricOptions: Array<{ key: Metric; label: string }> = [
    { key: "expense", label: t("heatmap.expense", "Expenses") },
    { key: "income", label: t("heatmap.income", "Income") },
    { key: "count", label: t("heatmap.count", "Activity") },
  ];
  const activeMetricLabel = metricOptions.find((o) => o.key === metric)?.label ?? "";

  // Contextual stats beside the calendar, worded per selected metric.
  const highestFallback = isCount ? "Highest activity" : metric === "income" ? "Highest income" : "Highest expense";
  const lowestFallback = isCount ? "Lowest activity" : metric === "income" ? "Lowest income" : "Lowest expense";
  const stats = [
    {
      label: t(`heatmap.stats.highest.${metric}`, highestFallback),
      value: maxValue > 0 ? formatStat(maxValue) : "—",
      hint: maxDay > 0 ? t("heatmap.stats.day", { day: maxDay, defaultValue: "Day {{day}}" }) : undefined,
    },
    {
      label: t(`heatmap.stats.lowest.${metric}`, lowestFallback),
      value: minNonZero > 0 ? formatStat(minNonZero) : "—",
      hint: minDay > 0 ? t("heatmap.stats.day", { day: minDay, defaultValue: "Day {{day}}" }) : undefined,
    },
    {
      label: t("heatmap.stats.avg", "Avg / active day"),
      value: avgActive > 0 ? formatStat(avgActive, true) : "—",
      hint: undefined,
    },
  ];

  const totalCells = leadingBlanks + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  const gridSize = totalCells + trailing;

  return (
    <div
      className="bg-card rounded-2xl p-[18px_20px_16px] h-full"
      style={{ boxShadow: "0 1px 3px rgba(13,30,70,.06)" }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[15px] font-semibold text-foreground">
          {t("heatmap.title", "Daily view")}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center gap-1 h-[26px] px-2 rounded-[7px] text-[11px] font-medium",
                "border border-[rgba(13,30,70,.08)] bg-card text-foreground hover:bg-muted/40 transition-colors",
              )}
            >
              <span>{activeMetricLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[130px]">
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

      {!monthKey || daysInMonth === 0 ? (
        <EmptyState height="h-[200px]" icon={CalendarDays} message={t("transactions.noTransactions")} />
      ) : (
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 sm:gap-x-6">
          {/* Calendar */}
          <div className="flex flex-col gap-2">
            {/* Weekday header */}
            <div className="grid grid-cols-7" style={{ columnGap: CELL_GAP, width: gridSize > 0 ? `${(CELL_SIZE + CELL_GAP) * 7 - CELL_GAP}px` : undefined }}>
              {WEEKDAY_KEYS.map((k) => (
                <div key={k} className="text-center text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: CELL_SIZE }}>
                  {t(`heatmap.weekdays.${k}`, k.charAt(0).toUpperCase() + k.slice(1, 3))}
                </div>
              ))}
            </div>

            {/* Grid — fixed cell size so height never scales with column width */}
            <div className="grid grid-cols-7" style={{ gap: CELL_GAP }}>
              {Array.from({ length: gridSize }).map((_, i) => {
                const dayIndex = i - leadingBlanks;
                if (dayIndex < 0 || dayIndex >= daysInMonth) {
                  return <div key={i} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                }
                const cell = cells[dayIndex];
                const intensity = getIntensity(cell.value);
                const hasValue = cell.value > 0;
                return (
                  <div
                    key={i}
                    title={hasValue ? `${cell.day}: ${formatValue(cell.value)}` : `${cell.day}`}
                    className={cn(
                      "rounded-[7px] flex items-center justify-center text-[10.5px] font-medium transition-transform hover:scale-110 cursor-default",
                      hasValue ? "text-white" : "text-muted-foreground/50 bg-muted/30",
                    )}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: hasValue ? `hsl(var(--primary) / ${intensity})` : undefined,
                    }}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 self-end">
              <span className="tabular-nums">{minNonZero > 0 ? formatLegendValue(minNonZero) : "—"}</span>
              {[0.12, 0.3, 0.55, 0.8, 1].map((a) => (
                <div key={a} className="w-[10px] h-[10px] rounded-[3px]" style={{ backgroundColor: `hsl(var(--primary) / ${a})` }} />
              ))}
              <span className="tabular-nums">{maxValue > 0 ? formatLegendValue(maxValue) : "—"}</span>
            </div>
          </div>

          {/* Contextual stats — compact, pinned to the right, worded per selected metric.
              Sizes shrink on mobile so they sit beside the calendar instead of wrapping below. */}
          <div className="flex flex-col items-end gap-2.5 text-right justify-self-end min-w-0 sm:gap-3.5">
            {stats.map((s, i) => (
              <div key={i} className="min-w-0">
                <div className="text-[9.5px] font-medium uppercase leading-tight tracking-[.03em] text-muted-foreground sm:text-[10.5px]">
                  {s.label}
                </div>
                <div className="mt-0.5 text-[15px] font-semibold tabular-nums leading-none text-foreground sm:text-[18px]">
                  {s.value}
                </div>
                {s.hint && <div className="mt-0.5 text-[9.5px] text-muted-foreground/80 sm:text-[10.5px]">{s.hint}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
