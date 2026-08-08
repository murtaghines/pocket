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

export function DailyHeatmapCard({ transactions, monthKey, convert }: DailyHeatmapCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const [metric, setMetric] = useState<Metric>("expense");
  // Day the user is hovering (desktop) or tapped (mobile) — surfaces that date's exact value.
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

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

  // Contextual stats beside the calendar. The selected metric is already shown by the dropdown
  // above, so the titles stay single-word ("Highest" / "Lowest") rather than "Highest expense".
  const stats = [
    {
      label: t("heatmap.stats.highest", "Highest"),
      value: maxValue > 0 ? formatStat(maxValue) : "—",
      hint: maxDay > 0 ? t("heatmap.stats.day", { day: maxDay, defaultValue: "Day {{day}}" }) : undefined,
    },
    {
      label: t("heatmap.stats.lowest", "Lowest"),
      value: minNonZero > 0 ? formatStat(minNonZero) : "—",
      hint: minDay > 0 ? t("heatmap.stats.day", { day: minDay, defaultValue: "Day {{day}}" }) : undefined,
    },
    {
      label: t("heatmap.stats.avg", "Daily average"),
      value: avgActive > 0 ? formatStat(avgActive, true) : "—",
      hint: undefined,
    },
  ];

  const totalCells = leadingBlanks + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  const gridSize = totalCells + trailing;

  return (
    <div
      className="bg-card rounded-xl p-[18px_20px_16px] h-full"
      style={{ boxShadow: "0 1px 3px rgba(13,30,70,.06)" }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[13px] md:text-[14px] font-semibold uppercase tracking-[0.05em] text-foreground">
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
        <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center gap-4 sm:gap-x-6">
          {/* Calendar — cells flex to fill the column (capped) so it uses the available width */}
          <div className="flex w-full max-w-[400px] flex-col gap-2">
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_KEYS.map((k) => (
                <div key={k} className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(`heatmap.weekdays.${k}`, k.charAt(0).toUpperCase() + k.slice(1, 3))}
                </div>
              ))}
            </div>

            {/* Grid — square cells sized from the column width */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: gridSize }).map((_, i) => {
                const dayIndex = i - leadingBlanks;
                if (dayIndex < 0 || dayIndex >= daysInMonth) {
                  return <div key={i} className="aspect-square" />;
                }
                const cell = cells[dayIndex];
                const intensity = getIntensity(cell.value);
                const hasValue = cell.value > 0;
                return (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHoveredDay(cell.day)}
                    onMouseLeave={() => setHoveredDay((d) => (d === cell.day ? null : d))}
                    onClick={() => setHoveredDay((d) => (d === cell.day ? null : cell.day))}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-[7px] text-[11px] font-medium transition-transform hover:scale-105",
                      hasValue ? "text-white" : "text-muted-foreground/50 bg-muted/30",
                      hoveredDay === cell.day && "ring-2 ring-primary/60 ring-offset-1 ring-offset-card",
                    )}
                    style={{ backgroundColor: hasValue ? `hsl(var(--primary) / ${intensity})` : undefined }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Legend (Min → Max) + the hovered day's exact value on the right */}
            <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>{t("heatmap.min", "Min")}</span>
                {[0.12, 0.3, 0.55, 0.8, 1].map((a) => (
                  <div key={a} className="w-[10px] h-[10px] rounded-[3px]" style={{ backgroundColor: `hsl(var(--primary) / ${a})` }} />
                ))}
                <span>{t("heatmap.max", "Max")}</span>
              </div>
              <span className="min-h-[14px] truncate tabular-nums text-foreground/80">
                {hoveredDay !== null
                  ? `${t("heatmap.stats.day", { day: hoveredDay, defaultValue: "Day {{day}}" })} · ${
                      cells[hoveredDay - 1]?.value > 0 ? formatValue(cells[hoveredDay - 1].value) : "—"
                    }`
                  : ""}
              </span>
            </div>
          </div>

          {/* Contextual stats — pinned to the right, worded per selected metric.
              Labels are constrained so two-word titles stack (e.g. "HIGHEST" / "EXPENSE"). */}
          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-4 sm:gap-3.5 text-left sm:text-right sm:justify-self-end">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="ml-auto max-w-[76px] text-[10px] font-semibold uppercase leading-[1.15] tracking-[.04em] text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-1 text-[15px] md:text-[18px] font-semibold tabular-nums leading-none text-foreground">
                  {s.value}
                </div>
                {s.hint && <div className="mt-0.5 text-[10px] text-muted-foreground/80">{s.hint}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
