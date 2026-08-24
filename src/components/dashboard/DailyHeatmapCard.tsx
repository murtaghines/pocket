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
import type { DailyTotal } from "@/hooks/usePeriodAggregates";

type Metric = "expense" | "income" | "count";

interface DailyHeatmapCardProps {
  dailyTotals: DailyTotal[];
  monthKey: string | null;
  convert: (amount: number) => number;
}

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function DailyHeatmapCard({ dailyTotals, monthKey, convert }: DailyHeatmapCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const [metric, setMetric] = useState<Metric>("expense");
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
    for (const dt of dailyTotals) {
      if (!dt.day.startsWith(monthKey!)) continue;
      const dayNum = parseInt(dt.day.slice(8, 10), 10);
      if (dayNum < 1 || dayNum > days) continue;
      const idx = dayNum - 1;
      if (metric === "count") buckets[idx] += dt.txCount;
      else if (metric === "expense") buckets[idx] += convert(dt.expenses);
      else if (metric === "income") buckets[idx] += convert(dt.income);
    }

    const cells = buckets.map((value, i) => ({ day: i + 1, value }));
    const maxValue = Math.max(0, ...buckets);
    const nonZero = buckets.filter((v) => v > 0);
    const minNonZero = nonZero.length > 0 ? Math.min(...nonZero) : 0;
    const maxDay = maxValue > 0 ? buckets.findIndex((v) => v === maxValue) + 1 : 0;
    const minDay = minNonZero > 0 ? buckets.findIndex((v) => v === minNonZero) + 1 : 0;
    const avgActive = nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0;
    return { cells, maxValue, minNonZero, maxDay, minDay, avgActive, daysInMonth: days, leadingBlanks: firstWeekday };
  }, [dailyTotals, monthKey, metric, convert]);

  const getIntensity = (value: number) => {
    if (maxValue <= 0 || value <= 0) return 0;
    const ratio = Math.sqrt(value / maxValue);
    return Math.min(1, Math.max(0.1, ratio));
  };

  const getTextColor = (intensity: number, hasValue: boolean) => {
    if (!hasValue) return "#C2C7CE";
    if (intensity >= 0.8) return "#fff";
    if (intensity >= 0.4) return "#2E64B4";
    if (intensity >= 0.24) return "#4A81C9";
    return "#7C9BCB";
  };

  const isCount = metric === "count";
  const formatStat = (value: number, isAvg = false) =>
    isCount ? (isAvg ? value.toFixed(1) : String(Math.round(value))) : formatCurrency(value);

  const metricOptions: Array<{ key: Metric; label: string }> = [
    { key: "expense", label: t("heatmap.expense", "Expenses") },
    { key: "income", label: t("heatmap.income", "Income") },
    { key: "count", label: t("heatmap.count", "Activity") },
  ];
  const activeMetricLabel = metricOptions.find((o) => o.key === metric)?.label ?? "";

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
    <div className="bg-card rounded-xl p-[20px_22px_16px] h-full shadow-section">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[15px] font-heading font-bold text-foreground">
          {t("heatmap.title", "Daily view")}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center gap-1 h-[26px] px-2 rounded-[7px] text-[11px] font-medium bg-[#F5F7F9] text-[#414750] hover:bg-muted/60 transition-colors"
            >
              <span>{activeMetricLabel}</span>
              <ChevronDown className="w-3 h-3 text-[#8A919C]" />
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
        <EmptyState height="h-[160px]" icon={CalendarDays} message={t("transactions.noTransactions")} />
      ) : (
        <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto] gap-4 sm:gap-[20px]">
          <div className="flex w-full max-w-[280px] flex-col gap-2">
            <div className="grid grid-cols-7 gap-[6px]">
              {WEEKDAY_KEYS.map((k) => (
                <div key={k} className="text-center text-[10.5px] font-medium text-[#B4BAC3]">
                  {t(`heatmap.weekdays.${k}`, k.charAt(0).toUpperCase())}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-[6px]">
              {Array.from({ length: gridSize }).map((_, i) => {
                const dayIndex = i - leadingBlanks;
                if (dayIndex < 0 || dayIndex >= daysInMonth) {
                  return <div key={i} className="aspect-square" />;
                }
                const cell = cells[dayIndex];
                const intensity = getIntensity(cell.value);
                const hasValue = cell.value > 0;
                const textColor = getTextColor(intensity, hasValue);
                return (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHoveredDay(cell.day)}
                    onMouseLeave={() => setHoveredDay((d) => (d === cell.day ? null : d))}
                    onClick={() => setHoveredDay((d) => (d === cell.day ? null : cell.day))}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-[8px] text-[11px] transition-transform hover:scale-105",
                      hasValue ? "font-medium" : "font-normal bg-[#F7F8FA]",
                      hoveredDay === cell.day && "ring-2 ring-primary/60 ring-offset-1 ring-offset-card",
                    )}
                    style={{
                      backgroundColor: hasValue ? `rgba(27,118,255,${intensity})` : undefined,
                      color: textColor,
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-4 sm:gap-[18px] text-left sm:text-right sm:justify-end" style={{ minWidth: 96 }}>
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-[11px] text-[#9AA1AC]">
                  {s.label}
                </div>
                <div className="mt-1 text-[15px] font-semibold tabular-nums leading-none text-foreground">
                  {s.value}
                </div>
                {s.hint && <div className="mt-0.5 text-[11px] text-[#B4BAC3]">{s.hint}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
