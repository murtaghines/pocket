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
import { BarChart3, ChevronDown } from "lucide-react";
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

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(
          new Date(2024, i, 1),
        ),
      ),
    [i18n.language],
  );

  const { bars, maxValue, minNonZero, maxMonth, minMonth, avgActive } = useMemo(() => {
    if (!yearKey) {
      return {
        bars: [] as Array<{ month: number; label: string; value: number }>,
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

    const bars = buckets.map((value, i) => ({
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

    return { bars, maxValue, minNonZero, maxMonth, minMonth, avgActive };
  }, [dailyTotals, yearKey, metric, convert, monthLabels]);

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

      {!yearKey || bars.length === 0 ? (
        <EmptyState height="h-[160px]" icon={BarChart3} message={t("transactions.noTransactions")} />
      ) : (
        <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto] gap-4 sm:gap-[20px]">
          <div className="flex flex-col gap-[6px]">
            {bars.map((bar) => {
              const ratio = maxValue > 0 ? bar.value / maxValue : 0;
              const hasValue = bar.value > 0;
              return (
                <div key={bar.month} className="flex items-center gap-[8px]">
                  <span className="text-[11px] font-medium text-[#9AA1AC] w-[28px] shrink-0 text-right">
                    {bar.label}
                  </span>
                  <div className="flex-1 h-[20px] rounded-[5px] bg-[#F7F8FA] overflow-hidden">
                    {hasValue && (
                      <div
                        className="h-full rounded-[5px] transition-all"
                        style={{
                          width: `${Math.max(ratio * 100, 4)}%`,
                          backgroundColor: `rgba(27,118,255,${0.25 + ratio * 0.55})`,
                        }}
                      />
                    )}
                  </div>
                </div>
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
