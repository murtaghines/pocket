import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SavingsRateRing } from "./SavingsRateRing";

interface NetBalanceKpiCardProps {
  total: number;
  previousTotal?: number;
  income: number;
  expenses: number;
  monthKey: string | null;
  previousMonthKey?: string | null;
  previousPeriodLabel?: string;
  formatCurrency: (n: number) => string;
}

export function NetBalanceKpiCard({
  total,
  previousTotal,
  income,
  expenses,
  monthKey,
  previousMonthKey,
  previousPeriodLabel,
  formatCurrency,
}: NetBalanceKpiCardProps) {
  const { i18n, t } = useTranslation("dashboard");

  const change =
    previousTotal !== undefined && previousTotal !== 0
      ? Math.round(((total - previousTotal) / Math.abs(previousTotal)) * 100)
      : undefined;

  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;

  const deltaColor =
    change === undefined
      ? "text-muted-foreground"
      : isUp
        ? "text-success"
        : "text-destructive";

  const prevMonthLabel = useMemo(() => {
    if (previousPeriodLabel !== undefined) return previousPeriodLabel;
    const key = previousMonthKey || monthKey;
    if (!key || !key.includes("-")) return "last month";
    const [y, m] = key.split("-").map(Number);
    if (isNaN(y) || isNaN(m)) return "last month";
    const d = previousMonthKey ? new Date(y, m - 1, 1) : new Date(y, m - 2, 1);
    return new Intl.DateTimeFormat(i18n.language || "en", { month: "long" })
      .format(d)
      .toLowerCase();
  }, [monthKey, previousMonthKey, previousPeriodLabel, i18n.language]);

  return (
    <div className="flex h-full items-center gap-3 rounded-xl bg-card px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-[6px] mb-[10px]">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-primary" />
          <span className="text-[13px] font-medium text-primary">
            {t("stats.netBalance")}
          </span>
        </div>
        <div className="mt-auto">
          <div className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground">
            {formatCurrency(total)}
          </div>
          <div className="text-[12.5px] mt-[5px] text-muted-foreground truncate">
            {change !== undefined ? (
              <>
                <span className={cn("font-medium", deltaColor)}>
                  {isUp ? "+" : ""}{change}%
                </span>{" "}
                vs {prevMonthLabel}
              </>
            ) : (
              <span className="opacity-70">–</span>
            )}
          </div>
        </div>
      </div>
      <SavingsRateRing income={income} expenses={expenses} />
    </div>
  );
}
