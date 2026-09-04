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

interface MonthlySpendingCardProps {
  dailyTotals: DailyTotal[];
  yearKey: string | null;
  convert: (amount: number) => number;
}

export function MonthlySpendingCard({ dailyTotals, yearKey, convert }: MonthlySpendingCardProps) {
  const { t, i18n } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const [metric, setMetric] = useState<Metric>("expense");
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(
          new Date(2024, i, 1),
        ),
      ),
    [i18n.language],
  );

  const { cells, maxValue, minNonZero, maxMonth, minMonth, avgActive } = useMemo(() => {
    if (!yearKey) {
      return {
        cells: [] as Array<{ month: number; label: string; value: number }>,
        maxValue: 0,
        minNonZero: 0,
        maxMonth: 0,
        minMonth: 0,
        avgActive: 0,
      };
    }

    const buckets = new Array(12).fill(0);
    for (const dt of dailyTotals) {
      const m = Number(dt.day.slice(5, 7));
      if (m < 1 || m > 12) continue;
      if (metric === "count") buckets[m - 1] += dt.txCount;
      else if (metric === "expense") buckets[m - 1] += convert(dt.expenses);
      else if (metric === "income") buckets[m - 1] += convert(dt.income);
    }

    const cells = buckets.map((value, i) => ({
      month: i + 1,
      label: monthLabels[i],
      value: Math.round(value * 100) / 100,
    }));
    const maxValue = Math.max(0, ...buckets);
    const nonZero = buckets.filter((v) => v > 0);
    const minNonZero = nonZero.length > 0 ? Math.min(...nonZero) : 0;
    const maxMonth = maxValue > 0 ? buckets.findIndex((v) => v === maxValue) + 1 : 0;
    const minMonth = minNonZero > 0 ? buckets.findIndex((v) => v === minNonZero) + 1 : 0;
    const avgActive = nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0;

    return { cells, maxValue, minNonZero, maxMonth, minMonth, avgActive };
  }, [dailyTotals, yearKey, metric, convert, monthLabels]);

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
      hint: maxMonth > 0 ? monthLabels[maxMonth - 1] : undefined,
    },
    {
      label: t("heatmap.stats.lowest", "Lowest"),
      value: minNonZero > 0 ? formatStat(minNonZero) : "—",
      hint: minMonth > 0 ? monthLabels[minMonth - 1] : undefined,
    },
    {
      label: t("monthlySpending.avgPerMonth", "Monthly average"),
      value: avgActive > 0 ? formatStat(avgActive, true) : "—",
      hint: undefined,
    },
  ];

  return (
    <div className="bg-card rounded-xl p-[20px_22px_16px] h-full shadow-section">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[15px] font-heading font-bold text-foreground">
          {t("monthlySpending.title", "Spending by month")}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 h-[26px] px-2 rounded-[7px] text-[11px] font-medium bg-[#F5F7F9] text-[#414750] hover:bg-muted/60 transition-colors">
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

      {!yearKey || cells.length === 0 ? (
        <EmptyState height="h-[160px]" icon={CalendarDays} message={t("transactions.noTransactions")} />
      ) : (
        <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto] gap-4 sm:gap-[20px]">
          <div className="grid grid-cols-4 gap-[6px]">
            {cells.map((cell) => {
              const intensity = getIntensity(cell.value);
              const hasValue = cell.value > 0;
              const textColor = getTextColor(intensity, hasValue);
              return (
                <button
                  key={cell.month}
                  type="button"
                  onMouseEnter={() => setHoveredMonth(cell.month)}
                  onMouseLeave={() => setHoveredMonth((m) => (m === cell.month ? null : m))}
                  onClick={() => setHoveredMonth((m) => (m === cell.month ? null : cell.month))}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-[8px] py-[10px] transition-transform hover:scale-[1.03]",
                    hasValue ? "font-medium" : "font-normal bg-[#F7F8FA]",
                    hoveredMonth === cell.month && "ring-2 ring-primary/60 ring-offset-1 ring-offset-card",
                  )}
                  style={{
                    backgroundColor: hasValue ? `rgba(27,118,255,${intensity})` : undefined,
                    color: textColor,
                  }}
                >
                  <span className="text-[10.5px] font-medium opacity-80 leading-none mb-[5px]">
                    {cell.label}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums leading-none">
                    {hasValue
                      ? isCount
                        ? String(Math.round(cell.value))
                        : formatCurrency(cell.value)
                      : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="flex flex-row sm:flex-col items-start sm:items-end gap-4 sm:gap-[18px] text-left sm:text-right sm:justify-end"
            style={{ minWidth: 96 }}
          >
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-[11px] text-[#9AA1AC]">{s.label}</div>
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
